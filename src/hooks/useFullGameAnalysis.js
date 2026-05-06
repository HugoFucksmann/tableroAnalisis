import { useEffect, useRef } from 'react';
import { useGameStore } from '../store/useGameStore';
import { analysisBridge } from '../services/analysisBridge';
import { backendService } from '../services/backendService';

export const useFullGameAnalysis = () => {
    const gameId = useGameStore(state => state.gameId);
    const history = useGameStore(state => state.history);
    const hasPgnEvaluations = useGameStore(state => state.hasPgnEvaluations);
    const isReviewRequested = useGameStore(state => state.isReviewRequested);
    const game = useGameStore(state => state.game);
    const currentMoveIndex = useGameStore(state => state.currentMoveIndex);
    const lichessToken = useGameStore(state => state.lichessToken);

    const setAnalyzing = useGameStore(state => state.setAnalyzing);
    const setAnalysisProgress = useGameStore(state => state.setAnalysisProgress);
    const setAnalysisReady = useGameStore(state => state.setAnalysisReady);
    const setEvaluation = useGameStore(state => state.setEvaluation);
    const setMoveEvaluation = useGameStore(state => state.setMoveEvaluation);
    const setBestMoveForIndex = useGameStore(state => state.setBestMoveForIndex);
    const setAlternativeLinesForIndex = useGameStore(state => state.setAlternativeLinesForIndex);
    const setAccuracy = useGameStore(state => state.setAccuracy);
    const setEcoCode = useGameStore(state => state.setEcoCode);
    const setOpeningPly = useGameStore(state => state.setOpeningPly);
    const setOpeningDetected = useGameStore(state => state.setOpeningDetected);
    const setOpeningName = useGameStore(state => state.setOpeningName);

    const lastGameId = useRef(null);
    const historyRef = useRef(history);
    historyRef.current = history;

    useEffect(() => {
        if (!gameId || gameId === lastGameId.current) return;
        if (history.length === 0 || hasPgnEvaluations || !isReviewRequested) return;

        lastGameId.current = gameId;

        const pgnHeaders = game?.header?.() ?? {};

        analysisBridge.analyzeGame(historyRef.current, currentMoveIndex, {
            gameId,
            pgnHeaders,
            lichessToken,
            onStatus: setAnalyzing,
            onProgress: setAnalysisProgress,
            onOpeningDetected: ({ openingName, ecoCode, openingPly, bookPlies }) => {

                // CORRECCIÓN: Usar la función de Zustand para evitar sobrescribir datos de Stockfish
                bookPlies.forEach(ply => {
                    setMoveEvaluation(ply, 'Libro');
                });

                if (openingName) setOpeningName(openingName);
                if (ecoCode) setEcoCode(ecoCode);
                setOpeningPly(openingPly);
                setOpeningDetected(true);
            },
            onMoveResult: ({ index, score, mate, label, bestMove, lines }) => {
                if (score !== undefined) setEvaluation({ score, mate }, index);
                if (label) setMoveEvaluation(index, label);
                if (bestMove) setBestMoveForIndex(index, bestMove);
                if (lines?.length) setAlternativeLinesForIndex(index, lines);
            },
            onComplete: (accuracy) => {
                setAnalysisReady(true);
                setAnalyzing(false);
                setAccuracy(accuracy);
                // Refrescar lista de análisis para que aparezca en el historial y se marque en la importación
                backendService.getAnalyses();
            },
        });

        return () => analysisBridge.cancel();
    }, [gameId, hasPgnEvaluations, isReviewRequested]);
};