import { useEffect } from 'react';
import { useGameStore } from '../store/useGameStore';
import { analysisQueue } from '../services/analysisQueue';

export const useLiveAnalysis = () => {
    const fen = useGameStore(state => state.fen);
    const currentMoveIndex = useGameStore(state => state.currentMoveIndex);

    const setAnalyzing = useGameStore(state => state.setAnalyzing);
    const setEvaluation = useGameStore(state => state.setEvaluation);
    const setBestMoveForIndex = useGameStore(state => state.setBestMoveForIndex);
    const setAlternativeLinesForIndex = useGameStore(state => state.setAlternativeLinesForIndex);

    useEffect(() => {
        const state = useGameStore.getState();
        const hasEval = !!state.evaluationHistory[currentMoveIndex];
        const cachedLinesCount = state.alternativeLines?.[currentMoveIndex]?.length || 0;
        const targetMultiPv = state.engineConfig?.liveMultiPv || 3;
        const needsLiveAnalysis = !hasEval || cachedLinesCount < targetMultiPv;

        console.log('needsLiveAnalysis:', needsLiveAnalysis, 'cached:', cachedLinesCount, 'target:', targetMultiPv);
        if (!needsLiveAnalysis || currentMoveIndex < -1) return;

        let isActive = true;

        analysisQueue.analyzeCurrentPosition(fen, currentMoveIndex, {
            onStatus: setAnalyzing,
            onResult: (result) => {
                if (!isActive) return;
                if (result.score !== undefined) setEvaluation({ score: result.score, mate: result.mate }, result.moveIndex);
                if (result.bestMove) setBestMoveForIndex(result.moveIndex, result.bestMove);

                if (result.lines?.length) setAlternativeLinesForIndex(result.moveIndex, result.lines);
            },
        });

        return () => {
            isActive = false;
            analysisQueue.cancel();
        };
    }, [fen, currentMoveIndex, setEvaluation, setBestMoveForIndex, setAlternativeLinesForIndex, setAnalyzing]);
};

