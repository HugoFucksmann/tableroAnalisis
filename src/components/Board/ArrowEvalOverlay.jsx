import React from 'react';
import './ArrowEvalOverlay.css';

/**
 * Convierte una casilla ("e4") a porcentajes (0% a 100%).
 * Cada casilla mide 12.5%. Centramos sumando 6.25%.
 */
function squareToPct(square, orientation) {
    if (!square || square.length < 2) return null;

    const file = square.charCodeAt(0) - 97; // a=0 … h=7
    const rank = parseInt(square[1], 10) - 1; // 1=0 … 8=7

    let col = file;
    let row = 7 - rank;

    if (orientation === 'black') {
        col = 7 - file;
        row = rank;
    }

    return {
        x: (col * 12.5) + 6.25,
        y: (row * 12.5) + 6.25,
    };
}

function formatDelta(delta, mate) {
    if (mate != null) {
        return mate > 0 ? `M${mate}` : `-M${Math.abs(mate)}`;
    }
    if (delta == null || isNaN(delta)) return null;

    const abs = Math.abs(delta);
    if (abs < 0.05) return '=';
    const sign = delta > 0 ? '+' : '−';
    return `${sign}${abs.toFixed(1)}`;
}

export const ArrowEvalOverlay = React.memo(({ arrowsWithDelta, orientation }) => {
    if (!arrowsWithDelta?.length) return null;

    return (
        <div
            className="arrow-eval-overlay"
            // Ocupamos el 100% del padre. ¡Sin calcular píxeles!
            style={{ width: '100%', height: '100%' }}
            aria-hidden="true"
        >
            {arrowsWithDelta.map((item, i) => {
                // Validación para evitar errores si no hay delta
                if (!item.isEngineArrow || item.delta == null) return null;

                const coords = squareToPct(item.arrow.endSquare, orientation);
                if (!coords) return null;

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
                        key={`${item.arrow.endSquare}-${i}`}
                        className={className}
                        style={{
                            // Posicionamiento perfecto con porcentajes
                            left: `calc(${coords.x}% + 6px)`,
                            top: `calc(${coords.y}% - 14px)`,
                        }}
                    >
                        {label}
                    </span>
                );
            })}
        </div>
    );
});