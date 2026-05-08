import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { createGameSlice } from './slices/gameSlice';
import { createAnalysisSlice } from './slices/analysisSlice';
import { createUISlice } from './slices/uiSlice';
import { createLibrarySlice } from './slices/librarySlice';

export const useGameStore = create(
  persist(
    (...a) => ({
      ...createGameSlice(...a),
      ...createAnalysisSlice(...a),
      ...createUISlice(...a),
      ...createLibrarySlice(...a),
    }),
    {
      name: 'game-storage',
      partialize: (state) => ({
        // UI preferences
        boardOrientation: state.boardOrientation,
        engineConfig: state.engineConfig,
        // Library — search preferences only (not the game list itself)
        searchUsername: state.searchUsername,
        searchPlatform: state.searchPlatform,
        lichessToken: state.lichessToken,
      }),
    }
  )
);