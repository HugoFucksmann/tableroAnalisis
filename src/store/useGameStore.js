import { create } from 'zustand';
import { Chess } from 'chess.js';

function replayTo(history, index) {
  const g = new Chess();
  const moves = index < 0 ? [] : history.slice(0, index + 1);
  for (const m of moves) g.move(m);
  return g;
}

export const useGameStore = create((set, get) => ({
  // ── Tablero ──────────────────────────────────────────────────────────────
  game: new Chess(),
  fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  history: [],          // objetos verbose { from, to, san, promotion, ... }
  currentMoveIndex: -1,

  // ── Evaluación ───────────────────────────────────────────────────────────
  evaluation: 0,
  evaluationHistory: [], // [{ moveIndex, score }]
  moveEvaluations: {},   // { moveIndex: 'Brillante' | 'Error' | ... }
  bestMove: null,

  // ── Análisis ─────────────────────────────────────────────────────────────
  isAnalyzing: false,
  analysisProgress: 0,   // 0–100
  gameScore: null,       // { white: 85, black: 72 } — precisión estilo Chess.com

  // ── UI ───────────────────────────────────────────────────────────────────
  clocks: { white: '10:00', black: '10:00' },
  arrows: [],
  highlights: {},
  gamePhase: 'Opening',
  openingName: 'Initial Position',
  importedGames: [],

  // ── Acciones tablero ─────────────────────────────────────────────────────
  setGame: (newGame) => {
    const verboseHistory = newGame.history({ verbose: true });
    set({
      game: newGame,
      fen: newGame.fen(),
      history: verboseHistory,
      currentMoveIndex: verboseHistory.length - 1,
    });
  },

  makeMove: (move) => {
    const state = get();
    try {
      const gameCopy = replayTo(state.history, state.currentMoveIndex);
      const result = gameCopy.move(move);
      if (!result) return null;

      const newHistory = [
        ...state.history.slice(0, state.currentMoveIndex + 1),
        result,
      ];
      set({
        game: gameCopy,
        fen: gameCopy.fen(),
        history: newHistory,
        currentMoveIndex: newHistory.length - 1,
      });
      return result;
    } catch {
      return null;
    }
  },

  goToMove: (index) => {
    const state = get();
    const safeIndex = Math.max(-1, Math.min(index, state.history.length - 1));
    try {
      const gameCopy = replayTo(state.history, safeIndex);
      set({ game: gameCopy, fen: gameCopy.fen(), currentMoveIndex: safeIndex });
    } catch (e) {
      console.error('goToMove error:', e);
    }
  },

  resetGame: () => {
    const newGame = new Chess();
    set({
      game: newGame,
      fen: newGame.fen(),
      history: [],
      currentMoveIndex: -1,
      evaluation: 0,
      evaluationHistory: [],
      moveEvaluations: {},
      bestMove: null,
      isAnalyzing: false,
      analysisProgress: 0,
      gameScore: null,
      arrows: [],
      highlights: {},
    });
  },

  loadPgn: (pgn) => {
    try {
      const newGame = new Chess();
      newGame.loadPgn(pgn);
      const verboseHistory = newGame.history({ verbose: true });
      set({
        game: newGame,
        fen: newGame.fen(),
        history: verboseHistory,
        currentMoveIndex: verboseHistory.length - 1,
        // Limpiar análisis anterior al cargar partida nueva
        evaluation: 0,
        evaluationHistory: [],
        moveEvaluations: {},
        bestMove: null,
        isAnalyzing: false,
        analysisProgress: 0,
        gameScore: null,
        arrows: [],
      });
      return true;
    } catch (e) {
      console.error('loadPgn error:', e);
      return false;
    }
  },

  // ── Acciones análisis ────────────────────────────────────────────────────

  /**
   * setEvaluation ahora recibe (score, moveIndex) para poder construir
   * el historial completo sin depender del currentMoveIndex.
   */
  setEvaluation: (score, moveIndex) => {
    const state = get();
    const idx = moveIndex !== undefined ? moveIndex : state.currentMoveIndex;
    // Actualizar o insertar en evaluationHistory
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
    set((state) => ({
      moveEvaluations: { ...state.moveEvaluations, [index]: type },
    })),

  setBestMove: (move) => set({ bestMove: move }),
  setAnalyzing: (status) => set({ isAnalyzing: status }),
  setAnalysisProgress: (progress) => set({ analysisProgress: progress }),
  setGameScore: (score) => set({ gameScore: score }),

  // ── Acciones UI ──────────────────────────────────────────────────────────
  setArrows: (arrows) => set({ arrows }),
  setHighlights: (highlights) => set({ highlights }),
  setGamePhase: (phase) => set({ gamePhase: phase }),
  setOpeningName: (name) => set({ openingName: name }),
  setClocks: (white, black) => set({ clocks: { white, black } }),
  setCurrentMoveIndex: (index) => set({ currentMoveIndex: index }),
  setImportedGames: (games) => set({ importedGames: games }),
}));