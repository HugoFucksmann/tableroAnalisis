import React from 'react';
import './ArrowEvalOverlay.css';

import { squareToPct } from '../../utils/boardUtils';
import { formatDelta } from '../../utils/arrowUtils';

/**
 * Overlay para mostrar badges de evaluación (motor) y conteo (explorador) 
 * sobre las flechas del tablero.
 */
export const ArrowEvalOverlay = React.memo(({ arrowsWithDelta, orientation }) => {
    if (!arrowsWithDelta?.length) return null;

    return (
        <div
            className="arrow-eval-overlay"
            style={{ width: '100%', height: '100%' }}
            aria-hidden="true"
        >
            {arrowsWithDelta.map((item) => {
                const coords = squareToPct(item.arrow.endSquare, orientation);
                if (!coords) return null;

                const hasEngineInfo = item.isEngineArrow && item.delta != null;
                const hasExplorerInfo = item.isExplorerArrow && item.count;

                return (
                    <React.Fragment key={`${item.arrow.startSquare}-${item.arrow.endSquare}-${item.isEngineArrow ? 'eng' : 'exp'}`}>
                        {/* 1. BADGE DE MOTOR (Delta de evaluación) */}
                        {hasEngineInfo && (() => {
                            const label = formatDelta(item.delta, item.mate);
                            if (!label) return null;

                            const isPositive = item.delta > 0;
                            const isNeutral = label === '=';
                            const isMate = item.mate != null;

                            let className = 'arrow-eval-badge';
                            if (isMate) className += ' badge--mate';
                            else if (isNeutral) className += ' badge--neutral';
                            else if (isPositive) className += ' badge--positive';
                            else className += ' badge--negative';

                            return (
                                <span
                                    className={className}
                                    style={{
                                        left: `calc(${coords.x}% + 8px)`,
                                        top: `calc(${coords.y}% - 16px)`,
                                    }}
                                >
                                    {label}
                                </span>
                            );
                        })()}

                        {/* 2. BADGE DE EXPLORADOR (Número de partidas) */}
                        {hasExplorerInfo && (
                            <span
                                className="arrow-eval-badge badge--explorer"
                                style={{
                                    left: `calc(${coords.x}% + 8px)`,
                                    // Si hay motor, bajamos el badge del explorador para que no solape
                                    top: hasEngineInfo ? `calc(${coords.y}% + 6px)` : `calc(${coords.y}% - 16px)`,
                                }}
                            >
                                {item.count}
                            </span>
                        )}
                    </React.Fragment>
                );
            })}
        </div>
    );
});