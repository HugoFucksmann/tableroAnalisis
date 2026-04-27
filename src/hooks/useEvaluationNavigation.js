import { useEffect } from 'react';
import { useGameStore } from '../store/useGameStore';

export const useEvaluationNavigation = () => {
    const currentMoveIndex = useGameStore(state => state.currentMoveIndex);
    const setEvaluationDirect = useGameStore(state => state.setEvaluationDirect);

    useEffect(() => {
        if (currentMoveIndex < -1) return;
        // Leemos el store actual sin suscribirnos a todos los cambios de evaluación
        const cached = useGameStore.getState().evaluationHistory[currentMoveIndex];
        if (cached) {
            setEvaluationDirect({ score: cached.score, mate: cached.mate ?? null });
        }
    }, [currentMoveIndex, setEvaluationDirect]);
};
