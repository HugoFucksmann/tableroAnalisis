/**
 * EvaluationEngine — Chess.com-style move classification & accuracy calculation.
 *
 * Key upgrades vs. original:
 *  - classifyMove now receives `secondBestWpLoss` and `isSacrifice`
 *  - "Brillante" (!!): engine best move + actual material sacrifice
 *  - "Gran Jugada" (!): engine best move + huge gap to 2nd-best line (only-move detection)
 *  - Winning-position tolerance: if the player was already crushing, never punish too hard
 *  - calculateAccuracy accepts `playerElo` for a dynamic decay factor
 */

export class EvaluationEngine {

    /**
     * Classify a single move.
     *
     * @param {number}  wpBefore          – White win-probability BEFORE the move (0-1)
     * @param {number}  wpAfter           – White win-probability AFTER the move (0-1)
     * @param {boolean} isWhiteMove       – True if White just moved
     * @param {boolean} isEngineBestMove  – True if the played move matches Stockfish's top choice
     * @param {number}  secondBestWpLoss  – WP lost vs. the 2nd-best engine line (0-1).
     *                                      Large value → played move was the "only" good one.
     *                                      Pass 0 when multiPV data is unavailable.
     * @param {boolean} isSacrifice       – True if the moving side lost material value vs. before
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
        // --- Raw WP loss from the moving player's perspective ---
        const rawWpLoss = isWhiteMove
            ? (wpBefore - wpAfter)
            : (wpAfter - wpBefore);

        // -------------------------------------------------------
        // BRILLANTE (!!): engine's best move AND a real sacrifice
        // -------------------------------------------------------
        if (isEngineBestMove && isSacrifice) {
            return 'Brillante';
        }

        // -------------------------------------------------------
        // GRAN JUGADA (!): engine's best move AND the only good one
        // (2nd-best option was dramatically worse, gap > 0.30 WP)
        // -------------------------------------------------------
        const ONLY_MOVE_THRESHOLD = 0.30;
        if (isEngineBestMove && secondBestWpLoss > ONLY_MOVE_THRESHOLD) {
            return 'Genial';
        }

        // -------------------------------------------------------
        // MEJOR: engine's best move (no special conditions)
        // -------------------------------------------------------
        if (isEngineBestMove) {
            return 'Mejor';
        }

        // -------------------------------------------------------
        // WINNING-POSITION TOLERANCE — only for non-best moves
        // When the player is already crushing, cap the worst label.
        // This must come AFTER all isEngineBestMove branches so that
        // 'Mejor' / 'Brillante' / 'Genial' are never suppressed.
        // -------------------------------------------------------
        const playerWpBefore = isWhiteMove ? wpBefore : (1 - wpBefore);
        const playerWpAfter = isWhiteMove ? wpAfter : (1 - wpAfter);
        const isAlreadyWinning = playerWpBefore > 0.95 && playerWpAfter > 0.90;

        const wpLoss = Math.max(0, rawWpLoss);

        if (isAlreadyWinning) {
            // Be lenient: anything up to a moderate loss is still "Bueno"
            if (wpLoss <= 0.10) return 'Excelente';
            return 'Bueno';
        }

        // -------------------------------------------------------
        // STANDARD THRESHOLDS
        // -------------------------------------------------------
        if (wpLoss <= 0.02) return 'Excelente';
        if (wpLoss <= 0.05) return 'Bueno';
        if (wpLoss <= 0.10) return 'Imprecisión';
        if (wpLoss <= 0.20) return 'Error';

        return 'Error grave';
    }

    /**
     * Calculate accuracy for White and Black independently.
     *
     * Uses a blended arithmetic + harmonic mean with an ELO-scaled
     * exponential decay factor per player — each colour is evaluated
     * against their own skill level, not the opponent's.
     *
     * @param {Array<{isWhiteMove: boolean, wpLoss: number, isBook: boolean}>} moveData
     * @param {number} eloWhite  – ELO of the White player (default 1500)
     * @param {number} eloBlack  – ELO of the Black player (default 1500)
     * @returns {{ white: number, black: number }}
     */
    static calculateAccuracy(moveData, eloWhite = 1500, eloBlack = 1500) {
        const calc = (moves, elo) => {
            const decayFactor = EvaluationEngine.#eloDecayFactor(elo);
            const validMoves = moves.filter(m => m !== undefined);
            if (validMoves.length === 0) return 100;

            let sumAccuracy = 0;
            let harmonicSum = 0;

            for (const move of validMoves) {
                const lossPct = move.wpLoss * 100;

                // Exponential penalty scaled to this player's ELO
                let moveAcc = lossPct <= 0
                    ? 100
                    : 100 * Math.exp(decayFactor * lossPct);

                moveAcc = Math.max(0, Math.min(100, moveAcc));

                sumAccuracy += moveAcc;
                harmonicSum += 1 / Math.max(1, moveAcc);
            }

            const arithmeticMean = sumAccuracy / validMoves.length;
            const harmonicMean = validMoves.length / harmonicSum;

            const finalAcc = (arithmeticMean + harmonicMean) / 2;
            return Math.max(0, Math.min(100, Math.round(finalAcc)));
        };

        return {
            white: calc(moveData.filter(d => d && d.isWhiteMove && !d.isBook), eloWhite),
            black: calc(moveData.filter(d => d && !d.isWhiteMove && !d.isBook), eloBlack),
        };
    }

    // ----------------------------------------------------------------
    // Private helpers
    // ----------------------------------------------------------------

    /**
     * Map player ELO to an exponential decay factor (negative value).
     *
     * Logic:
     *   ELO < 1000  → gentler penalty  (–0.04)  — beginners make big mistakes; don't crush them
     *   ELO 1000-2000 → linear interpolation between –0.04 and –0.12
     *   ELO > 2000  → strict penalty   (–0.12)  — masters should find near-perfect moves
     *
     * @param {number} elo
     * @returns {number} negative decay constant
     */
    static #eloDecayFactor(elo) {
        const MIN_ELO = 1000;
        const MAX_ELO = 2000;
        const MIN_DECAY = -0.04;   // lenient
        const MAX_DECAY = -0.12;   // strict

        if (elo <= MIN_ELO) return MIN_DECAY;
        if (elo >= MAX_ELO) return MAX_DECAY;

        // Linear interpolation
        const t = (elo - MIN_ELO) / (MAX_ELO - MIN_ELO);
        return MIN_DECAY + t * (MAX_DECAY - MIN_DECAY);
    }
}