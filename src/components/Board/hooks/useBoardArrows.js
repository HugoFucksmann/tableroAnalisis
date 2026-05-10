import { useMemo } from 'react';
import { computeDelta } from '../../../utils/arrowUtils';
import { uciToArrow, sanToArrow } from '../../../utils/boardUtils';

export const useBoardArrows = (currentLines, currentBestMove, currentEval, arrows, activeColor, explorerMode, explorerData, game, playerColor, hoveredExplorerMove, mastersData) => {
    return useMemo(() => {
        if (explorerMode) {
            const arrowMap = new Map();
            
            // Show arrow ONLY if hovering over a move in the list, OR top 3 moves of current side
            if (hoveredExplorerMove) {
                const perspectiveData = playerColor === 'white' ? explorerData?.whitePerspective : explorerData?.blackPerspective;
                const isUser = perspectiveData?.userMoves?.some(m => m.san === hoveredExplorerMove);
                const isOpponent = perspectiveData?.opponentMoves?.some(m => m.san === hoveredExplorerMove);
                const isMaster = mastersData?.some(m => m.san === hoveredExplorerMove);

                let colorVar = '--arrow-explorer-base';
                if (isUser) colorVar = '--arrow-user';
                else if (isOpponent) colorVar = '--arrow-opponent';
                else if (isMaster) colorVar = '--arrow-master';

                const arrow = sanToArrow(hoveredExplorerMove, game, `var(${colorVar})`);
                if (arrow) {
                    arrowMap.set('hover', { arrow, isExplorerArrow: true, count: '' });
                }
            } else if (explorerData) {
                // DEFAULT: Show top 3 moves for the side whose turn it is
                const isPlayerTurn = activeColor === playerColor;
                const perspectiveData = playerColor === 'white' ? explorerData?.whitePerspective : explorerData?.blackPerspective;
                const movesToShow = (isPlayerTurn ? perspectiveData?.userMoves : perspectiveData?.opponentMoves) || [];
                const colorVar = isPlayerTurn ? '--arrow-user' : '--arrow-opponent';

                movesToShow.slice(0, 3).forEach((move, idx) => {
                    const arrow = sanToArrow(move.san, game, `var(${colorVar})`);
                    if (arrow) {
                        arrowMap.set(`top-${idx}`, { 
                            arrow, 
                            count: move.count, 
                            isExplorerArrow: true 
                        });
                    }
                });
            }

            const entries = Array.from(arrowMap.values());
            return {
                combinedArrows: entries.map(e => e.arrow),
                arrowsWithDelta: entries,
            };
        }

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
    }, [
        currentLines, currentBestMove, arrows, currentEval, activeColor, 
        explorerMode, explorerData, game, playerColor, hoveredExplorerMove, mastersData
    ]);
};
