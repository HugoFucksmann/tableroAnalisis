import { Chess } from 'chess.js';
import { stockfishService } from './stockfishService';
import { useGameStore } from '../store/useGameStore';

import { ChessMath } from '../utils/chessMath';
import { EvaluationEngine } from '../analysis/evaluationRules';
import { OpeningService, MAX_BOOK_PLY } from '../analysis/openingService';

class AnalysisQueue {
    #abortController = null;
    isRunning = false;

    cancel() {
        if (this.#abortController) {
            this.#abortController.abort();
            this.#abortController = null;
        }
        stockfishService.stop();
        this.isRunning = false;
    }

    async analyzeGame(history, currentIndex, callbacks = {}) {
        const { onMoveResult, onProgress, onStatus, onComplete, onOpeningDetected, gameId = Date.now(), lichessToken } = callbacks;

        this.cancel();
        if (!history || history.length === 0) return;

        const engineConfig = useGameStore.getState().engineConfig ?? {};

        stockfishService.destroy();

        this.#abortController = new AbortController();
        const { signal } = this.#abortController;
        this.isRunning = true;

        onStatus?.(true);
        onProgress?.(0, 'Iniciando motores...');

        try {
            await stockfishService.init(engineConfig);
            if (signal.aborted) return;

            const positions = this.#buildPositions(history);
            const totalMoves = history.length;

            const evalResults = new Array(positions.length).fill(null);
            const bookStatus = new Array(totalMoves).fill(null);
            const completedMoves = new Set();
            const finalMoveData = new Array(totalMoves);

            // [FIX] openingDone era una variable local capturada por el closure del .finally().
            // El problema: el .finally() se ejecuta cuando la Promise de detectOpenings resuelve,
            // pero en ese punto el loop de Stockfish puede estar en cualquier posición.
            // Si el engine ya resolvió posiciones que el opening no confirmó todavía,
            // esos movimientos quedaban bloqueados en #tryResolveMove por `isOpeningResolved`.
            // Solución: usar un objeto mutable { value } que el closure captura por referencia.
            const openingState = { done: false };

            const openingPromise = OpeningService.detectOpenings({
                positions, history, gameId, token: lichessToken, signal,
                onPlyResolved: (ply, isBook) => {
                    bookStatus[ply] = isBook;
                    this.#tryResolveMove(ply, history, positions, evalResults, bookStatus, openingState, finalMoveData, completedMoves, onMoveResult, currentIndex);
                },
                onOpeningDetected
            });

            // [FIX] Corremos el opening en paralelo con Stockfish pero mantenemos
            // una referencia a la Promise para poder awaitearlo si el engine termina primero.
            openingPromise.finally(() => {
                openingState.done = true;
                // Resolver todos los plies pendientes ahora que sabemos el estado de libro
                for (let i = 0; i < totalMoves; i++) {
                    this.#tryResolveMove(i, history, positions, evalResults, bookStatus, openingState, finalMoveData, completedMoves, onMoveResult, currentIndex);
                }
            });

            const analysisOrder = this.#buildSmartAnalysisOrder(positions.length, currentIndex);

            for (const posIndex of analysisOrder) {
                if (signal.aborted) break;

                const fen = positions[posIndex];
                const isBlackTurn = fen.includes(' b ');
                const isHighPriority = (posIndex === currentIndex || posIndex === currentIndex + 1);

                const depth = isHighPriority ? engineConfig.depth : Math.max(10, engineConfig.depth - 3);
                const mPv = engineConfig.multiPv || 1;

                try {
                    const result = await stockfishService.analyzePosition(fen, depth, signal, null, mPv);
                    if (signal.aborted) break;

                    evalResults[posIndex] = {
                        wp: ChessMath.cpToWhiteWinProb(result.score, result.mate, isBlackTurn),
                        score: ChessMath.cpToVisualScore(result.score, result.mate, isBlackTurn),
                        mate: result.mate,
                        bestMove: result.bestMove,
                        lines: result.lines
                    };

                    if (posIndex === 0) onMoveResult?.({ index: -1, bestMove: result.bestMove, lines: result.lines });

                    this.#tryResolveMove(posIndex - 1, history, positions, evalResults, bookStatus, openingState, finalMoveData, completedMoves, onMoveResult, currentIndex);
                    this.#tryResolveMove(posIndex, history, positions, evalResults, bookStatus, openingState, finalMoveData, completedMoves, onMoveResult, currentIndex);

                    const currentPct = Math.round((completedMoves.size / totalMoves) * 100);
                    onProgress?.(Math.min(99, currentPct), `Analizando (${currentPct}%)`);

                } catch (e) {
                    if (e.name === 'AbortError') break;

                    evalResults[posIndex] = { wp: 0.5, score: 0.0, bestMove: null, lines: null };
                    this.#tryResolveMove(posIndex - 1, history, positions, evalResults, bookStatus, openingState, finalMoveData, completedMoves, onMoveResult, currentIndex);
                    this.#tryResolveMove(posIndex, history, positions, evalResults, bookStatus, openingState, finalMoveData, completedMoves, onMoveResult, currentIndex);
                }
            }

            // [FIX] Si el engine terminó antes que el opening service, esperamos
            // que el opening termine para no cortar el análisis prematuramente.
            if (!signal.aborted) {
                await openingPromise.catch(() => { }); // el error ya se maneja internamente
            }

            if (!signal.aborted) {
                onComplete?.(EvaluationEngine.calculateAccuracy(finalMoveData));
                onProgress?.(100, 'Análisis completado');
            }

        } finally {
            onStatus?.(false);
            this.isRunning = false;
            stockfishService.destroy();
        }
    }

    async analyzeCurrentPosition(fen, moveIndex, callbacks = {}) {
        const { onResult, onStatus } = callbacks;

        this.cancel();

        this.#abortController = new AbortController();
        const { signal } = this.#abortController;
        this.isRunning = true;

        const engineConfig = useGameStore.getState().engineConfig ?? {};

        try {
            await stockfishService.init(engineConfig);
            if (signal.aborted) return;
            onStatus?.(true);

            const isBlackTurn = fen.includes(' b ');
            const depth = engineConfig.liveDepth ?? engineConfig.depth ?? 18;
            const multiPv = engineConfig.liveMultiPv ?? engineConfig.multiPv ?? 1;

            const result = await stockfishService.analyzePosition(
                fen, depth, signal,
                ({ score, mate, bestMove }) => {
                    onResult?.({
                        score: ChessMath.cpToVisualScore(score, mate, isBlackTurn),
                        mate,
                        bestMove, moveIndex,
                    });
                },
                multiPv
            );

            if (result && !signal.aborted) {
                onResult?.({
                    score: ChessMath.cpToVisualScore(result.score, result.mate, isBlackTurn),
                    mate: result.mate,
                    bestMove: result.bestMove, moveIndex, lines: result.lines,
                });
            }
        } catch (e) {
            if (e.name !== 'AbortError') console.warn('analyzeCurrentPosition fallback:', e);
        } finally {
            if (!signal.aborted) {
                onStatus?.(false);
                this.isRunning = false;
            }
        }
    }

    // [FIX] openingDone ahora es openingState: { done: boolean } — objeto mutable
    // para que el closure del .finally() y este método lean el mismo valor.
    #tryResolveMove(ply, history, positions, evalResults, bookStatus, openingState, finalMoveData, completedSet, onMoveResult, focusIdx) {
        if (ply < 0 || ply >= history.length || completedSet.has(ply)) return;

        const stateBefore = evalResults[ply];
        const stateAfter = evalResults[ply + 1];

        if (!stateBefore || !stateAfter) return;

        // Un ply está resuelto de apertura si:
        // 1. Ya tiene un bookStatus asignado (true o false), O
        // 2. El opening service terminó (openingState.done), O
        // 3. El ply está fuera del rango de libro
        const isOpeningResolved = bookStatus[ply] !== null || openingState.done || ply >= MAX_BOOK_PLY;
        if (!isOpeningResolved) return;

        const isWhiteMove = !positions[ply].includes(' b ');
        const movePlayed = history[ply];
        const isEngineBestMove = stateBefore.bestMove === movePlayed.lan;
        const isBook = bookStatus[ply] === true;

        const label = isBook ? 'Libro' : EvaluationEngine.classifyMove(
            stateBefore.wp, stateAfter.wp, isWhiteMove, isEngineBestMove
        );

        onMoveResult?.({
            index: ply,
            score: stateAfter.score,
            mate: stateAfter.mate,
            label,
            isBook,
            bestMove: stateAfter.bestMove,
            lines: stateAfter.lines,
        });

        let wpLoss = isWhiteMove ? (stateBefore.wp - stateAfter.wp) : (stateAfter.wp - stateBefore.wp);
        if (isEngineBestMove || wpLoss < 0) wpLoss = 0;

        finalMoveData[ply] = { isWhiteMove, wpLoss, isBook };
        completedSet.add(ply);
    }

    #buildSmartAnalysisOrder(totalPositions, currentIndex) {
        const order = [];
        const seen = new Set();
        const add = (idx) => {
            if (idx >= 0 && idx < totalPositions && !seen.has(idx)) { order.push(idx); seen.add(idx); }
        };

        if (currentIndex >= 0 && currentIndex < totalPositions - 1) {
            add(currentIndex); add(currentIndex + 1);
        }
        if (currentIndex > 0) add(currentIndex - 1);

        for (let i = 0; i < totalPositions; i++) add(i);
        return order;
    }

    #buildPositions(history) {
        const positions = [];
        const game = new Chess();
        positions.push(game.fen());
        for (const m of history) { game.move(m); positions.push(game.fen()); }
        return positions;
    }

    clearOpeningCache(gameId) {
        OpeningService.clearCache(gameId);
    }
}

export const analysisQueue = new AnalysisQueue();