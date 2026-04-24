/**
 * AnalysisQueue — Orchestrates per-move Stockfish analysis for a full game.
 *
 * Chess.com alignment (2024):
 *  - WP is computed in White's absolute frame (no turn-based inversion).
 *  - Move quality is classified by centipawn loss via EvaluationEngine.classifyMove.
 *  - Accuracy uses Chess.com's formula with avgWpLoss (win-% loss, 0–100),
 *    NOT centipawns. cpLoss is only used internally for move classification.
 *  - secondBestWpLoss is derived from multiPV Stockfish lines (only-move detection).
 *  - isSacrifice is detected by comparing non-pawn material at ply vs ply+2.
 *  - isEquivalentBestMove: if played move = PV2 and gap with PV1 ≤ 5 cp,
 *    forced to 'Excelente' and cpLoss=0 (equally good alternative).
 *  - Book moves (via OpeningService) are excluded from accuracy calculation.
 */

import { Chess } from 'chess.js';
import { stockfishService } from './stockfishService';
import { useGameStore } from '../store/useGameStore';

import { ChessMath, PIECE_VALUES } from '../utils/chessMath';
import { EvaluationEngine } from '../analysis/evaluationRules';
import { OpeningService, MAX_BOOK_PLY } from '../analysis/openingService';

class AnalysisQueue {
    #abortController = null;
    isRunning = false;

    // ----------------------------------------------------------------
    // Public API
    // ----------------------------------------------------------------

    cancel() {
        if (this.#abortController) {
            this.#abortController.abort();
            this.#abortController = null;
        }
        stockfishService.stop();
        this.isRunning = false;
    }

    /**
     * Full-game analysis.
     *
     * @param {Array}  history       – chess.js move objects
     * @param {number} currentIndex  – currently viewed ply (for priority ordering)
     * @param {Object} callbacks
     */
    async analyzeGame(history, currentIndex, callbacks = {}) {
        const {
            onMoveResult,
            onProgress,
            onStatus,
            onComplete,
            onOpeningDetected,
            gameId = Date.now(),
            lichessToken,
            pgnHeaders = {}, // EXTRACT PGN HEADERS HERE
        } = callbacks;

        this.cancel();
        if (!history || history.length === 0) return;

        const state = useGameStore.getState();
        const engineConfig = state.engineConfig ?? {};

        // Resolving player ELOs removed: Accuracy is now calculated objectively without relative scaling.

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

            let openingDone = false;

            OpeningService.detectOpenings({
                positions, history, gameId, token: lichessToken, signal,
                onPlyResolved: (ply, isBook) => {
                    bookStatus[ply] = isBook;
                    this.#tryResolveMove(
                        ply, history, positions,
                        evalResults, bookStatus, openingDone,
                        finalMoveData, completedMoves, onMoveResult, currentIndex
                    );
                },
                onOpeningDetected,
            }).finally(() => {
                openingDone = true;
                for (let i = 0; i < totalMoves; i++) {
                    this.#tryResolveMove(
                        i, history, positions,
                        evalResults, bookStatus, openingDone,
                        finalMoveData, completedMoves, onMoveResult, currentIndex
                    );
                }
            });

            const analysisOrder = this.#buildSmartAnalysisOrder(positions.length, currentIndex);

            for (const posIndex of analysisOrder) {
                if (signal.aborted) break;

                const fen = positions[posIndex];
                const isHighPriority = posIndex === currentIndex || posIndex === currentIndex + 1;

                const depth = isHighPriority
                    ? engineConfig.depth
                    : Math.max(10, engineConfig.depth - 3);

                // Always request at least 2 PV lines so we can compute secondBestWpLoss
                const mPv = Math.max(2, engineConfig.multiPv || 2);

                try {
                    const result = await stockfishService.analyzePosition(fen, depth, signal, null, mPv);
                    if (signal.aborted) break;

                    evalResults[posIndex] = {
                        wp: ChessMath.cpToWhiteWinProb(result.score, result.mate),
                        score: ChessMath.cpToVisualScore(result.score, result.mate),
                        bestMove: result.bestMove,
                        lines: result.lines,
                    };

                    if (posIndex === 0) {
                        onMoveResult?.({ index: -1, bestMove: result.bestMove, lines: result.lines });
                    }

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
            stockfishService.destroy();
        }
    }

    /**
     * Single-position live analysis (used while stepping through moves).
     */
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

            const depth = engineConfig.depth ?? 18;

            const result = await stockfishService.analyzePosition(
                fen, depth, signal,
                ({ score, mate, bestMove }) => {
                    onResult?.({
                        score: ChessMath.cpToVisualScore(score, mate),
                        bestMove, moveIndex,
                    });
                },
                engineConfig.multiPv || 1
            );

            if (result && !signal.aborted) {
                onResult?.({
                    score: ChessMath.cpToVisualScore(result.score, result.mate),
                    bestMove: result.bestMove,
                    moveIndex,
                    lines: result.lines,
                    wp: ChessMath.cpToWhiteWinProb(result.score, result.mate),
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

    clearOpeningCache(gameId) {
        OpeningService.clearCache(gameId);
    }

    // ----------------------------------------------------------------
    // Private: move resolution
    // ----------------------------------------------------------------

    /**
     * Attempt to finalise and emit a single ply once all data is ready.
     *
     * Requires both evalResults[ply] and evalResults[ply+1] to be populated,
     * and the book status for this ply to be resolved.
     *
     * Computes secondBestWpLoss (only-move detection) and isSacrifice, then
     * delegates classification to EvaluationEngine.classifyMove.
     */
    #tryResolveMove(
        ply, history, positions,
        evalResults, bookStatus, openingDone,
        finalMoveData, completedSet, onMoveResult, focusIdx
    ) {
        if (ply < 0 || ply >= history.length || completedSet.has(ply)) return;

        const stateBefore = evalResults[ply];
        const stateAfter = evalResults[ply + 1];
        if (!stateBefore || !stateAfter) return;

        const isOpeningResolved = bookStatus[ply] !== null || openingDone || ply >= MAX_BOOK_PLY;
        if (!isOpeningResolved) return;

        const isWhiteMove = !positions[ply].includes(' b ');
        const movePlayed = history[ply];

        // Normalise LAN: chess.js may format promotion as "e7e8=q" while
        // Stockfish always uses "e7e8q". Strip "=" to avoid false negatives.
        const cleanLan = (movePlayed.lan ?? '').replace('=', '');
        const isEngineBestMove = !!cleanLan && stateBefore.bestMove === cleanLan;
        const isBook = bookStatus[ply] === true;

        // secondBestWpLoss: WP gap between PV1 and PV2 → only-move detection.
        const secondBestWpLoss = this.#calcSecondBestWpLoss(
            stateBefore.lines, isWhiteMove
        );

        // isSacrifice: only check when the played move is the engine's best,
        // since non-best sacrifices are already classified as errors.
        const isSacrifice = isEngineBestMove
            ? this.#detectSacrifice(positions, ply, isWhiteMove)
            : false;

        // isEquivalentBestMove: played move matches PV2 and gap with PV1 is ≤ 5 cp.
        // These are equally good alternatives that should not be penalised.
        const pv1Score = stateBefore.lines?.[0]?.score ?? null;
        const pv2Score = stateBefore.lines?.[1]?.score ?? null;
        const pv2Move  = (stateBefore.lines?.[1]?.move ?? '').replace('=', '');

        const isEquivalentBestMove =
            !isEngineBestMove &&
            !!pv2Move &&
            cleanLan === pv2Move &&
            pv1Score !== null &&
            pv2Score !== null &&
            Math.abs(pv1Score - pv2Score) <= 5;

        const label = isBook
            ? 'Libro'
            : isEquivalentBestMove
                ? 'Excelente'   // equally good move — no special icon, but no penalty
                : EvaluationEngine.classifyMove(
                    stateBefore.wp,
                    stateAfter.wp,
                    isWhiteMove,
                    isEngineBestMove,
                    secondBestWpLoss,
                    isSacrifice
                );

        onMoveResult?.({
            index: ply,
            score: stateAfter.score,
            label,
            isBook,
            bestMove: stateAfter.bestMove,
            lines: stateAfter.lines,
        });

        // Chess.com's accuracy formula uses WIN-PROBABILITY LOSS (0–100 scale),
        // not centipawns. wpLoss = 0 when the move is engine best, an equivalent
        // alternative (≤ 5 cp gap with PV1), or a book move.
        const wpLoss = (isEngineBestMove || isEquivalentBestMove || isBook)
            ? 0
            : ChessMath.wpLoss(stateBefore.wp, stateAfter.wp, isWhiteMove);

        finalMoveData[ply] = { isWhiteMove, wpLoss, isBook };
        completedSet.add(ply);
    }

    // ----------------------------------------------------------------
    // Private: sacrifice detection
    // ----------------------------------------------------------------

    #detectSacrifice(positions, ply, isWhiteMove) {
        // --- 1. Accepted sacrifice: the opponent captured on ply+2 ---
        let acceptedSacrifice = false;

        if (ply + 2 < positions.length) {
            // Compute net non-pawn material advantage for the moving side
            // by scanning the FEN placement string — no Chess() instantiation.
            const getNetAdvantage = (fen) => {
                let advantage = 0;
                for (const ch of fen.split(' ')[0]) {
                    const isWhitePiece = ch === ch.toUpperCase();
                    const val = PIECE_VALUES[ch.toLowerCase()];
                    // Exclude pawns (key = 'p') from sacrifice detection
                    if (val && ch.toLowerCase() !== 'p') {
                        advantage += isWhitePiece ? val : -val;
                    }
                }
                return isWhiteMove ? advantage : -advantage;
            };

            const advBefore = getNetAdvantage(positions[ply]);
            const advAfter = getNetAdvantage(positions[ply + 2]);
            acceptedSacrifice = (advBefore - advAfter) >= 200;
        }

        // --- 2. Offered (declined) sacrifice: en-prise piece at ply+1 ---
        // Only run if not already confirmed — avoids an unnecessary Chess() build.
        if (acceptedSacrifice) return true;

        if (ply + 1 < positions.length) {
            const tempChess = new Chess(positions[ply + 1]);
            const legalMoves = tempChess.moves({ verbose: true });

            for (const m of legalMoves) {
                // Only consider captures of pieces worth ≥ 300 cp (minor piece or better)
                if (!m.captured || (PIECE_VALUES[m.captured] ?? 0) < 300) continue;

                const valCaptured = PIECE_VALUES[m.captured];
                const valAttacker = PIECE_VALUES[m.piece] ?? 100; // default: pawn

                tempChess.move(m);
                const isDefended = tempChess.moves({ verbose: true }).some(r => r.to === m.to);
                tempChess.undo();

                // Sacrifice if the piece is undefended, OR if the material gain
                // for the opponent is ≥ 200 cp (e.g. pawn captures a defended minor).
                if (!isDefended || (valCaptured - valAttacker >= 200)) {
                    return true;
                }
            }
        }

        return false;
    }


    // ----------------------------------------------------------------
    // Private: only-move (secondBestWpLoss) computation
    // ----------------------------------------------------------------

    /**
     * Given Stockfish's multiPV lines, compute the WP gap between PV1 and PV2
     * from the moving player's perspective.
     *
     * Both lines are evaluated in White's absolute WP frame, then oriented
     * to the moving side before computing the gap.
     *
     * @param {Array|null} lines       – multiPV lines from Stockfish result
     * @param {boolean}    isWhiteMove
     * @returns {number} WP gap in [0, 1]; 0 if < 2 lines available
     */
    #calcSecondBestWpLoss(lines, isWhiteMove) {
        if (!lines || lines.length < 2) return 0;

        // cpToWhiteWinProb is now purely absolute — no isBlackTurn needed.
        const toWp = (line) =>
            ChessMath.cpToWhiteWinProb(line.score ?? 0, line.mate ?? null);

        const wp1 = toWp(lines[0]);
        const wp2 = toWp(lines[1]);

        // Orient to the moving player's perspective before computing the gap.
        const best = isWhiteMove ? wp1 : (1 - wp1);
        const secondBest = isWhiteMove ? wp2 : (1 - wp2);

        return Math.max(0, best - secondBest);
    }

    // ----------------------------------------------------------------
    // Private: position builder
    // ----------------------------------------------------------------

    /**
     * Build the FEN string for every position in the game.
     * @param {Array} history
     * @returns {string[]}
     */
    #buildPositions(history) {
        const positions = [];
        const game = new Chess();
        positions.push(game.fen());
        for (const m of history) {
            game.move(m);
            positions.push(game.fen());
        }
        return positions;
    }


    // ----------------------------------------------------------------
    // Private: smart analysis ordering
    // ----------------------------------------------------------------

    #buildSmartAnalysisOrder(totalPositions, currentIndex) {
        const order = [];
        const seen = new Set();
        const add = (idx) => {
            if (idx >= 0 && idx < totalPositions && !seen.has(idx)) {
                order.push(idx);
                seen.add(idx);
            }
        };

        if (currentIndex >= 0 && currentIndex < totalPositions - 1) {
            add(currentIndex);
            add(currentIndex + 1);
        }
        if (currentIndex > 0) add(currentIndex - 1);

        for (let i = 0; i < totalPositions; i++) add(i);
        return order;
    }
}

export const analysisQueue = new AnalysisQueue();