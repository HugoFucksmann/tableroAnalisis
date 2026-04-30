import { useMemo } from 'react';
import { computeDelta } from '../../../utils/arrowUtils';
import { uciToArrow } from '../../../utils/boardUtils';

export const useBoardArrows = (currentLines, currentBestMove, currentEval, arrows, activeColor) => {
    return useMemo(() => {
        const storeArrows = arrows ?? [];
        const lines = currentLines ?? [];
        const arrowMap = new Map();

        const isBlackTurn = activeColor === 'black';

        const bestLine = lines.find(l => l.multipv === 1);
        const baselineScore = bestLine?.score ?? currentEval?.score ?? null;
        const baselineMate = bestLine?.mate ?? currentEval?.mate ?? null;

        lines.forEach((line) => {
            const color = `var(--arrow-engine-${Math.min(line.multipv, 5)})`;

            const arrow = uciToArrow(line.move, color);
            if (!arrow) return;

            const key = `${arrow.startSquare}-${arrow.endSquare}`;
            if (arrowMap.has(key)) return;

            const { delta, mate } = computeDelta(line, baselineScore, baselineMate, isBlackTurn);

            arrowMap.set(key, { arrow, delta, mate, isEngineArrow: true });
        });

        if (arrowMap.size === 0 && currentBestMove) {
            const arrow = uciToArrow(currentBestMove, 'var(--arrow-engine-fallback)');
            if (arrow) {
                const key = `${arrow.startSquare}-${arrow.endSquare}`;
                arrowMap.set(key, { arrow, delta: 0, mate: baselineMate, isEngineArrow: true });
            }
        }

        for (const storeArrow of storeArrows) {
            const key = `${storeArrow.startSquare}-${storeArrow.endSquare}`;
            if (storeArrows.length === 1) {
                arrowMap.set(key, { arrow: storeArrow, delta: null, mate: null, isEngineArrow: false });
            } else {
                if (!arrowMap.has(key)) {
                    arrowMap.set(key, { arrow: storeArrow, delta: null, mate: null, isEngineArrow: false });
                }
            }
        }

        const entries = Array.from(arrowMap.values());
        return {
            combinedArrows: entries.map(e => e.arrow),
            arrowsWithDelta: entries,
        };
    }, [currentLines, currentBestMove, arrows, currentEval, activeColor]);
};
