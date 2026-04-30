import React from 'react';
import './ArrowEvalOverlay.css';

import { squareToPct } from '../../utils/boardUtils';
import { formatDelta } from '../../utils/arrowUtils';

export const ArrowEvalOverlay = React.memo(({ arrowsWithDelta, orientation }) => {
    if (!arrowsWithDelta?.length) return null;

    return (
        <div
            className="arrow-eval-overlay"
            style={{ width: '100%', height: '100%' }}
            aria-hidden="true"
        >
            {arrowsWithDelta.map((item, i) => {
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