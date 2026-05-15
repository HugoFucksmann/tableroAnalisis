
export const createLibrarySlice = (set, get) => ({

  searchUsername: 'elcolof',
  searchPlatform: 'lichess',
  lichessToken: import.meta.env.VITE_TOKEN_LICHESS || '',


  importedGames: [],


  lastTimestamp: null,       // Lichess cursor
  chesscomPagination: null,  // Chess.com cursor
  hasMoreGames: false,



  selectedGameIds: [],


  analyses: [],


  batchStatus: null, // null | { current, total, label }

  // ── Actions: Search ─────────────────────────────────────────────
  setSearchUsername: (username) => set({ searchUsername: username }),
  setSearchPlatform: (platform) => set({ searchPlatform: platform }),
  setLichessToken: (token) => set({ lichessToken: token }),

  // ── Actions: Games ───────────────────────────────────────────────
  setImportedGames: (games) =>
    set((state) => ({
      importedGames: typeof games === 'function' ? games(state.importedGames) : games,
    })),

  appendImportedGames: (games) =>
    set((state) => ({ importedGames: [...state.importedGames, ...games] })),

  setPagination: ({ lastTimestamp, chesscomPagination, hasMoreGames }) =>
    set({ lastTimestamp, chesscomPagination, hasMoreGames }),

  resetGames: () =>
    set({
      importedGames: [],
      lastTimestamp: null,
      chesscomPagination: null,
      hasMoreGames: false,
      selectedGameIds: [],
    }),

  // ── Actions: Multi-selection ─────────────────────────────────────
  toggleGameSelection: (id) =>
    set((state) => {
      const ids = new Set(state.selectedGameIds);
      if (ids.has(id)) ids.delete(id);
      else ids.add(id);
      return { selectedGameIds: Array.from(ids) };
    }),

  selectAllGames: () =>
    set((state) => {
      const analysedIds = new Set(state.analyses.map((a) => String(a.gameId)));
      const unanalysed = state.importedGames.filter((g) => !analysedIds.has(String(g.id)));

      // Priorizar partidas no analizadas. Si no hay ninguna nueva, seleccionar todas.
      const targetGames = unanalysed.length > 0 ? unanalysed : state.importedGames;
      return { selectedGameIds: targetGames.map((g) => g.id) };
    }),

  clearSelection: () => set({ selectedGameIds: [] }),

  isGameSelected: (id) => get().selectedGameIds.includes(id),

  // ── Actions: Analyses cache ──────────────────────────────────────
  setAnalyses: (v) =>
    set((state) => ({ analyses: typeof v === 'function' ? v(state.analyses) : v })),

  appendAnalyses: (v) =>
    set((state) => ({ analyses: [...state.analyses, ...v] })),

  removeAnalyses: (ids) =>
    set((state) => ({ analyses: state.analyses.filter((a) => !ids.includes(a.id)) })),

  // Mark a game as analyzed in the local cache (avoids full refetch)
  markGameAnalyzed: (gameId, analysisEntry) =>
    set((state) => {
      const already = state.analyses.some((a) => String(a.gameId) === String(gameId));
      if (already) return state;
      return { analyses: [...state.analyses, analysisEntry] };
    }),

  // ── Actions: Batch ───────────────────────────────────────────────
  setBatchStatus: (status) => set({ batchStatus: status }),
});
