/**
 * ChessMath — Core chess probability & score conversion utilities.
 *
 * Chess.com alignment (2024):
 *  - cpToWhiteWinProb uses the logistic formula in base-10 that Chess.com
 *    and modern Lichess research use: WP = 1 / (1 + 10^(-cp/400)).
 *    This is equivalent to a base-e sigmoid with k = ln(10)/400 ≈ 0.005756.
 *    The sigmoid steepness is CONSTANT. CP is always treated as absolute
 *    (positive = White better), so no turn-based inversion is applied.
 *
 *  - cpLoss() converts a WP delta back to centipawns, which is the unit
 *    EvaluationEngine uses internally for classification thresholds.
 *
 *  - pieceValueSum() counts board material from a Chess.js board snapshot.
 *    Used externally by sacrifice-detection callers where needed.
 */

// Standard piece values (centipawns). King excluded — always present.
export const PIECE_VALUES = {
    p: 100,   // pawn
    n: 305,   // knight
    b: 333,   // bishop
    r: 563,   // rook
    q: 950,   // queen
};


/**
 * Sigmoid constant matching Chess.com's published formula:
 *   WP = 1 / (1 + 10^(-cp/400))
 *   = 1 / (1 + exp(-cp * ln(10)/400))
 *   → k = ln(10) / 400
 */
const K = Math.log(10) / 400; // ≈ 0.005756

export class ChessMath {

    /**
     * Convert a Stockfish evaluation to White's win probability [0, 1].
     *
     * Uses Chess.com's logistic formula (base-10 sigmoid, scale 400):
     *   WP = 1 / (1 + 10^(-cp / 400))
     *
     * CP is always treated as absolute (positive = White better). No turn-based
     * inversion is applied — both wpBefore and wpAfter share the same frame,
     * so cpLoss arithmetic is always consistent regardless of whose turn it is.
     *
     * ASSUMPTION: your Stockfish wrapper normalises CP to White's absolute frame.
     * This is the default for stockfish.js, stockfish-web, and most JS wrappers.
     * Raw UCI output is side-relative and would need normalisation upstream.
     *
     * @param {number}      cp    – Centipawn score (positive = White better)
     * @param {number|null} mate  – Forced-mate distance (null if no mate)
     * @returns {number} White win probability in [0, 1]
     */
    static cpToWhiteWinProb(cp, mate) {
        if (mate !== null) {
            // Assumes wrapper normalises to White's absolute frame:
            //   mate > 0 → White delivers mate → White wins
            //   mate < 0 → Black delivers mate → Black wins
            return mate > 0 ? 1.0 : 0.0;
        }

        // CP is always in White's absolute frame (positive = White better).
        // WP = 1 / (1 + 10^(−cp/400)) — Chess.com's published formula.
        // No turn-based inversion: wpBefore and wpAfter share the same
        // absolute reference, so cpLoss arithmetic is always consistent.
        return 1 / (1 + Math.exp(-K * cp));
    }

    /**
     * Convert a WP value back to centipawns (inverse of cpToWhiteWinProb).
     *
     * Useful for converting a WP delta into a CP-equivalent loss, which is the
     * unit Chess.com uses for classification thresholds.
     *
     * @param {number} wp – Win probability in [0, 1]
     * @returns {number}  Centipawn score (may be negative / very large at extremes)
     */
    static wpToCp(wp) {
        // Clamp to avoid log(0)
        const clamped = Math.max(0.0001, Math.min(0.9999, wp));
        return -Math.log10(1 / clamped - 1) * 400;
    }

    /**
     * Compute the centipawn loss for a move from the perspective of the moving side.
     *
     * cpLoss > 0  → player lost CP (bad move)
     * cpLoss <= 0 → player gained or broke even (best move or better)
     *
     * This is the primary metric Chess.com uses for classification and accuracy.
     *
     * @param {number}  wpBefore     – WP before the move (White's perspective)
     * @param {number}  wpAfter      – WP after the move (White's perspective)
     * @param {boolean} isWhiteMove
     * @returns {number} CP loss from the moving player's perspective (≥ 0 after clamping)
     */
    static cpLoss(wpBefore, wpAfter, isWhiteMove) {
        // Convert both WP values to CP (always from White's absolute frame)
        const cpBefore = this.wpToCp(wpBefore);
        const cpAfter = this.wpToCp(wpAfter);

        // Delta from the moving side's perspective
        const rawLoss = isWhiteMove
            ? (cpBefore - cpAfter)   // White wants cp to go up
            : (cpAfter - cpBefore); // Black wants cp to go down (more negative)

        return Math.max(0, rawLoss);
    }

    /**
     * Convert a Stockfish evaluation to a ±10 visual score for UI bars.
     *
     * CP is treated as absolute (White's frame). The bar always shows
     * positive = White better, negative = Black better — no turn inversion.
     *
     * @param {number}       cp
     * @param {number|null}  mate
     * @returns {number} Score in [–10, 10]
     */
    static cpToVisualScore(cp, mate) {
        if (mate !== null) {
            return mate > 0 ? 10 : -10;
        }
        return Math.max(-10, Math.min(10, cp / 100));
    }

    /**
     * Compute the total material value currently on the board from a Chess.js
     * board snapshot (`chess.board()`), counting pieces of BOTH colours.
     *
     * @param {Array<Array<{type: string, color: string}|null>>} board
     * @returns {number} Sum of all piece values in centipawns (king excluded)
     */
    static pieceValueSum(board) {
        let total = 0;
        for (const row of board) {
            for (const square of row) {
                if (square && square.type !== 'k') {
                    total += PIECE_VALUES[square.type] ?? 0;
                }
            }
        }
        return total;
    }
}