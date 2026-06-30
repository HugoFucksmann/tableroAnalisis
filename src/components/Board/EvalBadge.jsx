import React from 'react';
import { EVAL_CONFIG } from '../../constants/chessConstants.jsx';
import { useGameStore } from '../../store/useGameStore';
import './EvalBadge.css';

const BADGE_SIZE = 26;

import { useCurrentMoveIndex, useHistory, useBoardOrientation } from '../../store/selectors/gameSelectors';
import { useMoveEvaluations } from '../../store/selectors/analysisSelectors';

export const EvalBadgeOverlay = () => {
    const currentMoveIndex = useCurrentMoveIndex();
    const history = useHistory();
    const orientation = useBoardOrientation();
    const moveEvaluations = useMoveEvaluations();
    const isAnalyzing = useGameStore(state => state.isAnalyzing);

    const currentMove = currentMoveIndex >= 0 ? history[currentMoveIndex] : null;
    if (!currentMove) return null;

    const evalKey = moveEvaluations[currentMoveIndex];
    const isLoading = isAnalyzing && !evalKey;

    if (!evalKey && !isLoading) return null;

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
            {isLoading ? (
                <div
                    key={`${currentMoveIndex}-loading`}
                    className="eval-badge eval-badge-loading"
                    style={{
                        left: `calc(${leftPct}% + (100% / 8) - ${BADGE_SIZE}px + 2px)`,
                        top: `calc(${topPct}% + 2px)`,
                        width: BADGE_SIZE,
                        height: BADGE_SIZE,
                    }}
                >
                    <span className="eval-badge-spinner"></span>
                </div>
            ) : (
                <div
                    key={`${currentMoveIndex}-${evalKey}`}
                    className="eval-badge"
                    title={evalKey}
                    style={{
                        left: `calc(${leftPct}% + (100% / 8) - ${BADGE_SIZE}px + 2px)`,
                        top: `calc(${topPct}% + 2px)`,
                        background: EVAL_CONFIG[evalKey]?.bg,
                        width: BADGE_SIZE,
                        height: BADGE_SIZE,
                    }}
                >
                    {EVAL_CONFIG[evalKey]?.icon}
                </div>
            )}
        </div>
    );
};