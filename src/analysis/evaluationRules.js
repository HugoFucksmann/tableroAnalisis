export const EvaluationEngine = {
    classifyMove(wpBefore, wpAfter, isWhiteMove, isEngineBestMove) {
        const rawWpLoss = isWhiteMove ? (wpBefore - wpAfter) : (wpAfter - wpBefore);

        if (isEngineBestMove && rawWpLoss <= -0.05) return 'Brillante';
        if (isEngineBestMove) return 'Mejor';

        const wpLoss = Math.max(0, rawWpLoss);

        if (wpLoss <= 0.02) return 'Excelente';
        if (wpLoss <= 0.05) return 'Bueno';
        if (wpLoss <= 0.10) return 'Imprecisión';
        if (wpLoss <= 0.20) return 'Error';

        return 'Error grave';
    },

    calculateAccuracy(moveData) {
        const calc = (moves) => {
            const validMoves = moves.filter(m => m !== undefined);
            if (validMoves.length === 0) return 100;

            let sumAccuracy = 0;
            let harmonicSum = 0;

            for (const move of validMoves) {
                const lossPct = move.wpLoss * 100;

                //  let moveAcc = lossPct <= 0 ? 100 : 100 * Math.exp(-0.085 * lossPct);
                let moveAcc = lossPct <= 0 ? 100 : Math.max(0, 103.1668 * Math.exp(-0.07354 * lossPct) - 3.1669);
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
            white: calc(moveData.filter(d => d && d.isWhiteMove && !d.isBook)),
            black: calc(moveData.filter(d => d && !d.isWhiteMove && !d.isBook)),
        };
    }
};