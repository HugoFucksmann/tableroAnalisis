/**
 * gameSlice.js  v3
 *
 * Cambios:
 *  - loadPgn / resetGame limpian analysisReady y los nuevos campos de apertura
 *  - analysisQueue.clearOpeningCache(gameId) al cargar nueva partida
 */
import { Chess } from 'chess.js';
import { analysisQueue } from '../../services/analysisQueue';

function replayTo(history, index) {
  const g = new Chess();
  const moves = index < 0 ? [] : history.slice(0, index + 1);
  for (const m of moves) {
    try { g.move(m); } catch { }
  }
  return g;
}

// Campos de análisis que se resetean al cargar una nueva partida
const ANALYSIS_RESET = {
  evaluation: 0,
  evaluationHistory: [],
  moveEvaluations: {},
  bestMoves: {},
  alternativeLines: {},
  isAnalyzing: false,
  analysisProgress: 0,
  analysisReady: false,
  gameScore: null,
  arrows: [],
  highlights: {},
  ecoCode: '',
  openingPly: -1,
  openingDetected: false,
};

export const createGameSlice = (set, get) => ({
  game: new Chess(),
  fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  history: [],
  currentMoveIndex: -1,

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
      const evalObj = state.evaluationHistory.find(e => e.moveIndex === safeIndex);
      const currentEval = evalObj ? evalObj.score : 0;
      set({ game: gameCopy, fen: gameCopy.fen(), currentMoveIndex: safeIndex, evaluation: currentEval });
    } catch (e) {
      console.error('goToMove error:', e);
    }
  },

  resetGame: () => {
    const state = get();
    if (state.gameId) analysisQueue.clearOpeningCache(state.gameId);
    set({ game: new Chess(), fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', history: [], currentMoveIndex: -1, ...ANALYSIS_RESET });
  },

  loadPgn: (pgn) => {
    try {
      const state = get();
      const newGame = new Chess();
      newGame.loadPgn(pgn);

      // Limpiar cache de la partida anterior
      if (state.gameId) analysisQueue.clearOpeningCache(state.gameId);

      // Nombres de jugadores
      const headers = newGame.header();
      state.setPlayers(headers.White ?? 'Blancas', headers.Black ?? 'Negras');
      state.setClocks(null, null); // Reset por defecto

      // Orientación automática
      const blackPlayer = (headers.Black ?? '').toLowerCase();
      const currentUser = state.searchUsername?.toLowerCase() ?? '';
      if (blackPlayer === currentUser && currentUser !== '') {
        state.setBoardOrientation('black');
      } else {
        state.setBoardOrientation('white');
      }

      // Nuevo gameId → dispara el useEffect de análisis
      state.setGameId(Date.now());

      const verboseHistory = newGame.history({ verbose: true });
      set({
        game: newGame,
        fen: newGame.fen(),
        history: verboseHistory,
        currentMoveIndex: verboseHistory.length - 1,
        ...ANALYSIS_RESET,
      });

      return true;
    } catch (e) {
      console.error('loadPgn error:', e);
      return false;
    }
  },

  setCurrentMoveIndex: (index) => set({ currentMoveIndex: index }),
});