import { useMemo } from 'react';
import { computeDelta } from '../../../utils/arrowUtils';
import { uciToArrow, sanToArrow } from '../../../utils/boardUtils';

/**
 * Hook para gestionar la lógica unificada de flechas del tablero.
 * Maneja prioridades, colores y fusión de metadatos (Análisis + Explorador).
 */
export const useBoardArrows = (currentLines, currentBestMove, currentEval, arrows, activeColor, explorerMode, explorerData, game, playerColor, hoveredExplorerMove, mastersData) => {
    return useMemo(() => {
        const arrowMap = new Map();

        /**
         * Añade o fusiona una flecha en el mapa.
         * Si ya existe una flecha para las mismas casillas, se fusionan sus metadatos.
         */
        const addArrow = (arrow, metadata) => {
            if (!arrow) return;
            const key = `${arrow.startSquare}-${arrow.endSquare}`;
            const existing = arrowMap.get(key);

            if (existing) {
                // Fusionar flags de tipo
                if (metadata.isEngineArrow) existing.isEngineArrow = true;
                if (metadata.isExplorerArrow) existing.isExplorerArrow = true;
                
                // Actualizar valores de evaluación si vienen del motor
                if (metadata.delta !== undefined) existing.delta = metadata.delta;
                if (metadata.mate !== undefined) existing.mate = metadata.mate;
                
                // Actualizar conteo si viene del explorador
                if (metadata.count !== undefined) existing.count = metadata.count;

                // Prioridad de Color:
                // 1. Motor (Cyan/Eval) tiene máxima prioridad visual.
                // 2. Si no hay motor, mantenemos el color existente (que podría ser Maestro o Usuario).
                if (metadata.isEngineArrow) {
                    existing.arrow.color = arrow.color;
                }
                return;
            }

            arrowMap.set(key, { arrow, ...metadata });
        };

        // 1. PROCESAR FLECHAS DEL EXPLORADOR (Base de datos y Maestros)
        if (explorerMode) {
            // Caso A: Flecha de hover (movimiento sobre el que está el ratón en la lista)
            if (hoveredExplorerMove) {
                const perspectiveData = playerColor === 'white' ? explorerData?.whitePerspective : explorerData?.blackPerspective;
                const isUser = perspectiveData?.userMoves?.some(m => m.san === hoveredExplorerMove);
                const isOpponent = perspectiveData?.opponentMoves?.some(m => m.san === hoveredExplorerMove);
                const isMaster = mastersData?.some(m => m.san === hoveredExplorerMove);

                let colorVar = '--arrow-explorer-base';
                if (isUser) colorVar = '--arrow-user';
                else if (isOpponent) colorVar = '--arrow-opponent';
                else if (isMaster) colorVar = '--arrow-master';

                addArrow(sanToArrow(hoveredExplorerMove, game, `var(${colorVar})`), { isExplorerArrow: true, count: '' });
            } 
            
            // Caso B: Flechas persistentes (Top 3 jugadas de la base de datos)
            if (explorerData) {
                const isPlayerTurn = activeColor === playerColor;
                const perspectiveData = playerColor === 'white' ? explorerData?.whitePerspective : explorerData?.blackPerspective;
                const movesToShow = (isPlayerTurn ? perspectiveData?.userMoves : perspectiveData?.opponentMoves) || [];
                const colorVar = isPlayerTurn ? '--arrow-user' : '--arrow-opponent';

                movesToShow.slice(0, 3).forEach((move) => {
                    addArrow(sanToArrow(move.san, game, `var(${colorVar})`), { 
                        count: move.count, 
                        isExplorerArrow: true 
                    });
                });
            }
        }

        // 2. PROCESAR FLECHAS DEL MOTOR (Análisis en tiempo real)
        const lines = currentLines ?? [];
        if (lines.length > 0 || currentBestMove) {
            const isBlackTurn = activeColor === 'black';
            const bestLine = lines.find(l => l.multipv === 1);
            const baselineScore = bestLine?.score ?? currentEval?.score ?? null;
            const baselineMate = bestLine?.mate ?? currentEval?.mate ?? null;

            // Procesar todas las líneas del MultiPV
            lines.forEach((line) => {
                const color = `var(--arrow-engine-${Math.min(line.multipv, 5)})`;
                const arrow = uciToArrow(line.move, color);
                if (!arrow) return;

                const { delta, mate } = computeDelta(line, baselineScore, baselineMate, isBlackTurn);
                addArrow(arrow, { delta, mate, isEngineArrow: true });
            });

            // Si no hay líneas pero sí un BestMove (fallback)
            if (lines.length === 0 && currentBestMove) {
                const arrow = uciToArrow(currentBestMove, 'var(--arrow-engine-fallback)');
                addArrow(arrow, { delta: 0, mate: baselineMate, isEngineArrow: true });
            }
        }

        // 3. PROCESAR FLECHAS MANUALES (Dibujadas por el usuario, etc.)
        const storeArrows = arrows ?? [];
        for (const storeArrow of storeArrows) {
            addArrow(storeArrow, { isEngineArrow: false });
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
