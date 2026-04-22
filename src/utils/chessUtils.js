import { Chess } from 'chess.js';
import { PIECE_ICONS } from '../constants/chessConstants';

/**
 * Reconstruye una instancia de Chess hasta un índice específico del historial.
 */
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

/**
 * Convierte un movimiento UCI (e2e4) a coordenadas de tablero.
 */
export function uciToCoords(uci) {
  if (!uci || uci.length < 4) return null;
  const from = uci.slice(0, 2);
  const to = uci.slice(2, 4);
  return { from, to };
}

/**
 * Normaliza el FEN para comparaciones básicas.
 */
export function normalizeFen(fen) {
  if (!fen) return '';
  return fen.split(' ').slice(0, 4).join(' ');
}

/**
 * Resuelve el icono de una pieza centralizadamente.
 * @param {string} pieceChar - Carácter de la pieza (P, N, B, R, Q, K o p, n, b, r, q, k)
 * @param {string} [forcedSide] - 'white' o 'black' para forzar color.
 */
export function getPieceIcon(pieceChar, forcedSide) {
  if (!pieceChar) return '';
  const type = pieceChar.toUpperCase();
  const side = forcedSide || (pieceChar === pieceChar.toUpperCase() ? 'white' : 'black');
  return PIECE_ICONS[type]?.[side] || pieceChar;
}

/**
 * Calcula las piezas capturadas y la diferencia de material.
 * Devuelve { white: { captured: string[], score: number }, black: { captured: string[], score: number } }
 */
export function calculateMaterial(fen) {
  if (!fen) return { white: { captured: [], score: 0 }, black: { captured: [], score: 0 } };
  
  const pieces = fen.split(' ')[0];
  const pieceValues = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
  
  const initialCounts = {
    P: 8, N: 2, B: 2, R: 2, Q: 1,
    p: 8, n: 2, b: 2, r: 2, q: 1
  };
  
  const currentCounts = {
    P: 0, N: 0, B: 0, R: 0, Q: 0,
    p: 0, n: 0, b: 0, r: 0, q: 0
  };
  
  for (const char of pieces) {
    if (currentCounts[char] !== undefined) {
      currentCounts[char]++;
    }
  }
  
  const whiteLost = []; // Pieces white lost
  const blackLost = []; // Pieces black lost
  
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
    white: {
      captured: blackLost,
      score: whiteMaterial - blackMaterial
    },
    black: {
      captured: whiteLost,
      score: blackMaterial - whiteMaterial
    }
  };
}
