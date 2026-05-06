import { Chess } from 'chess.js';
import { analysisBridge } from '../../services/analysisBridge';
import { playChessSound } from '../../utils/soundUtils';
import { replayTo, extractPgnData } from '../../utils/chessUtils';

function evalFromEntry(evalObj) {
  if (!evalObj) return { score: 0, mate: null };
  return { score: evalObj.score ?? 0, mate: evalObj.mate ?? null };
}

const GAME_RESET = {
  arrows: [],
  highlights: {},
  isExploreMode: false,
  mainLineData: null,
  hasPgnEvaluations: false,
  isReviewRequested: false,
  startFen: null,
};

export const createGameSlice = (set, get) => ({
  game: new Chess(),
  fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  history: [],
  currentMoveIndex: -1,
  gameHeaders: {},
  pgnCommentsByIndex: {},
  ...GAME_RESET,

  setArrows: (arrows) => set({ arrows }),
  setHighlights: (highlights) => set({ highlights }),

  setGame: (newGame) => {
    const headers = newGame.header();
    const verboseHistory = newGame.history({ verbose: true });
    const targetIdx = verboseHistory.length > 0 ? 0 : -1;
    const startFen = headers.FEN || null;
    const gameCopy = replayTo(verboseHistory, targetIdx, startFen);
    if (startFen && targetIdx === -1) gameCopy.load(startFen);

    set({
      game: gameCopy,
      fen: gameCopy.fen(),
      history: verboseHistory,
      currentMoveIndex: targetIdx,
      startFen,
    });
  },

  makeMove: (move) => {
    const state = get();
    try {
      const gameCopy = replayTo(state.history, state.currentMoveIndex, state.startFen);
      const result = gameCopy.move(move);
      if (!result) return null;

      const nextMove = state.history[state.currentMoveIndex + 1];
      if (nextMove && nextMove.san === result.san) {
        const safeIndex = state.currentMoveIndex + 1;
        const evalObj = state.evaluationHistory[safeIndex];

        set({
          game: gameCopy,
          fen: gameCopy.fen(),
          currentMoveIndex: safeIndex,
          arrows: []
        });
        get().setEvaluationDirect(evalFromEntry(evalObj));
        playChessSound(result.captured || result.san?.includes('x') ? 'capture' : 'move');
        return result;
      }

      const isEnteringExploreMode = !state.isExploreMode;
      const mainLineData = isEnteringExploreMode ? {
        history: state.history,
        evaluationHistory: state.evaluationHistory,
        bestMoves: state.bestMoves,
        moveEvaluations: state.moveEvaluations,
        alternativeLines: state.alternativeLines,
        branchIndex: state.currentMoveIndex,
      } : state.mainLineData;

      const newHistory = [
        ...state.history.slice(0, state.currentMoveIndex + 1),
        result,
      ];

      analysisBridge.cancel();
      get().trimAnalysisState(state.currentMoveIndex);

      set({
        game: gameCopy,
        fen: gameCopy.fen(),
        history: newHistory,
        currentMoveIndex: newHistory.length - 1,
        arrows: [],
        isExploreMode: true,
        mainLineData,
      });

      playChessSound(result.captured || result.san?.includes('x') ? 'capture' : 'move');
      return result;
    } catch {
      return null;
    }
  },

  restoreMainLine: () => {
    const state = get();
    if (!state.isExploreMode || !state.mainLineData) return;

    const targetIndex = state.mainLineData.branchIndex;
    const gameCopy = replayTo(state.mainLineData.history, targetIndex, state.startFen);
    const evalObj = state.mainLineData.evaluationHistory[targetIndex];

    set({
      evaluationHistory: state.mainLineData.evaluationHistory,
      bestMoves: state.mainLineData.bestMoves,
      moveEvaluations: state.mainLineData.moveEvaluations,
      alternativeLines: state.mainLineData.alternativeLines,
      evaluation: evalFromEntry(evalObj),
      game: gameCopy,
      fen: gameCopy.fen(),
      history: state.mainLineData.history,
      currentMoveIndex: targetIndex,
      isExploreMode: false,
      mainLineData: null,
      arrows: [],
    });
    playChessSound('move');
  },

  goToMove: (index) => {
    const state = get();
    const safeIndex = Math.max(-1, Math.min(index, state.history.length - 1));
    try {
      const gameCopy = replayTo(state.history, safeIndex, state.startFen);
      const evalObj = state.evaluationHistory[safeIndex];
      set({
        game: gameCopy,
        fen: gameCopy.fen(),
        currentMoveIndex: safeIndex,
        arrows: []
      });
      get().setEvaluationDirect(evalFromEntry(evalObj));
      playChessSound('move');
    } catch (e) {
      console.error('goToMove error:', e);
    }
  },

  resetGame: () => {
    const state = get();
    if (state.gameId) analysisBridge.clearCache(state.gameId);
    get().resetAnalysisState();

    set({
      game: new Chess(),
      fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      history: [],
      currentMoveIndex: -1,
      ...GAME_RESET
    });
    playChessSound('notify');
  },

  loadFen: (fenStr) => {
    try {
      const state = get();
      const newGame = new Chess(fenStr);
      if (state.gameId) analysisBridge.clearCache(state.gameId);
      get().resetAnalysisState();

      set({
        game: newGame,
        fen: newGame.fen(),
        history: [],
        currentMoveIndex: -1,
        ...GAME_RESET,
        startFen: fenStr,
        gameId: Date.now(),
        gameHeaders: {},
        pgnCommentsByIndex: {},
        hasPgnEvaluations: false,
      });
      playChessSound('notify');
      return true;
    } catch (e) {
      console.error('loadFen error:', e);
      return false;
    }
  },

  loadPgn: (pgn, providedId = null) => {
    try {
      const state = get();
      const newGame = new Chess();
      newGame.loadPgn(pgn);
      if (state.gameId) analysisBridge.clearCache(state.gameId);

      const headers = newGame.header();
      state.setPlayers(headers.White ?? 'Blancas', headers.Black ?? 'Negras', headers.WhiteElo ?? null, headers.BlackElo ?? null);

      const blackPlayer = (headers.Black ?? '').toLowerCase();
      const currentUser = state.searchUsername?.toLowerCase() ?? '';
      if (blackPlayer === currentUser && currentUser !== '') {
        state.setBoardOrientation('black');
      } else {
        state.setBoardOrientation('white');
      }

      let gameId = providedId;
      if (!gameId && headers.Site && headers.Site.includes('lichess.org/')) {
        gameId = headers.Site.split('/').pop().split(/[#?]/)[0];
      }
      if (!gameId) gameId = Date.now();
      const verboseHistory = newGame.history({ verbose: true });
      const comments = newGame.getComments();

      const {
        evaluationHistory,
        moveEvaluations,
        pgnCommentsByIndex,
        hasEvaluations,
        initialWhiteClock,
        initialBlackClock
      } = extractPgnData(verboseHistory, comments);

      const evalHistoryDict = Array.isArray(evaluationHistory)
        ? evaluationHistory.reduce((acc, curr) => ({ ...acc, [curr.moveIndex]: curr }), {})
        : evaluationHistory;

      const targetIdx = verboseHistory.length > 0 ? 0 : -1;
      const startFen = headers.FEN || null;
      const gameCopy = replayTo(verboseHistory, targetIdx, startFen);
      if (startFen && targetIdx === -1) gameCopy.load(startFen);

      const evalObj = evalHistoryDict[targetIdx];
      get().resetAnalysisState();

      set({
        game: gameCopy,
        fen: gameCopy.fen(),
        history: verboseHistory,
        currentMoveIndex: targetIdx,
        ...GAME_RESET,
        hasPgnEvaluations: hasEvaluations,
        gameHeaders: headers,
        pgnCommentsByIndex,
        startFen,
        gameId,
      });

      get().setEvaluationHistory(evalHistoryDict);
      get().setMoveEvaluations(moveEvaluations);
      get().setAnalysisReady(hasEvaluations);
      get().setEvaluationDirect(evalFromEntry(evalObj));

      state.setClocks(initialWhiteClock, initialBlackClock);
      playChessSound('notify');
      return true;
    } catch (e) {
      console.error('loadPgn error:', e);
      return false;
    }
  },

  setCurrentMoveIndex: (index) => set({ currentMoveIndex: index, arrows: [] }),

  startFullAnalysis: () => {
    const state = get();
    if (state.gameId) analysisBridge.clearCache(state.gameId);
    get().resetAnalysisState();

    set({
      hasPgnEvaluations: false,
      isReviewRequested: true,
      gameId: state.gameId || Date.now(),
    });
  },
});