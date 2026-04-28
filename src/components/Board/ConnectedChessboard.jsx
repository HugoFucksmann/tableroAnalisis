import React from 'react';
import { Chessboard } from 'react-chessboard';
import { ArrowEvalOverlay } from './ArrowEvalOverlay';
import { useBoardArrows } from './hooks';
import { getActiveColor } from '../../utils/boardUtils';
import { useArrows } from '../../store/selectors/gameSelectors';
import {
    useCurrentMoveLines, useCurrentBestMove, useCurrentEval
} from '../../store/selectors/analysisSelectors';

export const ConnectedChessboard = React.memo(({
    fen,
    boardOrientation,
    squareStyles,
    promotionMove,
    onDrop,
    onPromotionPieceSelect
}) => {
    const currentLines = useCurrentMoveLines();
    const currentBestMove = useCurrentBestMove();
    const currentEval = useCurrentEval();
    const arrows = useArrows();
    const activeColor = React.useMemo(() => getActiveColor(fen), [fen]);

    const { combinedArrows, arrowsWithDelta } = useBoardArrows(
        currentLines,
        currentBestMove,
        currentEval,
        arrows,
        activeColor
    );

    console.log('[ConnectedChessboard] Render - lines:', currentLines?.length, 'arrows:', combinedArrows?.length);

    return (
        <>
            <Chessboard
                options={{
                    position: fen,
                    onPieceDrop: onDrop,
                    boardOrientation: boardOrientation,
                    darkSquareStyle: { backgroundColor: '#292524' },
                    lightSquareStyle: { backgroundColor: '#57534e' },
                    arrows: combinedArrows,
                    squareStyles: squareStyles,
                    animationDurationInMs: 180,
                }}
                promotionToSquare={promotionMove?.to ?? null}
                onPromotionPieceSelect={onPromotionPieceSelect}
            />

            <ArrowEvalOverlay
                arrowsWithDelta={arrowsWithDelta}
                orientation={boardOrientation}
            />
        </>
    );
});
