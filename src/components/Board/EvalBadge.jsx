import React from 'react';
import { EVAL_CONFIG } from '../../constants/chessConstants.jsx';
import './EvalBadge.css';

const BADGE_SIZE = 34;

/**
 * EvalBadgeOverlay — renders the move-quality badge on top of the board.
 *
 * Props:
 *  currentMoveIndex  number
 *  history           Move[]
 *  moveEvaluations   string[]
 *  orientation       'white' | 'black'
 */
export const EvalBadgeOverlay = ({
    currentMoveIndex,
    history,
    moveEvaluations,
    orientation,
}) => {
    const currentMove = currentMoveIndex >= 0 ? history[currentMoveIndex] : null;
    if (!currentMove) return null;

    const evalKey = moveEvaluations[currentMoveIndex];
    const evalData = EVAL_CONFIG[evalKey];
    if (!evalData) return null;

    // Board coordinate → CSS percentage
    let file = currentMove.to.charCodeAt(0) - 'a'.charCodeAt(0);
    let rank = parseInt(currentMove.to[1], 10) - 1;

    if (orientation === 'black') {
        file = 7 - file;
        rank = 7 - rank;
    }

    const leftPct = (file / 8) * 100;
    const topPct = ((7 - rank) / 8) * 100;

    return (
        <div className="eval-badge-overlay" aria-hidden="true">
            <div
                key={`${currentMoveIndex}-${evalKey}`}   // forces re-animation on change
                className="eval-badge"
                title={evalKey}
                style={{
                    left: `calc(${leftPct}% + (100% / 8) - ${BADGE_SIZE}px + 2px)`,
                    top: `calc(${topPct}% + 2px)`,
                    background: evalData.bg,
                    width: BADGE_SIZE,
                    height: BADGE_SIZE,
                }}
            >
                {evalData.icon}
            </div>
        </div>
    );
};