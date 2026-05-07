import { useEffect, useRef } from 'react';
import { useGameStore } from '../store/useGameStore';
import { analysisBridge } from '../services/analysisBridge';
import { backendService } from '../services/backendService';

export const useFullGameAnalysis = () => {
    const gameId           = useGameStore(state => state.gameId);
    const history          = useGameStore(state => state.history);
    const hasPgnEvaluations   = useGameStore(state => state.hasPgnEvaluations);
    const isReviewRequested   = useGameStore(state => state.isReviewRequested);
    const analysisRequestId   = useGameStore(state => state.analysisRequestId);
    const game             = useGameStore(state => state.game);
    const currentMoveIndex = useGameStore(state => state.currentMoveIndex);
    const lichessToken     = useGameStore(state => state.lichessToken);
    const playerColor      = useGameStore(state => state.playerColor);

    const setAnalyzing             = useGameStore(state => state.setAnalyzing);
    const setAnalysisProgress      = useGameStore(state => state.setAnalysisProgress);
    const setAnalysisReady         = useGameStore(state => state.setAnalysisReady);
    const setEvaluation            = useGameStore(state => state.setEvaluation);
    const setMoveEvaluation        = useGameStore(state => state.setMoveEvaluation);
    const setBestMoveForIndex      = useGameStore(state => state.setBestMoveForIndex);
    const setAlternativeLinesForIndex = useGameStore(state => state.setAlternativeLinesForIndex);
    const setAccuracy              = useGameStore(state => state.setAccuracy);
    const setEcoCode               = useGameStore(state => state.setEcoCode);
    const setOpeningPly            = useGameStore(state => state.setOpeningPly);
    const setOpeningDetected       = useGameStore(state => state.setOpeningDetected);
    const setOpeningName           = useGameStore(state => state.setOpeningName);

    // historyRef evita que el closure capture una historia obsoleta.
    const historyRef = useRef(history);
    historyRef.current = history;

    useEffect(() => {
        // analysisRequestId es null si nunca se pidió análisis.
        // Cambia con cada click en "Analizar", disparando este efecto.
        if (!analysisRequestId) return;
        if (!gameId || history.length === 0 || hasPgnEvaluations || !isReviewRequested) return;

        const pgnHeaders = game?.header?.() ?? {};

        analysisBridge.analyzeGame(historyRef.current, currentMoveIndex, {
            gameId,
            pgnHeaders,
            playerColor,
            lichessToken,
            onStatus:   setAnalyzing,
            onProgress: setAnalysisProgress,
            onOpeningDetected: ({ openingName, ecoCode, openingPly, bookPlies }) => {
                bookPlies.forEach(ply => setMoveEvaluation(ply, 'Libro'));
                if (openingName) setOpeningName(openingName);
                if (ecoCode)     setEcoCode(ecoCode);
                setOpeningPly(openingPly);
                setOpeningDetected(true);
            },
            onMoveResult: ({ index, score, mate, label, bestMove, lines }) => {
                if (score !== undefined) setEvaluation({ score, mate }, index);
                if (label)              setMoveEvaluation(index, label);
                if (bestMove)           setBestMoveForIndex(index, bestMove);
                if (lines?.length)      setAlternativeLinesForIndex(index, lines);
            },
            onComplete: (accuracy) => {
                setAnalysisReady(true);
                setAnalyzing(false);
                setAccuracy(accuracy);
                backendService.getAnalyses();
            },
        });

        // Sin cleanup de cancel: un re-render durante el análisis NO debe
        // interrumpirlo. El usuario cancela explícitamente con el botón.
    }, [analysisRequestId]); // eslint-disable-line react-hooks/exhaustive-deps
};