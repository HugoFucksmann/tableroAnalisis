import { Chess } from 'chess.js';
import { analysisQueue } from '../../services/analysisQueue';
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
  isAnalyzeFromPgn: false,
  wantsFullAnalysis: false,
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
    const gameCopy = replayTo(verboseHistory, targetIdx);
    if (headers.FEN && targetIdx === -1) gameCopy.load(headers.FEN);

    set({
      game: gameCopy,
      fen: gameCopy.fen(),
      history: verboseHistory,
      currentMoveIndex: targetIdx,
    });
  },

  makeMove: (move) => {
    const state = get();
    try {
      const gameCopy = replayTo(state.history, state.currentMoveIndex);
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
        history: [...state.history],
        evaluationHistory: { ...state.evaluationHistory },
        bestMoves: { ...state.bestMoves },
        moveEvaluations: { ...state.moveEvaluations },
        alternativeLines: { ...state.alternativeLines },
        branchIndex: state.currentMoveIndex,
      } : state.mainLineData;

      const newHistory = [
        ...state.history.slice(0, state.currentMoveIndex + 1),
        result,
      ];

      analysisQueue.cancel();
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
    const gameCopy = replayTo(state.mainLineData.history, targetIndex);
    const evalObj = state.mainLineData.evaluationHistory[targetIndex];

    get().setEvaluationHistory(state.mainLineData.evaluationHistory);
    get().setBestMoves(state.mainLineData.bestMoves);
    get().setMoveEvaluations(state.mainLineData.moveEvaluations);
    get().setAlternativeLines(state.mainLineData.alternativeLines);
    get().setEvaluationDirect(evalFromEntry(evalObj));

    set({
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
      const gameCopy = replayTo(state.history, safeIndex);
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
    if (state.gameId) analysisQueue.clearOpeningCache(state.gameId);

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

  loadPgn: (pgn) => {
    try {
      const state = get();
      const newGame = new Chess();
      newGame.loadPgn(pgn);

      if (state.gameId) analysisQueue.clearOpeningCache(state.gameId);

      const headers = newGame.header();
      state.setPlayers(headers.White ?? 'Blancas', headers.Black ?? 'Negras', headers.WhiteElo ?? null, headers.BlackElo ?? null);

      const blackPlayer = (headers.Black ?? '').toLowerCase();
      const currentUser = state.searchUsername?.toLowerCase() ?? '';
      if (blackPlayer === currentUser && currentUser !== '') {
        state.setBoardOrientation('black');
      } else {
        state.setBoardOrientation('white');
      }

      state.setGameId(Date.now());

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
      const gameCopy = replayTo(verboseHistory, targetIdx);
      if (headers.FEN && targetIdx === -1) gameCopy.load(headers.FEN);

      const evalObj = evalHistoryDict[targetIdx];

      get().resetAnalysisState();

      set({
        game: gameCopy,
        fen: gameCopy.fen(),
        history: verboseHistory,
        currentMoveIndex: targetIdx,
        ...GAME_RESET,
        isAnalyzeFromPgn: hasEvaluations,
        gameHeaders: headers,
        pgnCommentsByIndex,
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
    if (state.gameId) analysisQueue.clearOpeningCache(state.gameId);

    get().resetAnalysisState();

    set({
      isAnalyzeFromPgn: false,
      wantsFullAnalysis: true,
      gameId: Date.now(),
    });
  },
});