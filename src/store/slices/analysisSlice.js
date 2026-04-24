/**
 * analysisSlice.js  v4
 *
 * Cambios:
 *  - analysisReady: boolean — true cuando el análisis completo terminó.
 *  - alternativeLines: { [moveIndex]: lines[] } — líneas MultiPV por posición
 *  - ecoCode, openingPly, openingDetected — metadatos de apertura estructurados
 *  - engineConfig: { depth, multiPv, threads, hash } — configuración unificada del motor
 */

export const createAnalysisSlice = (set, get) => ({
  // ── Evaluación ──────────────────────────────────────────────────────────────
  evaluation: 0,
  evaluationHistory: [],   // [{ moveIndex, score }]
  moveEvaluations: {},   // { [moveIndex]: 'Excelente' | 'Libro' | ... }
  bestMoves: {},   // { [moveIndex]: 'e2e4' }
  alternativeLines: {},   // { [moveIndex]: [{ multipv, score, mate, pv, move }] }

  // ── Estado del análisis ─────────────────────────────────────────────────────
  isAnalyzing: false,
  analysisProgress: 0,
  analysisReady: false, // ← true cuando el análisis completo terminó
  gameScore: null,  // { white: number, black: number }

  // ── Apertura ─────────────────────────────────────────────────────────────────
  ecoCode: '',     // 'B20'
  openingPly: -1,     // último ply considerado book (-1 = sin datos)
  openingDetected: false,

  engineConfig: {
    depth: 18,
    multiPv: 1,
    liveDepth: 16,
    liveMultiPv: 3,
    threads: 2,
    hash: 32,
  },

  // ── Setters de evaluación ───────────────────────────────────────────────────
  setEvaluation: (score, moveIndex) => {
    const state = get();
    const idx = moveIndex !== undefined ? moveIndex : state.currentMoveIndex;
    const existing = state.evaluationHistory.findIndex(e => e.moveIndex === idx);
    let newHistory;

    if (existing >= 0) {
      newHistory = [...state.evaluationHistory];
      newHistory[existing] = { moveIndex: idx, score };
    } else {
      newHistory = [
        ...state.evaluationHistory,
        { moveIndex: idx, score },
      ].sort((a, b) => a.moveIndex - b.moveIndex);
    }

    set({
      evaluation: idx === state.currentMoveIndex ? score : state.evaluation,
      evaluationHistory: newHistory,
    });
  },

  setMoveEvaluation: (index, type) =>
    set((state) => {
      const current = state.moveEvaluations[index];

      // 'Libro' es inmutable salvo errores reales de Stockfish
      if (current === 'Libro') {
        const isError = ['Error', 'Error grave', 'Omisión'].includes(type);
        if (!isError) return state;
      }

      return { moveEvaluations: { ...state.moveEvaluations, [index]: type } };
    }),

  setBestMoveForIndex: (index, move) =>
    set((state) => ({ bestMoves: { ...state.bestMoves, [index]: move } })),

  setAlternativeLinesForIndex: (index, lines) =>
    set((state) => ({ alternativeLines: { ...state.alternativeLines, [index]: lines } })),

  setAnalyzing: (v) => set({ isAnalyzing: v }),
  setAnalysisProgress: (v) => set({ analysisProgress: v }),
  setAnalysisReady: (v) => set({ analysisReady: v }),
  setGameScore: (v) => set({ gameScore: v }),

  // ── Apertura ─────────────────────────────────────────────────────────────────
  setEcoCode: (v) => set({ ecoCode: v }),
  setOpeningPly: (v) => set({ openingPly: v }),
  setOpeningDetected: (v) => set({ openingDetected: v }),

  // ── Reset masivo ─────────────────────────────────────────────────────────────
  setEvaluationHistory: (v) => set({ evaluationHistory: v }),
  setMoveEvaluations: (v) => set({ moveEvaluations: v }),
  setBestMoves: (v) => set({ bestMoves: v }),
  setAlternativeLines: (v) => set({ alternativeLines: v }),

  setEngineConfig: (config) => set({ engineConfig: config }),
});