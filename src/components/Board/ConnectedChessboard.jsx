import React from 'react';
import { Chessboard } from 'react-chessboard';
import { ArrowEvalOverlay } from './ArrowEvalOverlay';
import { useBoardArrows } from './hooks/useBoardArrows';
import { getActiveColor } from '../../utils/boardUtils';
import { useArrows } from '../../store/selectors/gameSelectors';
import {
    useCurrentMoveLines, useCurrentBestMove, useCurrentEval
} from '../../store/selectors/analysisSelectors';
import { useGameStore } from '../../store/useGameStore';
import { useShallow } from 'zustand/react/shallow';

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
    const { explorerMode, explorerData, game, playerColor, hoveredExplorerMove, mastersData } = useGameStore(useShallow(state => ({
        explorerMode: state.explorerMode,
        explorerData: state.explorerData,
        game: state.game,
        playerColor: state.playerColor,
        hoveredExplorerMove: state.hoveredExplorerMove,
        mastersData: state.mastersData
    })));

    const { combinedArrows, arrowsWithDelta } = useBoardArrows(
        currentLines,
        currentBestMove,
        currentEval,
        arrows,
        activeColor,
        explorerMode,
        explorerData,
        game,
        playerColor,
        hoveredExplorerMove,
        mastersData
    );



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
