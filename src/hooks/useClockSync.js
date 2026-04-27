import { useEffect, useMemo } from 'react';
import { useGameStore } from '../store/useGameStore';

export const useClockSync = () => {
    const history = useGameStore(state => state.history);
    const pgnCommentsByIndex = useGameStore(state => state.pgnCommentsByIndex);
    const currentMoveIndex = useGameStore(state => state.currentMoveIndex);
    const setClocks = useGameStore(state => state.setClocks);

    const allClocks = useMemo(() => {
        if (history.length === 0 || !pgnCommentsByIndex) return { initial: {}, moves: [] };

        const movesClocks = new Array(history.length);
        let initialWhite = null, initialBlack = null;

        for (let i = 0; i < history.length; i++) {
            const c = pgnCommentsByIndex[i];
            if (c) {
                const match = c.match(/\[%clk\s+([^\]]+)\]/);
                if (match) {
                    if (history[i]?.color === 'w' && !initialWhite) initialWhite = match[1];
                    if (history[i]?.color === 'b' && !initialBlack) initialBlack = match[1];
                }
            }
        }

        let lastWhite = initialWhite, lastBlack = initialBlack;
        for (let i = 0; i < history.length; i++) {
            const comment = pgnCommentsByIndex[i];
            if (comment) {
                const match = comment.match(/\[%clk\s+([^\]]+)\]/);
                if (match) {
                    if (history[i]?.color === 'w') lastWhite = match[1];
                    else lastBlack = match[1];
                }
            }
            movesClocks[i] = { white: lastWhite, black: lastBlack };
        }

        return { initial: { white: initialWhite, black: initialBlack }, moves: movesClocks };
    }, [history, pgnCommentsByIndex]);

    useEffect(() => {
        if (!allClocks.moves || allClocks.moves.length === 0) return;
        const current = currentMoveIndex >= 0 ? allClocks.moves[currentMoveIndex] : allClocks.initial;
        setClocks(current?.white || null, current?.black || null);
    }, [currentMoveIndex, allClocks, setClocks]);
};
