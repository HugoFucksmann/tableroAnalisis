import { Chess } from 'chess.js';
import { stockfishService, DEPTH_CURRENT, DEPTH_BACKGROUND, MULTIPV_COUNT } from './stockfishService';

const MAX_BOOK_PLY = 20;
const MIN_THEORY_GAMES = 20;
const LICHESS_DELAY_MS = 350;
const LICHESS_TIMEOUT_MS = 5000;
const MAX_CACHE_SIZE = 50;

const openingCache = new Map();

async function fetchWithTimeout(url, options = {}, timeoutMs) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    const onParentAbort = () => controller.abort();

    if (options.signal) options.signal.addEventListener('abort', onParentAbort);

    try {
        const res = await fetch(url, { ...options, signal: controller.signal });
        return res;
    } finally {
        clearTimeout(id);
        if (options.signal) options.signal.removeEventListener('abort', onParentAbort);
    }
}

const MathUtils = {
    cpToWhiteWinProb(cp, mate, isBlackTurn) {
        if (mate !== null) return (mate > 0) === !isBlackTurn ? 1.0 : 0.0;
        // Curva sigmoide exacta (estándar Lichess/Chess.com)
        const prob = 1 / (1 + Math.exp(-0.00368208 * cp));
        return isBlackTurn ? 1 - prob : prob;
    },

    cpToVisualScore(cp, mate, isBlackTurn) {
        if (mate !== null) {
            const sign = mate > 0 ? 1 : -1;
            return isBlackTurn ? -sign * 10 : sign * 10;
        }
        const normalized = Math.max(-10, Math.min(10, cp / 100));
        return isBlackTurn ? -normalized : normalized;
    }
};

const EvaluationEngine = {
    classifyMove(wpBefore, wpAfter, isWhiteMove, isEngineBestMove) {
        let rawWpLoss = isWhiteMove ? (wpBefore - wpAfter) : (wpAfter - wpBefore);

        if (isEngineBestMove && rawWpLoss <= -0.05) return 'Brillante';
        if (isEngineBestMove) return 'Mejor';

        let wpLoss = Math.max(0, rawWpLoss);

        // Umbrales basados en pérdida de Probabilidad de Victoria (Win Probability)
        if (wpLoss <= 0.02) return 'Excelente';
        if (wpLoss <= 0.05) return 'Bueno';
        if (wpLoss <= 0.10) return 'Imprecisión';
        if (wpLoss <= 0.20) return 'Error';

        // Cualquier pérdida dramática superior al 20% es un Error grave indiscutible
        return 'Error grave';
    },

    calculateAccuracy(moveData) {
        const calc = (moves) => {
            let sumLoss = 0;
            let count = 0;

            for (let i = 0; i < moves.length; i++) {
                if (moves[i] !== undefined) {
                    sumLoss += moves[i].wpLoss;
                    count++;
                }
            }
            if (count === 0) return 100;

            const avgLoss = (sumLoss / count) * 100;
            const acc = 103.1668 * Math.exp(-0.04354 * avgLoss) - 3.1669;
            return Math.max(0, Math.min(100, Math.round(acc)));
        };

        return {
            white: calc(moveData.filter(d => d?.isWhiteMove && !d?.isBook)),
            black: calc(moveData.filter(d => !d?.isWhiteMove && !d?.isBook)),
        };
    }
};

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
        const { onMoveResult, onProgress, onStatus, onComplete, onOpeningDetected, gameId = Date.now(), pgnHeaders, lichessToken } = callbacks;

        this.cancel();
        if (!history || history.length === 0) return;

        stockfishService.destroy();

        this.#abortController = new AbortController();
        const { signal } = this.#abortController;
        this.isRunning = true;

        onStatus?.(true);
        onProgress?.(0, 'Iniciando motores...');

        try {
            await stockfishService.init();
            if (signal.aborted) return;

            const positions = this.#buildPositions(history);
            const totalMoves = history.length;

            const evalResults = new Array(positions.length).fill(null);
            const bookStatus = new Array(totalMoves).fill(null);
            const completedMoves = new Set();
            const finalMoveData = new Array(totalMoves);

            let openingDone = false;

            this.#detectOpeningsParallel(
                positions, history, gameId, pgnHeaders, lichessToken, signal,
                (ply, isBook) => {
                    bookStatus[ply] = isBook;
                    this.#tryResolveMove(ply, history, positions, evalResults, bookStatus, openingDone, finalMoveData, completedMoves, onMoveResult, currentIndex);
                },
                onOpeningDetected
            ).finally(() => {
                openingDone = true;
                for (let i = 0; i < totalMoves; i++) {
                    this.#tryResolveMove(i, history, positions, evalResults, bookStatus, openingDone, finalMoveData, completedMoves, onMoveResult, currentIndex);
                }
            });

            const analysisOrder = this.#buildSmartAnalysisOrder(positions.length, currentIndex);

            for (const posIndex of analysisOrder) {
                if (signal.aborted) break;

                const fen = positions[posIndex];
                const isBlackTurn = fen.includes(' b ');
                const isHighPriority = (posIndex === currentIndex || posIndex === currentIndex + 1);

                const depth = isHighPriority ? DEPTH_CURRENT : DEPTH_BACKGROUND;
                const mPv = isHighPriority ? MULTIPV_COUNT : 1;

                try {
                    const result = await stockfishService.analyzePosition(fen, depth, signal, null, mPv);
                    if (signal.aborted) break;

                    evalResults[posIndex] = {
                        wp: MathUtils.cpToWhiteWinProb(result.score, result.mate, isBlackTurn),
                        score: MathUtils.cpToVisualScore(result.score, result.mate, isBlackTurn),
                        bestMove: result.bestMove,
                        lines: result.lines
                    };

                    if (posIndex === 0) onMoveResult?.({ index: -1, bestMove: result.bestMove, lines: result.lines });

                    this.#tryResolveMove(posIndex - 1, history, positions, evalResults, bookStatus, openingDone, finalMoveData, completedMoves, onMoveResult, currentIndex);
                    this.#tryResolveMove(posIndex, history, positions, evalResults, bookStatus, openingDone, finalMoveData, completedMoves, onMoveResult, currentIndex);

                    const currentPct = Math.round((completedMoves.size / totalMoves) * 100);
                    onProgress?.(Math.min(99, currentPct), `Analizando (${currentPct}%)`);

                } catch (e) {
                    if (e.name === 'AbortError') break;

                    evalResults[posIndex] = { wp: 0.5, score: 0.0, bestMove: null, lines: null };
                    this.#tryResolveMove(posIndex - 1, history, positions, evalResults, bookStatus, openingDone, finalMoveData, completedMoves, onMoveResult, currentIndex);
                    this.#tryResolveMove(posIndex, history, positions, evalResults, bookStatus, openingDone, finalMoveData, completedMoves, onMoveResult, currentIndex);
                }
            }

            if (!signal.aborted) {
                onComplete?.(EvaluationEngine.calculateAccuracy(finalMoveData));
                onProgress?.(100, 'Análisis completado');
            }

        } finally {
            onStatus?.(false);
            this.isRunning = false;
        }
    }

    async analyzeCurrentPosition(fen, moveIndex, callbacks = {}) {
        const { onResult, onStatus } = callbacks;

        this.cancel();

        this.#abortController = new AbortController();
        const { signal } = this.#abortController;
        this.isRunning = true;

        try {
            await stockfishService.init();
            if (signal.aborted) return;
            onStatus?.(true);

            const isBlackTurn = fen.includes(' b ');

            const result = await stockfishService.analyzePosition(
                fen, DEPTH_CURRENT, signal,
                ({ score, mate, bestMove }) => {
                    onResult?.({
                        score: MathUtils.cpToVisualScore(score, mate, isBlackTurn),
                        bestMove, moveIndex,
                    });
                }
            );

            if (result && !signal.aborted) {
                onResult?.({
                    score: MathUtils.cpToVisualScore(result.score, result.mate, isBlackTurn),
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

    #tryResolveMove(ply, history, positions, evalResults, bookStatus, openingDone, finalMoveData, completedSet, onMoveResult, focusIdx) {
        if (ply < 0 || ply >= history.length || completedSet.has(ply)) return;

        const stateBefore = evalResults[ply];
        const stateAfter = evalResults[ply + 1];

        if (!stateBefore || !stateAfter) return;

        const isOpeningResolved = bookStatus[ply] !== null || openingDone || ply >= MAX_BOOK_PLY;
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
            label,
            isBook,
            bestMove: stateBefore.bestMove,
            lines: ply === focusIdx ? stateBefore.lines : null,
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

    async #detectOpeningsParallel(positions, history, gameId, headers, token, signal, onPlyResolved, onOpeningDetected) {
        if (openingCache.has(gameId)) {
            const cache = openingCache.get(gameId);
            for (let i = 0; i < history.length; i++) onPlyResolved(i, cache.bookPlies.has(i));
            onOpeningDetected?.({
                openingName: cache.openingName,
                ecoCode: cache.ecoCode,
                openingPly: cache.openingPly,
                bookPlies: cache.bookPlies
            });
            return;
        }

        const maxPly = Math.min(history.length, MAX_BOOK_PLY);
        const bookPlies = new Set();
        let inTheory = true;
        let finalOpeningName = '';
        let finalEcoCode = '';
        let lastTheoryPly = -1;

        for (let ply = 0; ply < maxPly; ply++) {
            if (signal?.aborted) break;

            if (!inTheory) {
                for (let i = ply; i < maxPly; i++) onPlyResolved(i, false);
                break;
            }

            let plyRetries = 1;
            let success = false;

            while (plyRetries >= 0 && !success && !signal?.aborted) {
                try {
                    const fen = positions[ply].split(' ').slice(0, 4).join(' ');
                    const url = `https://explorer.lichess.ovh/lichess?fen=${encodeURIComponent(fen)}&ratings=2200,2500`;
                    const headersOpt = token ? { Authorization: `Bearer ${token}` } : {};

                    const res = await fetchWithTimeout(url, { headers: headersOpt, signal }, LICHESS_TIMEOUT_MS);

                    if (res.status === 429) {
                        if (plyRetries > 0) {
                            plyRetries--;
                            await new Promise(r => setTimeout(r, 2000));
                            continue;
                        } else {
                            throw new Error('Rate limit exceeded');
                        }
                    }

                    if (!res.ok) throw new Error(`HTTP ${res.status}`);

                    const data = await res.json();

                    if (data.opening) {
                        finalOpeningName = data.opening.name;
                        finalEcoCode = data.opening.eco;
                    }

                    const explorerIdx = data.moves.findIndex(m => m.uci === history[ply].lan);

                    if (explorerIdx > -1 && explorerIdx <= 3) {
                        const m = data.moves[explorerIdx];
                        const games = (m.white || 0) + (m.draws || 0) + (m.black || 0);

                        if (games >= MIN_THEORY_GAMES) {
                            bookPlies.add(ply);
                            lastTheoryPly = ply;
                            onPlyResolved(ply, true);
                        } else {
                            inTheory = false;
                            onPlyResolved(ply, false);
                        }
                    } else {
                        inTheory = false;
                        onPlyResolved(ply, false);
                    }

                    success = true;

                    if (inTheory && ply < maxPly - 1) {
                        await new Promise(r => setTimeout(r, LICHESS_DELAY_MS));
                    }

                } catch (err) {
                    if (err.name === 'AbortError') break;
                    inTheory = false;
                    for (let i = ply; i < maxPly; i++) onPlyResolved(i, false);
                    break;
                }
            }
        }

        if (!signal?.aborted) {
            if (openingCache.size >= MAX_CACHE_SIZE) {
                openingCache.delete(openingCache.keys().next().value);
            }
            openingCache.set(gameId, {
                bookPlies,
                openingName: finalOpeningName,
                ecoCode: finalEcoCode,
                openingPly: lastTheoryPly
            });

            onOpeningDetected?.({
                openingName: finalOpeningName,
                ecoCode: finalEcoCode,
                openingPly: lastTheoryPly,
                bookPlies
            });
        }
    }

    clearOpeningCache(gameId) {
        if (gameId) openingCache.delete(gameId);
    }
}

export const analysisQueue = new AnalysisQueue();