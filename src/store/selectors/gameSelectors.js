import { useGameStore } from '../useGameStore';

// Game State Selectors
export const useFen = () => useGameStore(state => state.fen);
export const useHistory = () => useGameStore(state => state.history);
export const useCurrentMoveIndex = () => useGameStore(state => state.currentMoveIndex);
export const useBoardOrientation = () => useGameStore(state => state.boardOrientation);
export const usePlayers = () => useGameStore(state => state.players);
export const usePlayerElos = () => useGameStore(state => state.playerElos);
export const useClocks = () => useGameStore(state => state.clocks);
export const useArrows = () => useGameStore(state => state.arrows);

// Actions
export const useMakeMove = () => useGameStore(state => state.makeMove);
export const useGoToMove = () => useGameStore(state => state.goToMove);
