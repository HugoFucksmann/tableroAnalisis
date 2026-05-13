import { useEffect } from 'react';
import { useGameStore } from '../store/useGameStore';
import { analysisBridge } from '../services/analysisBridge';

export const useLiveEvaluation = () => {
    const fen = useGameStore(state => state.fen);
    const currentMoveIndex = useGameStore(state => state.currentMoveIndex);

    const setAnalyzing = useGameStore(state => state.setAnalyzing);
    const setEvaluation = useGameStore(state => state.setEvaluation);
    const setBestMoveForIndex = useGameStore(state => state.setBestMoveForIndex);
    const setAlternativeLinesForIndex = useGameStore(state => state.setAlternativeLinesForIndex);
    const explorerAnalysisEnabled = useGameStore(state => state.explorerAnalysisEnabled);
    const appMode = useGameStore(state => state.appMode);

    useEffect(() => {
        const state = useGameStore.getState();
        const hasEval = !!state.evaluationHistory[currentMoveIndex];
        const cachedLinesCount = state.alternativeLines?.[currentMoveIndex]?.length || 0;
        const targetMultiPv = state.engineConfig?.liveMultiPv || 3;
        const needsLiveAnalysis = !hasEval || cachedLinesCount < targetMultiPv;

        // Evitar interrumpir un análisis de partida completa en curso
        const isFullGameAnalysisRunning = state.isReviewRequested && !state.analysisReady;

        // Solo analizar si el usuario lo activó explícitamente (en cualquier modo)
        if (!explorerAnalysisEnabled) return;

        if (!needsLiveAnalysis || currentMoveIndex < -1 || isFullGameAnalysisRunning) return;

        let isActive = true;

        analysisBridge.analyzePosition(fen, currentMoveIndex, {
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
            analysisBridge.cancel();
        };
    }, [fen, currentMoveIndex, setEvaluation, setBestMoveForIndex, setAlternativeLinesForIndex, setAnalyzing, explorerAnalysisEnabled, appMode]);
};
