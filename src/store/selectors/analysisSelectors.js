import { useGameStore } from '../useGameStore';
import { useShallow } from 'zustand/react/shallow';

// Analysis State Selectors
export const useMoveEvaluations = () => useGameStore(state => state.moveEvaluations);
export const useIsAnalyzing = () => useGameStore(state => state.isAnalyzing);
export const useAnalysisProgress = () => useGameStore(state => state.analysisProgress);
export const useAnalysisReady = () => useGameStore(state => state.analysisReady);
export const useGameId = () => useGameStore(state => state.gameId);
export const useLichessToken = () => useGameStore(state => state.lichessToken);
export const useIsAnalyzeFromPgn = () => useGameStore(state => state.isAnalyzeFromPgn);
export const useWantsFullAnalysis = () => useGameStore(state => state.wantsFullAnalysis);
export const usePgnCommentsByIndex = () => useGameStore(state => state.pgnCommentsByIndex);

// Derived / Index-based Selectors
export const useCurrentMoveLines = () => useGameStore(state => state.alternativeLines[state.currentMoveIndex]);
export const useCurrentBestMove = () => useGameStore(state => state.bestMoves[state.currentMoveIndex]);
export const useCurrentEval = () => useGameStore(useShallow(state => state.evaluationHistory[state.currentMoveIndex]));
export const useCurrentMoveEvaluation = () => useGameStore(state => state.moveEvaluations[state.currentMoveIndex]);

// Analysis Actions
export const useAnalysisActions = () => useGameStore(useShallow(state => ({
    setAnalyzing: state.setAnalyzing,
    setAnalysisProgress: state.setAnalysisProgress,
    setAnalysisReady: state.setAnalysisReady,
    setEvaluation: state.setEvaluation,
    setEvaluationDirect: state.setEvaluationDirect,
    setMoveEvaluation: state.setMoveEvaluation,
    setBestMoveForIndex: state.setBestMoveForIndex,
    setAlternativeLinesForIndex: state.setAlternativeLinesForIndex,
    setGameScore: state.setGameScore,
    setEcoCode: state.setEcoCode,
    setOpeningPly: state.setOpeningPly,
    setOpeningDetected: state.setOpeningDetected,
    setOpeningName: state.setOpeningName,
    setClocks: state.setClocks,
})));
