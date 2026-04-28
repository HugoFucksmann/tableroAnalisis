import { useMemo } from 'react';
import { computeDelta } from '../../../utils/arrowUtils';
import { uciToArrow } from '../../../utils/boardUtils';

export const useBoardArrows = (currentLines, currentBestMove, currentEval, arrows, activeColor) => {
    return useMemo(() => {
        const storeArrows = arrows ?? [];
        const lines = currentLines ?? [];
        const arrowMap = new Map(); // key → { arrow, delta, mate, isEngineArrow }

        const isBlackTurn = activeColor === 'black';

        // Opción B: Usar la mejor jugada del motor como base comparativa
        const bestLine = lines.find(l => l.multipv === 1);
        const baselineScore = bestLine?.score ?? currentEval?.score ?? null;
        const baselineMate = bestLine?.mate ?? currentEval?.mate ?? null;

        // 1. Líneas MultiPV del motor (con delta de evaluación)
        lines.forEach((line) => {
            const color = `var(--arrow-engine-${Math.min(line.multipv, 5)})`;

            const arrow = uciToArrow(line.move, color);
            if (!arrow) return;

            const key = `${arrow.startSquare}-${arrow.endSquare}`;
            if (arrowMap.has(key)) return;

            const { delta, mate } = computeDelta(line, baselineScore, baselineMate, isBlackTurn);

            arrowMap.set(key, { arrow, delta, mate, isEngineArrow: true });
        });

        // 2. Fallback: single bestMove (Si el motor solo dio la jugada principal)
        if (arrowMap.size === 0 && currentBestMove) {
            const arrow = uciToArrow(currentBestMove, 'var(--arrow-engine-fallback)');
            if (arrow) {
                const key = `${arrow.startSquare}-${arrow.endSquare}`;
                arrowMap.set(key, { arrow, delta: 0, mate: baselineMate, isEngineArrow: true });
            }
        }

        // 3. Flechas del store (Aperturas o pintadas manualmente)
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
