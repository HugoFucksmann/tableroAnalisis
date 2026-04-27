import { useState } from 'react';

export const useBoardInteraction = (makeMove) => {
    const [promotionMove, setPromotionMove] = useState(null);

    function onDrop(arg1, arg2, arg3) {
        const sourceSquare = typeof arg1 === 'object' ? arg1.sourceSquare : arg1;
        const targetSquare = typeof arg1 === 'object' ? arg1.targetSquare : arg2;
        const piece = typeof arg1 === 'object' ? arg1.piece : arg3;

        if (!targetSquare || sourceSquare === targetSquare) return false;

        const isPawn = piece ? piece[1] === 'P' : true;
        const isPromotionRank = targetSquare[1] === '8' || targetSquare[1] === '1';

        if (isPawn && isPromotionRank) {
            setPromotionMove({ from: sourceSquare, to: targetSquare });
            return false;
        }

        return makeMove({ from: sourceSquare, to: targetSquare, promotion: 'q' }) !== null;
    }

    function onPromotionPieceSelect(piece) {
        if (piece && promotionMove) {
            const promPiece = piece[1].toLowerCase();
            makeMove({ ...promotionMove, promotion: promPiece });
        }
        setPromotionMove(null);
        return true;
    }

    return { onDrop, onPromotionPieceSelect, promotionMove, setPromotionMove };
};
