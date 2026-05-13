export const createAnalysisSlice = (set, get) => ({
  evaluation: { score: 0, mate: null },
  evaluationHistory: {},
  moveEvaluations: {},
  bestMoves: {},
  alternativeLines: {},
  isAnalyzing: false,
  isCanceling: false,
  analysisProgress: 0,
  analysisLabel: '',
  analysisReady: false,
  analysisRequestId: null,
  accuracy: null,
  ecoCode: '',
  openingName: 'Initial Position',
  openingPly: -1,
  openingDetected: false,
  analyses: [], // kept as empty for backward compat — source of truth is librarySlice

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
    isCanceling: false,
    analysisProgress: 0,
    analysisLabel: '',
    analysisReady: false,
    analysisRequestId: null,
    accuracy: null,
    ecoCode: '',
    openingName: 'Initial Position',
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
      isCanceling: false,
      analysisReady: true,
      analysisLabel: '',
    };
  }),

  setEvaluation: (evalData, moveIndex) => {
    const state = get();
    const idx = moveIndex !== undefined ? moveIndex : state.currentMoveIndex;
    const normalized = typeof evalData === 'number' ? { score: evalData, mate: null } : evalData;

    set((state) => ({
      evaluation: idx === state.currentMoveIndex ? normalized : state.evaluation,
      evaluationHistory: {
        ...state.evaluationHistory,
        [idx]: { moveIndex: idx, ...normalized }
      }
    }));
  },

  setEvaluationDirect: (evalData) => {
    const normalized = typeof evalData === 'number' ? { score: evalData, mate: null } : evalData;
    set({ evaluation: normalized });
  },

  setMoveEvaluation: (index, type) => set((state) => {
    const current = state.moveEvaluations[index];
    if (current === 'Libro') {
      const isError = ['Error', 'Error grave'].includes(type);
      if (!isError) return state;
    }
    return { moveEvaluations: { ...state.moveEvaluations, [index]: type } };
  }),

  setBestMoveForIndex: (index, move) => set((state) => ({ bestMoves: { ...state.bestMoves, [index]: move } })),
  setAlternativeLinesForIndex: (index, lines) => set((state) => ({ alternativeLines: { ...state.alternativeLines, [index]: lines } })),
  setAnalyzing: (v) => set({ isAnalyzing: v }),
  setCanceling: (v) => set({ isCanceling: v }),
  setAnalysisProgress: (pct, label) => set((state) => ({ 
    analysisProgress: pct,
    analysisLabel: label !== undefined ? label : state.analysisLabel
  })),
  setAnalysisLabel: (v) => set({ analysisLabel: v }),
  setAnalysisReady: (v) => set({ analysisReady: v }),
  setAccuracy: (v) => set({ accuracy: v }),
  setEcoCode: (v) => set({ ecoCode: v }),
  setOpeningName: (v) => set({ openingName: v }),
  setOpeningPly: (v) => set({ openingPly: v }),
  setOpeningDetected: (v) => set({ openingDetected: v }),
  setEvaluationHistory: (v) => set({ evaluationHistory: v }),
  setMoveEvaluations: (v) => set({ moveEvaluations: v }),
  setBestMoves: (v) => set({ bestMoves: v }),
  setAlternativeLines: (v) => set({ alternativeLines: v }),
  setEngineConfig: (config) => set({ engineConfig: config }),
  // analyses actions moved to librarySlice — use state.setAnalyses / appendAnalyses / removeAnalyses from there
  applyFullAnalysis: (data) => {
    if (!data) return;

    // evalResults is position-indexed (posIdx), evaluationHistory is move-indexed.
    // posIdx 0 = initial pos (moveIndex -1), posIdx N = after move N (moveIndex N-1).
    const evaluationHistory = {};
    if (data.evaluations) {
      Object.entries(data.evaluations).forEach(([posIdxStr, evalObj]) => {
        if (!evalObj) return;
        const posIdx = parseInt(posIdxStr);
        const moveIndex = posIdx - 1; // posIdx 0 → moveIndex -1 (initial)
        evaluationHistory[moveIndex] = {
          moveIndex,
          score: evalObj.score ?? 0,
          mate: evalObj.mate ?? null,
        };
      });
    }

    set({
      accuracy: data.accuracy,
      openingName: data.opening?.name || 'Unknown',
      evaluationHistory,
      moveEvaluations: data.moveEvaluations || {},
      bestMoves: data.bestMoves || {},
      alternativeLines: data.alternativeLines || {},
      analysisReady: true,
      openingDetected: true,
    });
  },
});