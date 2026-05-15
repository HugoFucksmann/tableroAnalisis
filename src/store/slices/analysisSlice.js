import { Chess } from 'chess.js';
import { replayTo } from '../../utils/chessUtils';

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

  // BUG MEDIO SOLUCIONADO: analyses[] eliminado. El source of truth real está en librarySlice

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

  applyFullAnalysis: (data) => {
    if (!data) return;

    const currentState = get();

    const evaluationHistory = {};
    if (data.evaluations) {
      Object.entries(data.evaluations).forEach(([posIdxStr, evalObj]) => {
        if (!evalObj) return;
        const posIdx = parseInt(posIdxStr);
        const moveIndex = posIdx - 1;
        evaluationHistory[moveIndex] = {
          moveIndex,
          score: evalObj.score ?? 0,
          mate: evalObj.mate ?? null,
        };
      });
    }

    let verboseHistory = [];
    let startFen = data.startFen || null;
    const sans = data.historySan || data.history || [];

    if (sans.length > 0) {
      try {
        const chess = startFen ? new Chess(startFen) : new Chess();
        for (const san of sans) {
          const move = chess.move(san);
          if (move) verboseHistory.push(move);
        }
      } catch (e) {
        console.warn('[applyFullAnalysis] Could not reconstruct verbose history:', e.message);
        verboseHistory = [];
      }
    }

    const baseState = {
      accuracy: data.accuracy,
      openingName: data.opening?.name || 'Unknown',
      ecoCode: data.opening?.eco || '',
      evaluationHistory,
      moveEvaluations: data.moveEvaluations || {},
      bestMoves: data.bestMoves || {},
      alternativeLines: data.alternativeLines || {},
      analysisReady: true,
      openingDetected: true,
    };

    if (verboseHistory.length > 0) {
      let targetIndex = verboseHistory.length > 0 ? 0 : -1;

      // RESOLUCIÓN BUG NAVEGACIÓN DESDE STATS/MINIATURAS:
      // 1. Si la UI pide ir a una jugada específica (targetPly)
      if (currentState.targetPly !== null && currentState.targetPly !== undefined) {
        targetIndex = Math.max(-1, Math.min(currentState.targetPly, verboseHistory.length - 1));
        if (get().setTargetPly) get().setTargetPly(null); // Consumir el target
      }
      else {
        // 2. Si no hay target específico, verificamos de forma ESTRICTA si es la misma partida.
        // No basta con el gameId (ya que pudo cambiar microsegundos antes).
        // Chequeamos si el primer movimiento es exactamente el mismo.
        let isStrictlySameGame = false;

        if (currentState.gameId === data.gameId) {
          if (currentState.history.length > 0 && verboseHistory.length > 0) {
            isStrictlySameGame = currentState.history[0].san === verboseHistory[0].san;
          } else if (currentState.startFen === startFen) {
            isStrictlySameGame = true;
          }
        }

        // Si es estrictamente la misma partida (ej. análisis de fondo que terminó) conservamos la vista
        if (isStrictlySameGame) {
          targetIndex = Math.max(-1, Math.min(currentState.currentMoveIndex, verboseHistory.length - 1));
        }
      }

      const gameCopy = replayTo(verboseHistory, targetIndex, startFen);

      if (data.players?.white || data.players?.black) {
        if (get().setPlayers) {
          get().setPlayers(
            data.players.white || 'Blancas',
            data.players.black || 'Negras'
          );
        }
      }

      set({
        ...baseState,
        history: verboseHistory,
        startFen,
        currentMoveIndex: targetIndex,
        game: gameCopy,
        fen: gameCopy.fen(),
        isExploreMode: false,
        mainLineData: null,
        arrows: [],
      });
    } else {
      set(baseState);
    }
  },
});