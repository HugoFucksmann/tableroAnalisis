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
                // Batch opening updates
                useGameStore.setState((state) => ({
                    openingName: openingName || 'Unknown',
                    ecoCode: ecoCode || '',
                    openingPly,
                    openingDetected: true,
                    moveEvaluations: {
                        ...state.moveEvaluations,
                        ...Object.fromEntries(bookPlies.map(ply => [ply, 'Libro']))
                    }
                }));
            },
            onMoveResult: ({ index, score, mate, label, bestMove, lines, errorTimeClass }) => {
                // Batch move results
                useGameStore.setState((state) => {
                    const updates = {};
                    if (score !== undefined) {
                        const normalized = { score, mate };
                        updates.evaluationHistory = {
                            ...state.evaluationHistory,
                            [index]: { moveIndex: index, ...normalized }
                        };
                        if (index === state.currentMoveIndex) {
                            updates.evaluation = normalized;
                        }
                    }
                    if (label) {
                        updates.moveEvaluations = {
                            ...state.moveEvaluations,
                            [index]: label
                        };
                    }
                    if (errorTimeClass) {
                        updates.errorTimeClasses = {
                            ...state.errorTimeClasses,
                            [index]: errorTimeClass
                        };
                    }
                    if (bestMove) {
                        updates.bestMoves = {
                            ...state.bestMoves,
                            [index]: bestMove
                        };
                    }
                    if (lines?.length) {
                        updates.alternativeLines = {
                            ...state.alternativeLines,
                            [index]: lines
                        };
                    }
                    return updates;
                });
            },
            onComplete: (accuracy, accuracyByPhase, win) => {
                useGameStore.setState({
                    analysisReady: true,
                    isAnalyzing: false,
                    accuracy,
                    accuracyByPhase,
                    gameResult: win !== undefined ? win : null,
                });
                backendService.getAnalyses();
            },
        });

        // Sin cleanup de cancel: un re-render durante el análisis NO debe
        // interrumpirlo. El usuario cancela explícitamente con el botón.
    }, [analysisRequestId]); // eslint-disable-line react-hooks/exhaustive-deps
};