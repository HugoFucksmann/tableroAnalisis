import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { createGameSlice } from './slices/gameSlice';
import { createAnalysisSlice } from './slices/analysisSlice';
import { createUISlice } from './slices/uiSlice';

export const useGameStore = create(
  persist(
    (...a) => ({
      ...createGameSlice(...a),
      ...createAnalysisSlice(...a),
      ...createUISlice(...a),
    }),
    {
      name: 'game-storage',
      partialize: (state) => ({
        searchUsername: state.searchUsername,
        searchPlatform: state.searchPlatform,
        lichessToken: state.lichessToken,
        boardOrientation: state.boardOrientation,
        engineType: state.engineType,
      }),
    }
  )
);