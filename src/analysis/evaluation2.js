/**
 * EvaluationEngine — Chess.com-style move classification & accuracy calculation.
 *
 * Chess.com alignment (2024):
 *
 *  classifyMove:
 *   - Now operates on CENTIPAWN LOSS (not WP loss directly). This matches how
 *     Chess.com determines move quality — they convert both positions to CP via
 *     the inverse sigmoid and compare the difference.
 *   - Thresholds are calibrated to Chess.com's published approximate ranges:
 *       Excelente  ≤ 10 cp
 *       Bueno      ≤ 25 cp
 *       Imprecisión≤ 50 cp
 *       Error      ≤ 100 cp
 *       Error grave> 100 cp
 *   - Brillante / Genial logic is unchanged (engine best + sacrifice / only-move).
 *   - Winning-position tolerance is reimplemented in CP space.
 *
 *  calculateAccuracy:
 *   - Uses Chess.com's published formula (blog post, 2023):
 *       accuracy = 103.1668 × exp(−0.04354 × avgCpLoss) − 3.1669
 *     Applied to the average centipawn loss per player, clamped to [0, 100].
 *   - This replaces the blended arithmetic/harmonic mean approach.
 */

import { ChessMath } from '../utils/chessMath';

export class EvaluationEngine {

    // ----------------------------------------------------------------
    // Classification thresholds (centipawns loss vs. engine best move)
    // ----------------------------------------------------------------
    static #CP_EXCELLENT = 10;
    static #CP_GOOD = 25;
    static #CP_INACCURACY = 50;
    static #CP_MISTAKE = 100;
    // > 100 cp → Blunder

    // Threshold for "only-move" detection (WP gap between PV1 and PV2)
    static #ONLY_MOVE_WP_THRESHOLD = 0.15;

    /**
     * Classify a single move.
     *
     * @param {number}  wpBefore          – White WP BEFORE the move (0–1)
     * @param {number}  wpAfter           – White WP AFTER the move (0–1)
     * @param {boolean} isWhiteMove
     * @param {boolean} isEngineBestMove  – True if played move = Stockfish top choice
     * @param {number}  secondBestWpLoss  – WP gap between PV1 and PV2 (0–1)
     *                                      Large → played move was the "only" good one.
     * @param {boolean} isSacrifice       – True if the moving side voluntarily lost material
     * @returns {string} Classification label
     */
    static classifyMove(
        wpBefore,
        wpAfter,
        isWhiteMove,
        isEngineBestMove,
        secondBestWpLoss = 0,
        isSacrifice = false
    ) {
        // -------------------------------------------------------
        // BRILLANTE (!!): engine's best move AND a real sacrifice
        // -------------------------------------------------------
        if (isEngineBestMove && isSacrifice) {
            return 'Brillante';
        }

        // -------------------------------------------------------
        // GENIAL (!): engine's best move AND the only good one
        // (2nd-best option was dramatically worse)
        // -------------------------------------------------------
        if (isEngineBestMove && secondBestWpLoss > this.#ONLY_MOVE_WP_THRESHOLD) {
            return 'Genial';
        }

        // -------------------------------------------------------
        // MEJOR: engine's best move (no special conditions)
        // -------------------------------------------------------
        if (isEngineBestMove) {
            return 'Mejor';
        }

        // -------------------------------------------------------
        // Compute CP loss from the moving player's perspective.
        // This is the primary classification axis — matching Chess.com.
        // -------------------------------------------------------
        const cpLoss = ChessMath.cpLoss(wpBefore, wpAfter, isWhiteMove);

        // -------------------------------------------------------
        // WINNING-POSITION TOLERANCE (in CP space)
        // When the player was already completely winning, cap punishment.
        // Check AFTER best-move branches so Mejor/Brillante/Genial are unaffected.
        // -------------------------------------------------------
        const playerWpBefore = isWhiteMove ? wpBefore : (1 - wpBefore);
        const playerWpAfter = isWhiteMove ? wpAfter : (1 - wpAfter);
        const isAlreadyWinning = playerWpBefore > 0.95 && playerWpAfter > 0.90;

        if (isAlreadyWinning) {
            // Even large CP swings don't change a technically won game much.
            // Cap at Bueno when still clearly winning after the move.
            if (cpLoss <= this.#CP_EXCELLENT) return 'Excelente';
            return 'Bueno';
        }

        // -------------------------------------------------------
        // STANDARD THRESHOLDS (centipawn loss)
        // -------------------------------------------------------
        if (cpLoss <= this.#CP_EXCELLENT) return 'Excelente';
        if (cpLoss <= this.#CP_GOOD) return 'Bueno';
        if (cpLoss <= this.#CP_INACCURACY) return 'Imprecisión';
        if (cpLoss <= this.#CP_MISTAKE) return 'Error';

        return 'Error grave';
    }

    /**
     * Calculate accuracy for White and Black using Chess.com's published formula.
     *
     * Formula (Chess.com Accuracy blog, 2023):
     *   accuracy = 103.1668 × exp(−0.04354 × avgCpLoss) − 3.1669
     *
     * Input: move objects must carry `cpLoss` (centipawns lost vs. best move).
     * Book moves are excluded from the calculation.
     *
     * @param {Array<{isWhiteMove: boolean, cpLoss: number, isBook: boolean}>} moveData
     * @returns {{ white: number, black: number }}
     */
    static calculateAccuracy(moveData) {
        const calc = (moves) => {
            const valid = moves.filter(m => m !== undefined && !m.isBook);
            if (valid.length === 0) return 100;

            const avgCpLoss = valid.reduce((sum, m) => sum + (m.cpLoss ?? 0), 0) / valid.length;

            // Chess.com's exponential accuracy formula
            const accuracy = 103.1668 * Math.exp(-0.04354 * avgCpLoss) - 3.1669;

            return Math.max(0, Math.min(100, Math.round(accuracy)));
        };

        return {
            white: calc(moveData.filter(d => d && d.isWhiteMove)),
            black: calc(moveData.filter(d => d && !d.isWhiteMove)),
        };
    }
}