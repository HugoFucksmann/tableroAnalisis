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
        // BUG BAJO SOLUCIONADO: Se persiste appMode para evitar confusión de UI al recargar
        appMode: state.appMode,
        // Library — search preferences only
        searchUsername: state.searchUsername,
        searchPlatform: state.searchPlatform,
        lichessToken: state.lichessToken,
      }),
    }
  )
);