import { useEffect, useRef } from 'react';

export const useBoardNavigation = (boardRef, currentMoveIndex, historyLength, goToMove) => {

    const scrollState = useRef({ currentMoveIndex, maxIndex: historyLength - 1, goToMove });

    useEffect(() => {
        scrollState.current = { currentMoveIndex, maxIndex: historyLength - 1, goToMove };
    }, [currentMoveIndex, historyLength, goToMove]);

    useEffect(() => {
        const el = boardRef.current;
        if (!el) return;

        let lastScrollTime = 0;

        const handleWheel = (e) => {
            e.preventDefault();

            const now = performance.now();
            if (now - lastScrollTime < 60) return;

            // Extraemos la versión más reciente de la función goToMove desde la referencia
            const { currentMoveIndex: currentIdx, maxIndex, goToMove: currentGoToMove } = scrollState.current;

            if (e.deltaY > 0) {
                if (currentIdx < maxIndex) {
                    currentGoToMove(currentIdx + 1);
                    lastScrollTime = now;
                }
            }
            else if (e.deltaY < 0) {
                if (currentIdx > -1) {
                    currentGoToMove(currentIdx - 1);
                    lastScrollTime = now;
                }
            }
        };

        el.addEventListener('wheel', handleWheel, { passive: false });
        return () => el.removeEventListener('wheel', handleWheel);
    }, [boardRef]);
    // Dependencia limpia: solo re-evalúa si el elemento del DOM (boardRef) cambia
};