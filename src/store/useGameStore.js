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
  history: [],
  currentMoveIndex: -1,

  // ── Evaluación ───────────────────────────────────────────────────────────
  evaluation: 0,
  evaluationHistory: [],
  moveEvaluations: {},
  /**
   * bestMoves: mapa de moveIndex → string UCI del mejor movimiento
   * en la posición DESPUÉS de ese movimiento (= lo que el motor jugaría).
   * Clave especial -1 = mejor jugada en la posición inicial.
   */
  bestMoves: {},

  // ── Análisis ─────────────────────────────────────────────────────────────
  isAnalyzing: false,
  analysisProgress: 0,
  gameScore: null,

  // ── UI ───────────────────────────────────────────────────────────────────
  clocks: { white: '10:00', black: '10:00' },
  arrows: [],
  highlights: {},
  gamePhase: 'Opening',
  openingName: 'Initial Position',
  importedGames: [],
  searchUsername: 'elcolof',
  searchPlatform: 'lichess',
  lichessToken: import.meta.env.VITE_TOKEN_LICHESS || '',

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
        evaluation: 0,
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
      
      // Sincronizar la evaluación con el historial de análisis
      const evalObj = state.evaluationHistory.find(e => e.moveIndex === safeIndex);
      const currentEval = evalObj ? evalObj.score : 0;

      set({ 
        game: gameCopy, 
        fen: gameCopy.fen(), 
        currentMoveIndex: safeIndex,
        evaluation: currentEval
      });
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
      bestMoves: {},
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
        evaluation: 0,
        evaluationHistory: [],
        moveEvaluations: {},
        bestMoves: {},
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
    set((state) => ({
      moveEvaluations: { ...state.moveEvaluations, [index]: type },
    })),

  /**
   * Guarda el mejor movimiento UCI para la posición que se ve en el tablero
   * cuando currentMoveIndex === index.
   * index = -1 → posición inicial.
   */
  setBestMoveForIndex: (index, move) =>
    set((state) => ({
      bestMoves: { ...state.bestMoves, [index]: move },
    })),

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
  setSearchUsername: (username) => set({ searchUsername: username }),
  setSearchPlatform: (platform) => set({ searchPlatform: platform }),
  setLichessToken: (token) => set({ lichessToken: token }),
}));