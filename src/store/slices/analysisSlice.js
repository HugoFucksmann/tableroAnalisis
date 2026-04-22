export const createAnalysisSlice = (set, get) => ({
  evaluation: 0,
  evaluationHistory: [],
  moveEvaluations: {},
  bestMoves: {},
  isAnalyzing: false,
  analysisProgress: 0,
  gameScore: null,

  setEvaluation: (score, moveIndex) => {
    const state = get();
    const idx = moveIndex !== undefined ? moveIndex : state.currentMoveIndex;
    const existing = state.evaluationHistory.findIndex(e => e.moveIndex === idx);
    let newHistory;
    
    if (existing >= 0) {
      newHistory = [...state.evaluationHistory];
      newHistory[existing] = { moveIndex: idx, score };
    } else {
      newHistory = [...state.evaluationHistory, { moveIndex: idx, score }].sort(
        (a, b) => a.moveIndex - b.moveIndex
      );
    }

    set({
      evaluation: idx === state.currentMoveIndex ? score : state.evaluation,
      evaluationHistory: newHistory,
    });
  },

  setMoveEvaluation: (index, type) =>
    set((state) => {
      const currentType = state.moveEvaluations[index];
      
      // Si ya es "Libro", solo permitimos sobrescribir si el motor detecta un error real
      // Esto evita que Stockfish cambie "Libro" por "Excelente" o "Mejor"
      if (currentType === 'Libro') {
        const isError = ['Error', 'Error grave', 'Omisión'].includes(type);
        if (!isError) return state;
      }

      return {
        moveEvaluations: { ...state.moveEvaluations, [index]: type },
      };
    }),

  setBestMoveForIndex: (index, move) =>
    set((state) => ({
      bestMoves: { ...state.bestMoves, [index]: move },
    })),

  setAnalyzing: (status) => set({ isAnalyzing: status }),
  setAnalysisProgress: (progress) => set({ analysisProgress: progress }),
  setGameScore: (score) => set({ gameScore: score }),

  // Acciones de limpieza/seteo masivo
  setEvaluationHistory: (history) => set({ evaluationHistory: history }),
  setMoveEvaluations: (evals) => set({ moveEvaluations: evals }),
  setBestMoves: (moves) => set({ bestMoves: moves }),
});
