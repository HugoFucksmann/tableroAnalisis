import { useGameStore } from '../useGameStore';
import { useShallow } from 'zustand/react/shallow';

// Analysis State Selectors
export const useMoveEvaluations = () => useGameStore(state => state.moveEvaluations);

// Derived / Index-based Selectors
export const useCurrentMoveLines = () => useGameStore(state => state.alternativeLines[state.currentMoveIndex]);
export const useCurrentBestMove = () => useGameStore(state => state.bestMoves[state.currentMoveIndex]);
export const useCurrentEval = () => useGameStore(useShallow(state => state.evaluationHistory[state.currentMoveIndex]));

