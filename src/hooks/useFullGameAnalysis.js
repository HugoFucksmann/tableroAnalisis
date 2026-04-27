import { useEffect, useRef } from 'react';
import { useGameStore } from '../store/useGameStore';
import { analysisQueue } from '../services/analysisQueue';

export const useFullGameAnalysis = () => {
    const gameId = useGameStore(state => state.gameId);
    const history = useGameStore(state => state.history);
    const isAnalyzeFromPgn = useGameStore(state => state.isAnalyzeFromPgn);
    const wantsFullAnalysis = useGameStore(state => state.wantsFullAnalysis);
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
    const setGameScore = useGameStore(state => state.setGameScore);
    const setEcoCode = useGameStore(state => state.setEcoCode);
    const setOpeningPly = useGameStore(state => state.setOpeningPly);
    const setOpeningDetected = useGameStore(state => state.setOpeningDetected);
    const setOpeningName = useGameStore(state => state.setOpeningName);

    const lastGameId = useRef(null);
    const historyRef = useRef(history);
    historyRef.current = history;

    useEffect(() => {
        if (!gameId || gameId === lastGameId.current) return;
        if (history.length === 0 || isAnalyzeFromPgn || !wantsFullAnalysis) return;

        lastGameId.current = gameId;

        const pgnHeaders = game?.header?.() ?? {};

        analysisQueue.analyzeGame(historyRef.current, currentMoveIndex, {
            gameId,
            pgnHeaders,
            lichessToken,
            onStatus: setAnalyzing,
            onProgress: setAnalysisProgress,
            onOpeningDetected: ({ openingName, ecoCode, openingPly, bookPlies }) => {
                const currentEvals = useGameStore.getState().moveEvaluations;
                const batchEvals = { ...currentEvals };
                bookPlies.forEach(ply => { batchEvals[ply] = 'Libro'; });
                useGameStore.setState({ moveEvaluations: batchEvals });
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
                setGameScore(accuracy);
            },
        });

        return () => analysisQueue.cancel();
    }, [gameId, isAnalyzeFromPgn, wantsFullAnalysis]);
};
