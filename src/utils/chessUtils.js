import { Chess } from 'chess.js';
import { PIECE_ICONS, MOVE_LABELS } from '../constants/chessConstants';

export function replayTo(history, index) {
  const g = new Chess();
  const moves = index < 0 ? [] : history.slice(0, index + 1);
  for (const m of moves) {
    try {
      g.move(m);
    } catch (e) {
      console.warn('Invalid move in history:', m);
    }
  }
  return g;
}

export function uciToCoords(uci) {
  if (!uci || uci.length < 4) return null;
  const from = uci.slice(0, 2);
  const to = uci.slice(2, 4);
  return { from, to };
}

export function normalizeFen(fen) {
  if (!fen) return '';
  return fen.split(' ').slice(0, 4).join(' ');
}

export function getPieceIcon(pieceChar, forcedSide) {
  if (!pieceChar) return '';
  const type = pieceChar.toUpperCase();
  const side = forcedSide || (pieceChar === pieceChar.toUpperCase() ? 'white' : 'black');
  return PIECE_ICONS[type]?.[side] || pieceChar;
}

export function calculateMaterial(fen) {
  if (!fen) return { white: { captured: [], score: 0 }, black: { captured: [], score: 0 } };

  const pieces = fen.split(' ')[0];
  const pieceValues = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

  const initialCounts = { P: 8, N: 2, B: 2, R: 2, Q: 1, p: 8, n: 2, b: 2, r: 2, q: 1 };
  const currentCounts = { P: 0, N: 0, B: 0, R: 0, Q: 0, p: 0, n: 0, b: 0, r: 0, q: 0 };

  for (const char of pieces) {
    if (currentCounts[char] !== undefined) {
      currentCounts[char]++;
    }
  }

  const whiteLost = [];
  const blackLost = [];
  let whiteMaterial = 0;
  let blackMaterial = 0;

  const pieceOrder = ['q', 'r', 'b', 'n', 'p'];

  pieceOrder.forEach(p => {
    const whitePiece = p.toUpperCase();
    const lostW = initialCounts[whitePiece] - currentCounts[whitePiece];
    for (let i = 0; i < lostW; i++) whiteLost.push(whitePiece);
    whiteMaterial += currentCounts[whitePiece] * pieceValues[p];

    const lostB = initialCounts[p] - currentCounts[p];
    for (let i = 0; i < lostB; i++) blackLost.push(p);
    blackMaterial += currentCounts[p] * pieceValues[p];
  });

  return {
    white: { captured: blackLost, score: whiteMaterial - blackMaterial },
    black: { captured: whiteLost, score: blackMaterial - whiteMaterial }
  };
}

export function extractPgnData(verboseHistory, comments) {
  // FIX: Inicializamos como diccionario (Object) para compatibilidad con el Store
  const evaluationHistory = {};
  const moveEvaluations = {};
  const pgnCommentsByIndex = {};
  let hasEvaluations = false;

  for (let i = 0; i < verboseHistory.length; i++) {
    const move = verboseHistory[i];
    const matchComment = comments.find(c => c.fen === move.after);

    if (matchComment && matchComment.comment) {
      pgnCommentsByIndex[i] = matchComment.comment;
      const commentStr = matchComment.comment;

      const evalMatch = commentStr.match(/\[%eval\s+([-\d.]+)\]/);
      if (evalMatch) {
        // FIX: Asignación O(1) directa al índice
        evaluationHistory[i] = { moveIndex: i, score: parseFloat(evalMatch[1]), mate: null };
        hasEvaluations = true;
      }

      for (const label of MOVE_LABELS) {
        if (commentStr.includes(label)) {
          moveEvaluations[i] = label;
          break;
        }
      }
    }
  }

  let initialWhiteClock = null;
  let initialBlackClock = null;

  for (let i = 0; i < verboseHistory.length; i++) {
    const comment = pgnCommentsByIndex[i];
    if (comment) {
      const match = comment.match(/\[%clk\s+([^\]]+)\]/);
      if (match) {
        if (verboseHistory[i].color === 'w' && initialWhiteClock === null) initialWhiteClock = match[1];
        if (verboseHistory[i].color === 'b' && initialBlackClock === null) initialBlackClock = match[1];
      }
    }
  }

  return { evaluationHistory, moveEvaluations, pgnCommentsByIndex, hasEvaluations, initialWhiteClock, initialBlackClock };
}