/**
 * librarySlice — "Game Library" centralized state.
 *
 * Responsabilidad única: todo lo relacionado a la librería de partidas
 * importadas desde plataformas externas y su estado de selección múltiple.
 *
 * Migrado desde: uiSlice (importedGames, searchUsername, searchPlatform, lichessToken)
 *                analysisSlice (analyses, setAnalyses, appendAnalyses, removeAnalyses)
 */
export const createLibrarySlice = (set, get) => ({
  // ── Search & Fetch ──────────────────────────────────────────────
  searchUsername: 'elcolof',
  searchPlatform: 'lichess',
  lichessToken: import.meta.env.VITE_TOKEN_LICHESS || '',

  // Lista de partidas traidas de la API (Lichess / Chess.com)
  importedGames: [],

  // Paginación por plataforma
  lastTimestamp: null,       // Lichess cursor
  chesscomPagination: null,  // Chess.com cursor
  hasMoreGames: false,

  // ── Multi-selection ─────────────────────────────────────────────
  // Stored as array for Zustand persist compatibility (Sets no son serializables)
  selectedGameIds: [],

  // ── Analyses cache (objetos completos — para StatsDashboard/HistoryListView) ──
  analyses: [],

  // ── Analysed IDs (solo gameIds — para marcar badges en GameImport) ──────────
  // Array liviano de strings, sin objetos, sin LIMIT. Fuente: get_analysed_ids.
  analysedGameIds: [],

  // ── Batch progress ──────────────────────────────────────────────
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
      // Use the lightweight analysedGameIds for filtering — no LIMIT issue
      const analysedSet = new Set(state.analysedGameIds);
      const unanalysed = state.importedGames.filter((g) => !analysedSet.has(String(g.id)));

      // Priorizar partidas no analizadas. Si no hay ninguna nueva, seleccionar todas.
      const targetGames = unanalysed.length > 0 ? unanalysed : state.importedGames;
      return { selectedGameIds: targetGames.map((g) => g.id) };
    }),

  clearSelection: () => set({ selectedGameIds: [] }),

  isGameSelected: (id) => get().selectedGameIds.includes(id),

  // ── Actions: Analyses cache (objetos completos — StatsDashboard/HistoryListView) ──
  setAnalyses: (v) =>
    set((state) => ({ analyses: typeof v === 'function' ? v(state.analyses) : v })),

  appendAnalyses: (v) =>
    set((state) => ({ analyses: [...state.analyses, ...v] })),

  removeAnalyses: (ids) =>
    set((state) => ({ analyses: state.analyses.filter((a) => !ids.includes(a.id)) })),

  // ── Actions: Analysed IDs (liviano — solo para badges en GameImport) ─────────
  setAnalysedGameIds: (ids) =>
    set({ analysedGameIds: Array.isArray(ids) ? ids.map(String) : [] }),

  addAnalysedGameId: (gameId) =>
    set((state) => {
      const id = String(gameId);
      if (state.analysedGameIds.includes(id)) return state;
      return { analysedGameIds: [...state.analysedGameIds, id] };
    }),

  removeAnalysedGameIds: (gameIds) =>
    set((state) => {
      const toRemove = new Set(gameIds.map(String));
      return { analysedGameIds: state.analysedGameIds.filter((id) => !toRemove.has(id)) };
    }),

  // Mark a game as analyzed: updates both badge Set and (optionally) the full history cache.
  markGameAnalyzed: (gameId, analysisEntry = null) =>
    set((state) => {
      const id = String(gameId);
      const updates = {};

      if (!state.analysedGameIds.includes(id)) {
        updates.analysedGameIds = [...state.analysedGameIds, id];
      }

      if (analysisEntry) {
        const already = state.analyses.some((a) => String(a.gameId) === id);
        if (!already) {
          updates.analyses = [...state.analyses, analysisEntry];
        }
      }

      return Object.keys(updates).length ? updates : state;
    }),

  // ── Actions: Batch ───────────────────────────────────────────────
  setBatchStatus: (status) => set({ batchStatus: status }),
});
