/**
 * ChessMath — Core chess probability & score conversion utilities.
 *
 * Key upgrades vs. original:
 *  - cpToWhiteWinProb now accepts `materialCount` (total piece value on board)
 *    to adjust the sigmoid steepness based on game phase.
 *  - In the endgame (low material), the same centipawn advantage translates to
 *    a much higher winning probability — the curve becomes more dramatic.
 *  - A helper `pieceValueSum` is exported so callers (analysisQueue) can compute
 *    materialCount directly from a Chess.js board snapshot.
 */

// Standard piece values (centipawns). King excluded — always present.
export const PIECE_VALUES = {
    p: 100,   // pawn
    n: 305,   // knight
    b: 333,   // bishop
    r: 563,   // rook
    q: 950,   // queen
};

// Maximum theoretical material on board at game start (both sides, no kings).
// 2 × (8p + 2n + 2b + 2r + 1q) = 2 × (800 + 610 + 666 + 1126 + 950) = 8304
const MAX_MATERIAL = 8304;

export class ChessMath {

    /**
     * Convert a Stockfish evaluation to White's win probability [0, 1].
     *
     * The sigmoid multiplier `k` is scaled by game phase:
     *   - Opening / middlegame (lots of material) → shallower curve (k ≈ 0.0037)
     *     A pawn advantage matters, but the position is still complex.
     *   - Endgame (little material left)           → steeper curve  (k ≈ 0.0080)
     *     Technique dominates; the same centipawn edge is far more decisive.
     *
     * @param {number}       cp            – Centipawn score from Stockfish (positive = White better)
     * @param {number|null}  mate          – Forced-mate distance (null if no mate)
     * @param {boolean}      isBlackTurn   – True if it is Black's turn to move
     * @param {number}       materialCount – Total piece value on board (use `pieceValueSum`).
     *                                       Defaults to MAX_MATERIAL (opening).
     * @returns {number} White win probability in [0, 1]
     */
    static cpToWhiteWinProb(cp, mate, isBlackTurn, materialCount = MAX_MATERIAL) {
        if (mate !== null) {
            return (mate > 0) === !isBlackTurn ? 1.0 : 0.0;
        }

        const k = this.#sigmoidK(materialCount);
        const prob = 1 / (1 + Math.exp(-k * cp));
        return isBlackTurn ? 1 - prob : prob;
    }

    /**
     * Convert a Stockfish evaluation to a ±10 visual score for UI bars.
     *
     * Behaviour is unchanged from original — this is purely cosmetic.
     *
     * @param {number}       cp
     * @param {number|null}  mate
     * @param {boolean}      isBlackTurn
     * @returns {number} Score in [–10, 10]
     */
    static cpToVisualScore(cp, mate, isBlackTurn) {
        if (mate !== null) {
            const sign = mate > 0 ? 1 : -1;
            return isBlackTurn ? -sign * 10 : sign * 10;
        }
        const normalized = Math.max(-10, Math.min(10, cp / 100));
        return isBlackTurn ? -normalized : normalized;
    }

    /**
     * Compute the total material value currently on the board from a Chess.js
     * board snapshot (`chess.board()`), counting pieces of BOTH colours.
     *
     * Usage:
     *   const materialCount = ChessMath.pieceValueSum(chess.board());
     *
     * @param {Array<Array<{type: string, color: string}|null>>} board
     *   The 8×8 array returned by chess.js `chess.board()`.
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

    // ----------------------------------------------------------------
    // Private helpers
    // ----------------------------------------------------------------

    /**
     * Derive the sigmoid steepness constant `k` from total material on board.
     *
     * Interpolation:
     *   materialCount == MAX_MATERIAL → k = K_OPENING  (0.00368208, original value)
     *   materialCount == 0            → k = K_ENDGAME  (0.008)
     *
     * This smoothly increases the WP-sensitivity as pieces come off the board.
     *
     * @param {number} materialCount
     * @returns {number}
     */
    static #sigmoidK(materialCount) {
        const K_OPENING = 0.00368208;
        const K_ENDGAME = 0.008;

        // Clamp to [0, MAX_MATERIAL] just in case
        const clamped = Math.max(0, Math.min(MAX_MATERIAL, materialCount));
        const phase = clamped / MAX_MATERIAL; // 1 = full board, 0 = empty board

        // Lerp: more material → closer to opening constant
        return K_OPENING * phase + K_ENDGAME * (1 - phase);
    }
}