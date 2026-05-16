import { useEffect, useRef } from 'react';

export const useBoardNavigation = (boardRef, currentMoveIndex, historyLength, goToMove) => {
    const scrollState = useRef({ currentMoveIndex, maxIndex: historyLength - 1 });

    useEffect(() => {
        scrollState.current = { currentMoveIndex, maxIndex: historyLength - 1 };
    }, [currentMoveIndex, historyLength]);

    useEffect(() => {
        const el = boardRef.current;
        if (!el) return;

        let lastScrollTime = 0;

        const handleWheel = (e) => {
            const now = performance.now();
            if (now - lastScrollTime < 60) return;

            const { currentMoveIndex: currentIdx, maxIndex } = scrollState.current;

            if (e.deltaY > 0) {
                if (currentIdx < maxIndex) {
                    goToMove(currentIdx + 1);
                    lastScrollTime = now;
                }
            }
            else if (e.deltaY < 0) {
                if (currentIdx > -1) {
                    goToMove(currentIdx - 1);
                    lastScrollTime = now;
                }
            }
        };

        el.addEventListener('wheel', handleWheel, { passive: true });
        return () => el.removeEventListener('wheel', handleWheel);
    }, [goToMove, boardRef]);
};
