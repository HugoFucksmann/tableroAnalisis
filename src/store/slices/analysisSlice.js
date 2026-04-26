export const createAnalysisSlice = (set, get) => ({
  evaluation: { score: 0, mate: null },
  evaluationHistory: {},
  moveEvaluations: {},
  bestMoves: {},
  alternativeLines: {},
  isAnalyzing: false,
  analysisProgress: 0,
  analysisReady: false,
  gameScore: null,
  ecoCode: '',
  openingPly: -1,
  openingDetected: false,

  engineConfig: {
    depth: 18,
    multiPv: 1,
    liveDepth: 16,
    liveMultiPv: 3,
    threads: 2,
    hash: 32,
  },

  resetAnalysisState: () => set({
    evaluation: { score: 0, mate: null },
    evaluationHistory: {},
    moveEvaluations: {},
    bestMoves: {},
    alternativeLines: {},
    isAnalyzing: false,
    analysisProgress: 0,
    analysisReady: false,
    gameScore: null,
    ecoCode: '',
    openingPly: -1,
    openingDetected: false,
  }),

  trimAnalysisState: (currentMoveIndex) => set((state) => {
    const newBestMoves = { ...state.bestMoves };
    const newMoveEvaluations = { ...state.moveEvaluations };
    const newAlternativeLines = { ...state.alternativeLines };
    const newEvaluationHistory = { ...state.evaluationHistory };

    for (const key of Object.keys(newBestMoves)) {
      if (parseInt(key) >= currentMoveIndex + 1) delete newBestMoves[key];
    }
    for (const key of Object.keys(newMoveEvaluations)) {
      if (parseInt(key) >= currentMoveIndex + 1) delete newMoveEvaluations[key];
    }
    for (const key of Object.keys(newAlternativeLines)) {
      if (parseInt(key) >= currentMoveIndex + 1) delete newAlternativeLines[key];
    }
    for (const key of Object.keys(newEvaluationHistory)) {
      if (parseInt(key) > currentMoveIndex) delete newEvaluationHistory[key];
    }

    return {
      bestMoves: newBestMoves,
      moveEvaluations: newMoveEvaluations,
      alternativeLines: newAlternativeLines,
      evaluationHistory: newEvaluationHistory,
      evaluation: { score: 0, mate: null },
      isAnalyzing: false,
      analysisReady: true,
    };
  }),

  setEvaluation: (evalData, moveIndex) => {
    const state = get();
    const idx = moveIndex !== undefined ? moveIndex : state.currentMoveIndex;
    const normalized = typeof evalData === 'number'
      ? { score: evalData, mate: null }
      : evalData;

    set((state) => ({
      evaluation: idx === state.currentMoveIndex ? normalized : state.evaluation,
      evaluationHistory: {
        ...state.evaluationHistory,
        [idx]: { moveIndex: idx, ...normalized }
      }
    }));
  },

  setEvaluationDirect: (evalData) => {
    const normalized = typeof evalData === 'number'
      ? { score: evalData, mate: null }
      : evalData;
    set({ evaluation: normalized });
  },

  setMoveEvaluation: (index, type) => set((state) => {
    const current = state.moveEvaluations[index];
    if (current === 'Libro') {
      const isError = ['Error', 'Error grave', 'Omisión'].includes(type);
      if (!isError) return state;
    }
    return { moveEvaluations: { ...state.moveEvaluations, [index]: type } };
  }),

  setBestMoveForIndex: (index, move) => set((state) => ({ bestMoves: { ...state.bestMoves, [index]: move } })),
  setAlternativeLinesForIndex: (index, lines) => set((state) => ({ alternativeLines: { ...state.alternativeLines, [index]: lines } })),
  setAnalyzing: (v) => set({ isAnalyzing: v }),
  setAnalysisProgress: (v) => set({ analysisProgress: v }),
  setAnalysisReady: (v) => set({ analysisReady: v }),
  setGameScore: (v) => set({ gameScore: v }),
  setEcoCode: (v) => set({ ecoCode: v }),
  setOpeningPly: (v) => set({ openingPly: v }),
  setOpeningDetected: (v) => set({ openingDetected: v }),
  setEvaluationHistory: (v) => set({ evaluationHistory: v }),
  setMoveEvaluations: (v) => set({ moveEvaluations: v }),
  setBestMoves: (v) => set({ bestMoves: v }),
  setAlternativeLines: (v) => set({ alternativeLines: v }),
  setEngineConfig: (config) => set({ engineConfig: config }),
});