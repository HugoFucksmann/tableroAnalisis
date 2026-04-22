import { Chess } from 'chess.js';

function replayTo(history, index) {
  const g = new Chess();
  const moves = index < 0 ? [] : history.slice(0, index + 1);
  for (const m of moves) g.move(m);
  return g;
}

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
        evaluation: 0, // Reseteamos eval al mover
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
      const state = get();
      const newGame = new Chess();
      newGame.loadPgn(pgn);
      
      // Orientación automática: si el usuario buscado juega con negras, giramos el tablero
      const blackPlayer = newGame.header()?.Black?.toLowerCase() || '';
      const currentUser = state.searchUsername?.toLowerCase() || '';
      
      if (blackPlayer === currentUser && currentUser !== '') {
        state.setBoardOrientation('black');
      } else {
        state.setBoardOrientation('white');
      }

      // Limpiar análisis previo antes de cargar la nueva partida
      state.setGameId(Date.now());
      state.setEvaluationHistory([]);
      state.setMoveEvaluations({});
      state.setBestMoves({});
      state.setGameScore(null);

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

  setCurrentMoveIndex: (index) => set({ currentMoveIndex: index }),
});
