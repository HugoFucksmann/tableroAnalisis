/**
 * AnalysisQueue — Orchestrates per-move Stockfish analysis for a full game.
 *
 * Key upgrades vs. original:
 *  - Material is counted before/after each move to detect sacrifices (isSacrifice)
 *  - secondBestWpLoss is derived from multiPV Stockfish lines and passed to classifyMove
 *  - Player ELO is extracted from the game store / PGN headers and forwarded to
 *    EvaluationEngine.calculateAccuracy for ELO-scaled accuracy scoring
 *  - cpToWhiteWinProb is called with the board's material count for phase-aware WP
 */

import { Chess } from 'chess.js';
import { stockfishService } from './stockfishService';
import { useGameStore } from '../store/useGameStore';

import { ChessMath } from '../utils/chessMath';
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
            const materialCounts = this.#buildMaterialCounts(positions); // NEW
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
                        ply, history, positions, materialCounts,
                        evalResults, bookStatus, openingDone,
                        finalMoveData, completedMoves, onMoveResult, currentIndex
                    );
                },
                onOpeningDetected,
            }).finally(() => {
                openingDone = true;
                for (let i = 0; i < totalMoves; i++) {
                    this.#tryResolveMove(
                        i, history, positions, materialCounts,
                        evalResults, bookStatus, openingDone,
                        finalMoveData, completedMoves, onMoveResult, currentIndex
                    );
                }
            });

            const analysisOrder = this.#buildSmartAnalysisOrder(positions.length, currentIndex);

            for (const posIndex of analysisOrder) {
                if (signal.aborted) break;

                const fen = positions[posIndex];
                const isBlackTurn = fen.includes(' b ');
                const material = materialCounts[posIndex];
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
                        wp: ChessMath.cpToWhiteWinProb(result.score, result.mate, isBlackTurn, material),
                        score: ChessMath.cpToVisualScore(result.score, result.mate, isBlackTurn),
                        bestMove: result.bestMove,
                        lines: result.lines,
                    };

                    if (posIndex === 0) {
                        onMoveResult?.({ index: -1, bestMove: result.bestMove, lines: result.lines });
                    }

                    this.#tryResolveMove(posIndex - 1, history, positions, materialCounts, evalResults, bookStatus, openingDone, finalMoveData, completedMoves, onMoveResult, currentIndex);
                    this.#tryResolveMove(posIndex, history, positions, materialCounts, evalResults, bookStatus, openingDone, finalMoveData, completedMoves, onMoveResult, currentIndex);

                    const currentPct = Math.round((completedMoves.size / totalMoves) * 100);
                    onProgress?.(Math.min(99, currentPct), `Analizando (${currentPct}%)`);

                } catch (e) {
                    if (e.name === 'AbortError') break;

                    evalResults[posIndex] = { wp: 0.5, score: 0.0, bestMove: null, lines: null };
                    this.#tryResolveMove(posIndex - 1, history, positions, materialCounts, evalResults, bookStatus, openingDone, finalMoveData, completedMoves, onMoveResult, currentIndex);
                    this.#tryResolveMove(posIndex, history, positions, materialCounts, evalResults, bookStatus, openingDone, finalMoveData, completedMoves, onMoveResult, currentIndex);
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

            const isBlackTurn = fen.includes(' b ');
            const depth = engineConfig.depth ?? 18;

            // Compute material from the given FEN for phase-aware WP (fast FEN scan)
            const material = this.#totalMaterialFromFen(fen);

            const result = await stockfishService.analyzePosition(
                fen, depth, signal,
                ({ score, mate, bestMove }) => {
                    onResult?.({
                        score: ChessMath.cpToVisualScore(score, mate, isBlackTurn),
                        bestMove, moveIndex,
                    });
                },
                engineConfig.multiPv || 1
            );

            if (result && !signal.aborted) {
                onResult?.({
                    score: ChessMath.cpToVisualScore(result.score, result.mate, isBlackTurn),
                    bestMove: result.bestMove,
                    moveIndex,
                    lines: result.lines,
                    // Expose WP for callers who want it
                    wp: ChessMath.cpToWhiteWinProb(result.score, result.mate, isBlackTurn, material),
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
     * NEW vs. original:
     *  - Derives `secondBestWpLoss` from multiPV lines
     *  - Detects `isSacrifice` by comparing material before/after the move
     *  - Both values are forwarded to EvaluationEngine.classifyMove
     */
    #tryResolveMove(
        ply, history, positions, materialCounts,
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
        const isEngineBestMove = stateBefore.bestMove === movePlayed.lan;
        const isBook = bookStatus[ply] === true;

        // ----------------------------------------------------------
        // NEW: secondBestWpLoss
        // Compare best-line WP to 2nd-best-line WP to detect only-moves.
        // ----------------------------------------------------------
        const secondBestWpLoss = this.#calcSecondBestWpLoss(
            stateBefore.lines, isWhiteMove, materialCounts[ply]
        );

        // ----------------------------------------------------------
        // NEW: isSacrifice
        // The moving side voluntarily reduced its own material total
        // (excluding pawns keeps this from firing on simple exchanges).
        // ----------------------------------------------------------
        const isSacrifice = isEngineBestMove
            ? this.#detectSacrifice(positions, ply, isWhiteMove)
            : false;

        const label = isBook
            ? 'Libro'
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

        let wpLoss = isWhiteMove
            ? (stateBefore.wp - stateAfter.wp)
            : (stateAfter.wp - stateBefore.wp);
        if (isEngineBestMove || wpLoss < 0) wpLoss = 0;

        finalMoveData[ply] = { isWhiteMove, wpLoss, isBook };
        completedSet.add(ply);
    }

    // ----------------------------------------------------------------
    // Private: sacrifice detection
    // ----------------------------------------------------------------

    /**
     * Returns true when the moving side OFFERED a sacrifice — meaning it left
     * a piece en prise and the opponent captured it on the very next move.
     *
     * WHY positions[ply + 2] and NOT positions[ply + 1]:
     *   At positions[ply]   the moving side still has its piece.
     *   At positions[ply+1] the moving side just moved — a player CANNOT lose
     *                       their own pieces on their own turn; non-pawn material
     *                       is always unchanged vs. the position before.
     *   At positions[ply+2] the OPPONENT has replied; if they captured, the
     *                       moving side's material count will have dropped here.
     *
     * Comparing ply → ply+1 (the original bug) can never detect a sacrifice.
     *
     * @param {string[]} positions  – full FEN array for the game
     * @param {number}   ply        – index of the move being classified
     * @param {boolean}  isWhiteMove
     * @returns {boolean}
     */
    /**
     * Detecta un sacrificio midiendo si se perdió material real (oferta aceptada)
     * o si se dejó una pieza de alto valor "en prise" (oferta declinada).
     */
    #detectSacrifice(positions, ply, isWhiteMove) {
        let acceptedSacrifice = false;
        
        // 1. Detección de sacrificio aceptado (ply+2)
        if (ply + 2 < positions.length) {
            const getNetAdvantage = (fen) => {
                const PIECE_MAP = {
                    N: 305, B: 333, R: 563, Q: 950,
                    n: -305, b: -333, r: -563, q: -950
                };
                let advantage = 0;
                for (const ch of fen.split(' ')[0]) {
                    if (PIECE_MAP[ch]) advantage += PIECE_MAP[ch];
                }
                return isWhiteMove ? advantage : -advantage;
            };

            const advBefore = getNetAdvantage(positions[ply]);
            const advAfter = getNetAdvantage(positions[ply + 2]);
            acceptedSacrifice = (advBefore - advAfter) >= 200;
        }

        // 2. Detección de sacrificio declinado / expuesto (ply+1)
        let offeredSacrifice = false;
        if (ply + 1 < positions.length) {
            const tempChess = new Chess(positions[ply + 1]);
            const legalMoves = tempChess.moves({ verbose: true });
            
            const PIECE_VALUES = { p: 100, n: 305, b: 333, r: 563, q: 950, k: 0 };
            
            for (const m of legalMoves) {
                if (m.captured && PIECE_VALUES[m.captured] >= 300) {
                    const valCaptured = PIECE_VALUES[m.captured];
                    const valAttacker = PIECE_VALUES[m.piece] || 0;
                    
                    // Verificamos si la pieza está defendida haciendo la captura
                    tempChess.move(m);
                    const ourReplies = tempChess.moves({ verbose: true });
                    const isDefended = ourReplies.some(reply => reply.to === m.to);
                    tempChess.undo();
                    
                    // Es un sacrificio si la dejamos indefensa, O si el rival gana >= 200 puntos
                    // de material al capturarla (ej. Peón captura Caballo defendido = +205 para el rival).
                    if (!isDefended || (valCaptured - valAttacker >= 200)) {
                        offeredSacrifice = true;
                        break;
                    }
                }
            }
        }

        return acceptedSacrifice || offeredSacrifice;
    }

    /**
     * Count non-pawn, non-king piece value for one colour by scanning the FEN
     * piece-placement string directly — zero Chess() instantiations, ~100× faster
     * than using chess.board() in a loop over every ply of the game.
     *
     * FEN piece chars: uppercase = White, lowercase = Black.
     * We only need N/n B/b R/r Q/q (skipping P/p and K/k).
     *
     * @param {string}   fen
     * @param {'w'|'b'}  color
     * @returns {number}
     */
    #sideNonPawnMaterialFromFen(fen, color) {
        const placement = fen.split(' ')[0]; // only the board-layout field

        // White = uppercase letters, Black = lowercase letters
        const PIECE_MAP = color === 'w'
            ? { N: 305, B: 333, R: 563, Q: 950 }
            : { n: 305, b: 333, r: 563, q: 950 };

        let total = 0;
        for (const ch of placement) {
            if (PIECE_MAP[ch] !== undefined) total += PIECE_MAP[ch];
        }
        return total;
    }

    // ----------------------------------------------------------------
    // Private: only-move (secondBestWpLoss) computation
    // ----------------------------------------------------------------

    /**
     * Given Stockfish's multiPV lines for a position, compute how much worse
     * the 2nd-best line is compared to the best line (in WP units).
     *
     * A large gap means the played move (if it was the engine's best) was the
     * "only" move that kept the position tenable → "Gran Jugada".
     *
     * @param {Array|null} lines        – multiPV lines from Stockfish result
     * @param {boolean}    isWhiteMove  – used to orient WP
     * @param {number}     material     – board material for phase-aware WP
     * @returns {number} WP gap in [0, 1]; 0 if < 2 lines available
     */
    #calcSecondBestWpLoss(lines, isWhiteMove, material) {
        if (!lines || lines.length < 2) return 0;

        const toWp = (line) => {
            // Stockfish line objects are expected to have { score, mate }
            const isBlackTurn = !isWhiteMove;
            return ChessMath.cpToWhiteWinProb(
                line.score ?? 0,
                line.mate ?? null,
                isBlackTurn,
                material
            );
        };

        const wp1 = toWp(lines[0]);
        const wp2 = toWp(lines[1]);

        // From the moving player's perspective
        const best = isWhiteMove ? wp1 : (1 - wp1);
        const secondBest = isWhiteMove ? wp2 : (1 - wp2);

        return Math.max(0, best - secondBest);
    }

    // ----------------------------------------------------------------
    // Private: position & material array builders
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

    /**
     * Pre-compute total material count for every position (used for phase-aware WP).
     *
     * Uses fast FEN string scanning instead of new Chess() instantiation —
     * avoids hundreds of heavy object constructions for a full game.
     *
     * @param {string[]} positions
     * @returns {number[]}
     */
    #buildMaterialCounts(positions) {
        return positions.map((fen) => this.#totalMaterialFromFen(fen));
    }

    /**
     * Compute total board material from a FEN by reading the piece-placement
     * field character by character — no Chess() instantiation needed.
     *
     * All pieces of BOTH colours are counted (kings excluded).
     *
     * @param {string} fen
     * @returns {number}
     */
    #totalMaterialFromFen(fen) {
        const placement = fen.split(' ')[0];

        // Case-insensitive piece values (kings excluded)
        const PIECE_MAP = { n: 305, b: 333, r: 563, q: 950, p: 100 };

        let total = 0;
        for (const ch of placement) {
            const val = PIECE_MAP[ch.toLowerCase()];
            // Skip digits (empty squares), '/', and 'k'/'K'
            if (val !== undefined) total += val;
        }
        return total;
    }

    // ----------------------------------------------------------------
    // Private: smart analysis ordering (unchanged from original)
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