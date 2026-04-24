/**
 * EvaluationEngine — Chess.com-style move classification & accuracy calculation.
 *
 * Chess.com alignment (2024):
 *
 *  classifyMove:
 *   - Operates on CENTIPAWN LOSS matching Chess.com's actual published ranges:
 *       Excelente   ≤ 20 cp
 *       Bueno       ≤ 50 cp
 *       Imprecisión ≤ 100 cp
 *       Error       ≤ 200 cp
 *       Omisión     ≤ 300 cp  (missed tactical opportunity, position still playable)
 *       Error grave > 300 cp
 *   - Genial threshold raised to 0.20 WP gap (more selective).
 *   - Winning-position tolerance: still clearly winning (WP 90% → 80%),
 *     cap maximum penalty at Imprecisión.
 *   - Losing-position tolerance: already clearly losing (WP < 10%),
 *     cap maximum penalty at Error.
 *   - ChessMath.cpLoss now applies ±600 cp soft-cap to prevent sigmoid
 *     extremes from inflating losses in technically decided positions.
 *
 *  calculateAccuracy:
 *   - Uses Chess.com's published formula (blog post, 2023):
 *       accuracy = 103.1668 × exp(−0.04354 × avgCpLoss) − 3.1669
 *     Applied to the average centipawn loss per player, clamped to [0, 100].
 */

import { ChessMath } from '../utils/chessMath';

export class EvaluationEngine {

    // ----------------------------------------------------------------
    // Classification thresholds (centipawns loss vs. engine best move)
    // ----------------------------------------------------------------
    static #CP_EXCELLENT = 20;   // ≤  20 cp → Excelente
    static #CP_GOOD = 50;   // ≤  50 cp → Bueno
    static #CP_INACCURACY = 100;  // ≤ 100 cp → Imprecisión
    static #CP_MISTAKE = 200;  // ≤ 200 cp → Error
    static #CP_MISS = 300;  // ≤ 300 cp → Omisión (missed tactic, still playable)
    // > 300 cp → Error grave

    // Threshold for "only-move" detection (WP gap between PV1 and PV2).
    // Raised to 0.20 to be more selective about awarding "Genial".
    static #ONLY_MOVE_WP_THRESHOLD = 0.20;

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
        // Gap must exceed 0.20 WP (vs the old 0.15) to qualify as the only good move.
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
        // ChessMath.cpLoss applies a ±600 cp soft-cap to prevent
        // sigmoid extremes from inflating losses near WP 0/1.
        // -------------------------------------------------------
        const cpLoss = ChessMath.cpLoss(wpBefore, wpAfter, isWhiteMove);

        // -------------------------------------------------------
        // WINNING-POSITION TOLERANCE
        // When the player was clearly winning and remains so, cap the
        // maximum penalty. Chess.com never marks a blunder in a won game.
        // Window expanded: 90% → 80% (catches the "still winning" zone).
        // -------------------------------------------------------
        const playerWpBefore = isWhiteMove ? wpBefore : (1 - wpBefore);
        const playerWpAfter = isWhiteMove ? wpAfter : (1 - wpAfter);
        const isAlreadyWinning = playerWpBefore > 0.90 && playerWpAfter > 0.80;

        if (isAlreadyWinning) {
            if (cpLoss <= this.#CP_EXCELLENT) return 'Excelente';
            if (cpLoss <= this.#CP_INACCURACY) return 'Bueno';      // upgraded tolerance
            return 'Imprecisión';  // hard cap: never Error/Blunder when still winning
        }

        // -------------------------------------------------------
        // LOSING-POSITION TOLERANCE
        // When the player was already clearly losing, Chess.com caps
        // severity — there are no "good" moves left to miss.
        // -------------------------------------------------------
        const isClearlyLosing = playerWpBefore < 0.10 && playerWpAfter < 0.15;

        if (isClearlyLosing) {
            if (cpLoss <= this.#CP_INACCURACY) return 'Imprecisión';
            return 'Error'; // hard cap: never Error grave when already losing
        }

        // -------------------------------------------------------
        // STANDARD THRESHOLDS (centipawn loss)
        // -------------------------------------------------------
        if (cpLoss <= this.#CP_EXCELLENT) return 'Excelente';
        if (cpLoss <= this.#CP_GOOD) return 'Bueno';
        if (cpLoss <= this.#CP_INACCURACY) return 'Imprecisión';
        if (cpLoss <= this.#CP_MISTAKE) return 'Error';
        if (cpLoss <= this.#CP_MISS) return 'Omisión';  // missed tactic, still playable

        return 'Error grave';
    }

    /**
     * Calculate accuracy for White and Black using Chess.com's published formula.
     *
     * Formula (Chess.com Accuracy blog, 2023):
     *   accuracy = 103.1668 × exp(−0.04354 × avgWpLoss) − 3.1669
     *
     * ⚠️  The formula input is WIN-PROBABILITY LOSS in the 0–100 scale
     *     (percentage points), NOT centipawns. Using centipawns here was
     *     the bug that produced ~21 % instead of ~71 % accuracy.
     *
     * Typical avgWpLoss ranges:
     *   Strong  game:  3– 8 → accuracy 75–92 %
     *   Amateur game:  8–20 → accuracy 50–75 %
     *   Very weak:    20–40 → accuracy 20–50 %
     *
     * @param {Array<{isWhiteMove: boolean, wpLoss: number, isBook: boolean}>} moveData
     * @returns {{ white: number, black: number }}
     */
    static calculateAccuracy(moveData) {
        const calc = (moves) => {
            const valid = moves.filter(m => m !== undefined && !m.isBook);
            if (valid.length === 0) return 100;

            // avgWpLoss: average win-probability lost per move (0–100 scale).
            // This is what Chess.com's formula was calibrated for.
            const avgWpLoss = valid.reduce((sum, m) => sum + (m.wpLoss ?? 0), 0) / valid.length;

            // Chess.com's exponential accuracy formula
            const accuracy = 103.1668 * Math.exp(-0.04354 * avgWpLoss) - 3.1669;

            return Math.max(0, Math.min(100, Math.round(accuracy)));
        };

        return {
            white: calc(moveData.filter(d => d && d.isWhiteMove)),
            black: calc(moveData.filter(d => d && !d.isWhiteMove)),
        };
    }
}