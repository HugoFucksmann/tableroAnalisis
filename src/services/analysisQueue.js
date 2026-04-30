import { Chess } from 'chess.js';
import { stockfishService } from './stockfishService';
import { useGameStore } from '../store/useGameStore';
import { ChessMath } from '../utils/chessMath';
import { EvaluationEngine } from '../analysis/evaluationRules';
import { OpeningService, MAX_BOOK_PLY } from '../analysis/openingService';
import { backendService } from './backendService';

class AnalysisQueue {
    #abortController = null;
    isRunning = false;

    cancel() {
        this.isRunning = false;
        if (this.#abortController) {
            this.#abortController.abort();
            this.#abortController = null;
        }
        stockfishService.stop();
        if (backendService.isConnected) {
            backendService.cancel();
        }
    }

    async analyzeGame(history, currentIndex, callbacks = {}) {
        const { onMoveResult, onProgress, onStatus, onComplete, onOpeningDetected, gameId = Date.now(), lichessToken } = callbacks;

        const storeState = useGameStore.getState();
        const engineConfig = {
            ...storeState.engineConfig,
            lichessToken: storeState.lichessToken
        };

        const useRemote = engineConfig.engineMode === 'remote' && backendService.isConnected;

        if (useRemote) {
            this.cancel();
            if (!history || history.length === 0) return;

            this.#abortController = new AbortController();
            this.isRunning = true;
            onStatus?.(true);

            const removeHandler = backendService.addHandler((msg) => {
                switch (msg.type) {
                    case 'status': onStatus?.(msg.running); break;
                    case 'progress': onProgress?.(msg.pct, msg.label); break;
                    case 'move_result': onMoveResult?.(msg); break;
                    case 'opening_detected': onOpeningDetected?.(msg); break;
                    case 'complete':
                        onComplete?.(msg.accuracy);
                        this.isRunning = false;
                        onStatus?.(false);
                        removeHandler();
                        break;
                    case 'error':
                        console.error('[Backend] Game analysis error:', msg.message);
                        this.isRunning = false;
                        onStatus?.(false);
                        removeHandler();
                        break;
                }
            });

            this.#abortController.signal.addEventListener('abort', () => {
                backendService.cancel();
                removeHandler();
            });

            backendService.analyzeGame(history, currentIndex, gameId, engineConfig);
            return;
        }

        this.cancel();
        if (!history || history.length === 0) return;

        stockfishService.destroy();

        this.#abortController = new AbortController();
        const { signal } = this.#abortController;
        this.isRunning = true;

        onStatus?.(true);
        onProgress?.(0, 'Iniciando motores...');

        try {
            await stockfishService.init(engineConfig);
            if (signal.aborted) return;

            stockfishService.newGame();

            const positions = this.#buildPositions(history);
            const totalMoves = history.length;

            const evalResults = new Array(positions.length).fill(null);
            const bookStatus = new Array(totalMoves).fill(null);
            const completedMoves = new Set();
            const finalMoveData = new Array(totalMoves);
            let evaluatedCount = 0;

            const openingState = { done: false };

            const openingPromise = OpeningService.detectOpenings({
                positions, history, gameId, token: lichessToken, signal,
                onPlyResolved: (ply, isBook) => {
                    bookStatus[ply] = isBook;
                    this.#tryClassifyMove(ply, history, positions, evalResults, bookStatus, openingState, finalMoveData, completedMoves, onMoveResult);
                },
                onOpeningDetected
            });

            openingPromise.finally(() => {
                if (signal.aborted) return;
                openingState.done = true;
                for (let i = 0; i < totalMoves; i++) {
                    this.#tryClassifyMove(i, history, positions, evalResults, bookStatus, openingState, finalMoveData, completedMoves, onMoveResult);
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
                        lines: result.lines?.map(line => ({
                            ...line,
                            score: ChessMath.cpToVisualScore(line.score, line.mate ?? null, isBlackTurn),
                        })) ?? []
                    };

                    evaluatedCount++;

                    onMoveResult?.({
                        index: posIndex === 0 ? -1 : posIndex - 1,
                        score: evalResults[posIndex].score,
                        mate: evalResults[posIndex].mate,
                        bestMove: evalResults[posIndex].bestMove,
                        lines: evalResults[posIndex].lines
                    });

                    this.#tryClassifyMove(posIndex - 1, history, positions, evalResults, bookStatus, openingState, finalMoveData, completedMoves, onMoveResult);
                    this.#tryClassifyMove(posIndex, history, positions, evalResults, bookStatus, openingState, finalMoveData, completedMoves, onMoveResult);

                    const currentPct = Math.round((evaluatedCount / totalMoves) * 100);
                    onProgress?.(Math.min(99, currentPct), `Analizando (${currentPct}%)`);

                } catch (e) {
                    if (e.name === 'AbortError') break;

                    evalResults[posIndex] = { wp: 0.5, score: 0.0, bestMove: null, lines: null };
                    evaluatedCount++;
                    this.#tryClassifyMove(posIndex - 1, history, positions, evalResults, bookStatus, openingState, finalMoveData, completedMoves, onMoveResult);
                    this.#tryClassifyMove(posIndex, history, positions, evalResults, bookStatus, openingState, finalMoveData, completedMoves, onMoveResult);
                }
            }

            if (!signal.aborted) {
                await openingPromise.catch(() => { });
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

        const engineConfig = useGameStore.getState().engineConfig ?? {};
        const useRemote = engineConfig.engineMode === 'remote' && backendService.isConnected;

        if (useRemote) {
            this.cancel();
            onStatus?.(true);
            this.isRunning = true;

            const removeHandler = backendService.addHandler((msg) => {
                if (msg.type === 'position_progress' || msg.type === 'position_result') {
                    onResult?.(msg);
                }
                if (msg.type === 'error') {
                    console.error('[Backend] Error:', msg.message);
                    onStatus?.(false);
                    this.isRunning = false;
                }
            });

            this.#abortController = new AbortController();
            this.#abortController.signal.addEventListener('abort', () => {
                backendService.cancel();
                removeHandler();
            });

            console.log('Sending to backend:', { ...engineConfig, depth: engineConfig.liveDepth ?? engineConfig.depth ?? 18, multiPv: engineConfig.liveMultiPv ?? engineConfig.multiPv ?? 1 });
            backendService.analyzePosition(fen, moveIndex, {
                ...engineConfig,
                depth: engineConfig.liveDepth ?? engineConfig.depth ?? 18,
                multiPv: engineConfig.liveMultiPv ?? engineConfig.multiPv ?? 1
            });
            return;
        }

        this.cancel();

        this.#abortController = new AbortController();
        const { signal } = this.#abortController;
        this.isRunning = true;

        try {
            await stockfishService.init(engineConfig);
            if (signal.aborted) return;
            onStatus?.(true);

            const isBlackTurn = fen.includes(' b ');
            const depth = engineConfig.liveDepth ?? engineConfig.depth ?? 18;
            const multiPv = engineConfig.liveMultiPv ?? engineConfig.multiPv ?? 1;

            const result = await stockfishService.analyzePosition(
                fen, depth, signal,
                ({ score, mate, bestMove, lines }) => {
                    onResult?.({
                        score: ChessMath.cpToVisualScore(score, mate, isBlackTurn),
                        mate,
                        bestMove,
                        moveIndex,
                        lines: lines?.map(line => ({
                            ...line,
                            score: ChessMath.cpToVisualScore(line.score, line.mate ?? null, isBlackTurn),
                        })) ?? []
                    });
                },
                multiPv
            );

            if (result && !signal.aborted) {
                onResult?.({
                    score: ChessMath.cpToVisualScore(result.score, result.mate, isBlackTurn),
                    mate: result.mate,
                    bestMove: result.bestMove,
                    moveIndex,
                    lines: result.lines?.map(line => ({
                        ...line,
                        score: ChessMath.cpToVisualScore(line.score, line.mate ?? null, isBlackTurn),
                    })) ?? [],
                });
            }
        } catch (e) {
            if (e.name !== 'AbortError') console.warn('analyzeCurrentPosition fallback:', e);
        } finally {
            onStatus?.(false);
            this.isRunning = false;
        }
    }

    #tryClassifyMove(ply, history, positions, evalResults, bookStatus, openingState, finalMoveData, completedSet, onMoveResult) {
        if (ply < 0 || ply >= history.length || completedSet.has(ply)) return;

        const stateBefore = evalResults[ply];
        const stateAfter = evalResults[ply + 1];

        if (!stateBefore || !stateAfter) return;

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
            label,
            isBook
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