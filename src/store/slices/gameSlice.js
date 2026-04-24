import { Chess } from 'chess.js';
import { analysisQueue } from '../../services/analysisQueue';
import { playChessSound } from '../../utils/soundUtils';
import { MOVE_LABELS } from '../../constants/chessConstants';

function replayTo(history, index) {
  const g = new Chess();
  const moves = index < 0 ? [] : history.slice(0, index + 1);
  for (const m of moves) {
    try { g.move(m); } catch { }
  }
  return g;
}

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
  pgnCommentsByIndex: {}, // { moveIndex: commentString } extraído al cargar el PGN

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
        const evalObj = state.evaluationHistory.find(e => e.moveIndex === safeIndex);
        const currentEval = evalObj ? evalObj.score : 0;
        set({
          game: gameCopy,
          fen: gameCopy.fen(),
          currentMoveIndex: safeIndex,
          evaluation: currentEval,
          arrows: []
        });
        playChessSound(result.captured || result.san?.includes('x') ? 'capture' : 'move');
        return result;
      }

      const isEnteringExploreMode = !state.isExploreMode;
      const mainLineData = isEnteringExploreMode ? {
        history: [...state.history],
        evaluationHistory: [...state.evaluationHistory],
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

      const newBestMoves = { ...state.bestMoves };
      const newMoveEvaluations = { ...state.moveEvaluations };
      const newAlternativeLines = { ...state.alternativeLines };
      const newEvaluationHistory = state.evaluationHistory.filter(e => e.moveIndex <= state.currentMoveIndex);

      for (const key of Object.keys(newBestMoves)) {
        if (parseInt(key) >= state.currentMoveIndex + 1) delete newBestMoves[key];
      }
      for (const key of Object.keys(newMoveEvaluations)) {
        if (parseInt(key) >= state.currentMoveIndex + 1) delete newMoveEvaluations[key];
      }
      for (const key of Object.keys(newAlternativeLines)) {
        if (parseInt(key) >= state.currentMoveIndex + 1) delete newAlternativeLines[key];
      }

      set({
        game: gameCopy,
        fen: gameCopy.fen(),
        history: newHistory,
        currentMoveIndex: newHistory.length - 1,
        evaluation: 0,
        bestMoves: newBestMoves,
        moveEvaluations: newMoveEvaluations,
        alternativeLines: newAlternativeLines,
        evaluationHistory: newEvaluationHistory,
        isAnalyzing: false,
        analysisReady: true,
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
    const evalObj = state.mainLineData.evaluationHistory.find(e => e.moveIndex === targetIndex);

    set({
      game: gameCopy,
      fen: gameCopy.fen(),
      history: state.mainLineData.history,
      currentMoveIndex: targetIndex,
      evaluation: evalObj ? evalObj.score : 0,

      evaluationHistory: state.mainLineData.evaluationHistory,
      bestMoves: state.mainLineData.bestMoves,
      moveEvaluations: state.mainLineData.moveEvaluations,
      alternativeLines: state.mainLineData.alternativeLines,

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
      const evalObj = state.evaluationHistory.find(e => e.moveIndex === safeIndex);
      const currentEval = evalObj ? evalObj.score : 0;
      set({ game: gameCopy, fen: gameCopy.fen(), currentMoveIndex: safeIndex, evaluation: currentEval, arrows: [] });
      playChessSound('move');
    } catch (e) {
      console.error('goToMove error:', e);
    }
  },

  resetGame: () => {
    const state = get();
    if (state.gameId) analysisQueue.clearOpeningCache(state.gameId);
    set({ game: new Chess(), fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', history: [], currentMoveIndex: -1, ...ANALYSIS_RESET });
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
      
      const newEvaluationHistory = [];
      const newMoveEvaluations = {};
      let hasEvaluations = false;

      const comments = newGame.getComments();
      const pgnCommentsByIndex = {};

      for (let i = 0; i < verboseHistory.length; i++) {
        const move = verboseHistory[i];
        const matchComment = comments.find(c => c.fen === move.after);
        
        if (matchComment && matchComment.comment) {
          pgnCommentsByIndex[i] = matchComment.comment;
          const commentStr = matchComment.comment;
          
          const evalMatch = commentStr.match(/\[%eval\s+([-\d.]+)\]/);
          if (evalMatch) {
            newEvaluationHistory.push({ moveIndex: i, score: parseFloat(evalMatch[1]) });
            hasEvaluations = true;
          }

          // Usar la fuente de verdad centralizada de labels
          for (const label of MOVE_LABELS) {
            if (commentStr.includes(label)) {
              newMoveEvaluations[i] = label;
              break;
            }
          }
        }
      }

      // Calcular el reloj inicial (posición final de la partida cargada)
      let initialWhiteClock = null;
      let initialBlackClock = null;
      const lastIdx = verboseHistory.length - 1;
      for (let i = 0; i <= lastIdx; i++) {
        const comment = pgnCommentsByIndex[i];
        if (comment) {
          const match = comment.match(/\[%clk\s+([^\]]+)\]/);
          if (match) {
            if (verboseHistory[i].color === 'w') initialWhiteClock = match[1];
            else initialBlackClock = match[1];
          }
        }
      }

      const targetIdx = verboseHistory.length > 0 ? 0 : -1;
      const gameCopy = replayTo(verboseHistory, targetIdx);
      if (headers.FEN && targetIdx === -1) gameCopy.load(headers.FEN);

      const evalObj = newEvaluationHistory.find(e => e.moveIndex === targetIdx);

      set({
        game: gameCopy,
        fen: gameCopy.fen(),
        history: verboseHistory,
        currentMoveIndex: targetIdx,
        ...ANALYSIS_RESET,
        evaluationHistory: newEvaluationHistory,
        moveEvaluations: newMoveEvaluations,
        analysisReady: hasEvaluations,
        isAnalyzeFromPgn: hasEvaluations,
        wantsFullAnalysis: false,
        gameHeaders: headers,
        pgnCommentsByIndex,
        evaluation: evalObj ? evalObj.score : 0
      });

      // Setear relojes después del set principal para que el efecto del hook no los pise
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
    set({
      isAnalyzeFromPgn: false,
      wantsFullAnalysis: true,
      gameId: Date.now(),
      evaluationHistory: [],
      moveEvaluations: {},
      bestMoves: {},
      alternativeLines: {},
      analysisReady: false,
      isAnalyzing: false,
      analysisProgress: 0,
      gameScore: null,
    });
  },
});