import { create } from 'zustand';
import { Chess } from 'chess.js';

// Helper: reproduce una partida desde cero hasta el índice dado (inclusive).
// Recibe el array `history` del store (objetos verbose { from, to, promotion, ... })
// y devuelve una instancia de Chess en esa posición.
function replayTo(history, index) {
  const g = new Chess();
  const moves = index < 0 ? [] : history.slice(0, index + 1);
  for (const m of moves) {
    g.move(m); // acepta tanto string SAN como objeto { from, to, promotion }
  }
  return g;
}

export const useGameStore = create((set, get) => ({
  game: new Chess(),
  fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',

  // CRÍTICO: guardamos objetos verbose { from, to, san, promotion, ... }
  // en lugar de strings SAN puros, para que replayTo() sea 100% confiable.
  history: [],

  moveEvaluations: {},
  clocks: { white: '10:00', black: '10:00' },
  currentMoveIndex: -1,
  evaluation: 0,
  evaluationHistory: [],
  bestMove: null,
  arrows: [],
  highlights: {},
  gamePhase: 'Opening',
  openingName: 'Initial Position',
  isAnalyzing: false,
  importedGames: [],

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
      // Reconstruir el tablero hasta el punto actual de navegación
      const gameCopy = replayTo(state.history, state.currentMoveIndex);

      const result = gameCopy.move(move);
      if (!result) return null;

      // Guardamos el objeto verbose devuelto por chess.js.
      // Si el usuario estaba navegando en el medio, truncamos la rama vieja.
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
    } catch (e) {
      //console.error('makeMove error:', e);
      return null;
    }
  },

  goToMove: (index) => {
    const state = get();
    // Clampear el índice entre -1 y el último movimiento
    const safeIndex = Math.max(-1, Math.min(index, state.history.length - 1));
    try {
      const gameCopy = replayTo(state.history, safeIndex);
      set({
        game: gameCopy,
        fen: gameCopy.fen(),
        currentMoveIndex: safeIndex,
        // history NO se toca: la lista de jugadas debe seguir visible completa
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
      evaluation: 0,
      bestMove: null,
      currentMoveIndex: -1,
      evaluationHistory: [],
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
      });
      return true;
    } catch (e) {
      console.error('loadPgn error:', e);
      return false;
    }
  },

  setEvaluation: (evalValue) => {
    const state = get();
    set({
      evaluation: evalValue,
      evaluationHistory: [
        ...state.evaluationHistory,
        { moveIndex: state.currentMoveIndex, score: evalValue },
      ],
    });
  },

  setArrows: (arrows) => set({ arrows }),
  setHighlights: (highlights) => set({ highlights }),
  setGamePhase: (phase) => set({ gamePhase: phase }),
  setOpeningName: (name) => set({ openingName: name }),

  setMoveEvaluation: (index, type) =>
    set((state) => ({
      moveEvaluations: { ...state.moveEvaluations, [index]: type },
    })),

  setClocks: (white, black) => set({ clocks: { white, black } }),
  setCurrentMoveIndex: (index) => set({ currentMoveIndex: index }),
  setBestMove: (move) => set({ bestMove: move }),
  setAnalyzing: (status) => set({ isAnalyzing: status }),
  setImportedGames: (games) => set({ importedGames: games }),
}));