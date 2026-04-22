import React from 'react';
import { Chessboard } from 'react-chessboard';
import { useGameStore } from '../../store/useGameStore';
import { useAnalysisSync } from '../../hooks/useAnalysisSync';
import './Board.css';

import { EVAL_CONFIG } from '../../constants/chessConstants.jsx';
import './Board.css';

const BADGE_SIZE = 36;

/**
 * Convierte "e2e4" → objeto Arrow que entiende react-chessboard v5:
 * { startSquare, endSquare, color }
 */
function uciToArrow(uci, color = 'rgb(0, 193, 177)') {
  if (!uci || uci.length < 4) return null;
  return { startSquare: uci.slice(0, 2), endSquare: uci.slice(2, 4), color };
}

export const Board = () => {
  // Inyectamos la lógica de análisis
  useAnalysisSync();

  const {
    fen,
    makeMove,
    clocks,
    players,
    history,
    currentMoveIndex,
    moveEvaluations,
    bestMoves,
    arrows,          // Arrow[] del store (vienen de OpeningExplorer u otros)
    boardOrientation,
  } = useGameStore();

  // ── Highlight de la última jugada ────────────────────────────────────────

  // ── Highlight de la última jugada ────────────────────────────────────────
  const squareStyles = React.useMemo(() => {
    if (currentMoveIndex < 0) return {};
    const currentMove = history[currentMoveIndex];
    if (!currentMove) return {};
    return {
      [currentMove.from]: { backgroundColor: 'rgba(255, 255, 100, 0.25)' },
      [currentMove.to]: { backgroundColor: 'rgba(255, 255, 100, 0.35)' },
    };
  }, [currentMoveIndex, history]);

  // ── Flechas: motor (bestMove) + aperturas/manuales (arrows del store) ────
  // En v5, arrows es Arrow[] = [{ startSquare, endSquare, color }, ...]
  const combinedArrows = React.useMemo(() => {
    const engineArrow = uciToArrow(bestMoves[currentMoveIndex]);
    const base = engineArrow ? [engineArrow] : [];
    const storeArrows = arrows ?? [];

    // Usamos un Set para evitar duplicados que causan errores de keys en react-chessboard
    const seen = new Set();
    const result = [];

    // Primero agregamos la del motor (prioridad de visualización)
    if (engineArrow) {
      const key = `${engineArrow.startSquare}-${engineArrow.endSquare}`;
      seen.add(key);
      result.push(engineArrow);
    }

    // Luego agregamos las del store (Lichess / Aperturas) si no están repetidas
    for (const arrow of storeArrows) {
      const key = `${arrow.startSquare}-${arrow.endSquare}`;
      if (!seen.has(key)) {
        seen.add(key);
        result.push(arrow);
      }
    }

    return result;
  }, [bestMoves, currentMoveIndex, arrows]);

  // ── Handler de drop ──────────────────────────────────────────────────────
  // En v5 onPieceDrop recibe { piece, sourceSquare, targetSquare }
  // targetSquare puede ser null si se suelta fuera del tablero
  function onDrop({ sourceSquare, targetSquare }) {
    if (!targetSquare || sourceSquare === targetSquare) return false;
    const move = makeMove({ from: sourceSquare, to: targetSquare, promotion: 'q' });
    return move !== null;
  }

  const topPlayer = boardOrientation === 'white' ? 'black' : 'white';
  const bottomPlayer = boardOrientation === 'white' ? 'white' : 'black';

  return (
    <div className="board-container">
      {/* Top Player (Opponent if orientation is correct) */}
      <div className={`clock-display ${topPlayer}`}>
        <span className="clock-label">{players[topPlayer]}</span>
        {clocks[topPlayer] && <span className="clock-time">{clocks[topPlayer]}</span>}
      </div>

      <div className="board-main-area">
        <Chessboard
          options={{
            position: fen,
            onPieceDrop: onDrop,
            boardOrientation: boardOrientation,
            darkSquareStyle: { backgroundColor: '#2d3436' },
            lightSquareStyle: { backgroundColor: '#636e72' },
            arrows: combinedArrows,
            squareStyles: squareStyles,
            animationDurationInMs: 200,
          }}
        />
        <EvalBadgeOverlay
          currentMoveIndex={currentMoveIndex}
          history={history}
          moveEvaluations={moveEvaluations}
          orientation={boardOrientation}
        />
      </div>

      {/* Bottom Player (Current User perspective) */}
      <div className={`clock-display ${bottomPlayer}`}>
        <span className="clock-label">{players[bottomPlayer]}</span>
        {clocks[bottomPlayer] && <span className="clock-time">{clocks[bottomPlayer]}</span>}
      </div>
    </div>
  );
};

// ── Badge de evaluación sobre el tablero ─────────────────────────────────
const EvalBadgeOverlay = ({ currentMoveIndex, history, moveEvaluations, orientation }) => {
  if (currentMoveIndex < 0) return null;
  const currentMove = history[currentMoveIndex];
  if (!currentMove) return null;
  const evalData = EVAL_CONFIG[moveEvaluations[currentMoveIndex]];
  if (!evalData) return null;

  // Calculamos la posición 0-7
  let file = currentMove.to.charCodeAt(0) - 'a'.charCodeAt(0);
  let rank = parseInt(currentMove.to[1]) - 1;

  // Si el tablero está girado, invertimos las coordenadas
  if (orientation === 'black') {
    file = 7 - file;
    rank = 7 - rank;
  }

  // En el sistema de coordenadas de CSS (top:0 es arriba), la fila 0 (rank 1) está abajo.
  // Por lo tanto, necesitamos invertir el rank para el topPct.
  const leftPct = (file / 8) * 100;
  const topPct = ((7 - rank) / 8) * 100;

  return (
    <div className="eval-badge-overlay" aria-hidden="true">
      <div
        className="eval-badge"
        style={{
          left: `calc(${leftPct}% + (100% / 8) - ${BADGE_SIZE}px + 4px)`,
          top: `calc(${topPct}% + 4px)`,
          backgroundColor: evalData.bg,
        }}
      >
        {evalData.icon}
      </div>
    </div>
  );
};