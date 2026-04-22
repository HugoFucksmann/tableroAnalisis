import { Chess } from 'chess.js';

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
