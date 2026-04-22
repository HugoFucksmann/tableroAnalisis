import React from 'react';
import { Chessboard } from 'react-chessboard';
import { useGameStore } from '../../store/useGameStore';
import './Board.css';

const EVAL_ICONS = {
  'Brillante': { icon: '!!', bg: '#00c1b1' },
  'Genial': { icon: '!', bg: '#409cde' },
  'Libro': { icon: '📖', bg: '#917961' },
  'Mejor': { icon: '★', bg: '#79a83a' },
  'Excelente': { icon: '👍', bg: '#86a45e' },
  'Bueno': { icon: '✓', bg: '#7e9561' },
  'Imprecisión': { icon: '?!', bg: '#f2b134' },
  'Error': { icon: '?', bg: '#e6912c' },
  'Omisión': { icon: '✗', bg: '#d46d5a' },
  'Error grave': { icon: '??', bg: '#c23e30' },
};

const BADGE_SIZE = 36; // px — debe coincidir con Board.css .eval-badge width/height

export const Board = () => {
  const {
    fen, makeMove, clocks, arrows,
    gamePhase, openingName,
    history, currentMoveIndex, moveEvaluations,
  } = useGameStore();

  function onDrop({ sourceSquare, targetSquare }) {
    if (sourceSquare === targetSquare) return false;
    const move = makeMove({ from: sourceSquare, to: targetSquare, promotion: 'q' });
    return move !== null;
  }

  const combinedSquareStyles = React.useMemo(() => {
    if (currentMoveIndex < 0) return {};
    const currentMove = history[currentMoveIndex];
    if (!currentMove) return {};
    return {
      [currentMove.from]: { backgroundColor: 'rgba(255, 255, 100, 0.25)' },
      [currentMove.to]: { backgroundColor: 'rgba(255, 255, 100, 0.35)' },
    };
  }, [currentMoveIndex, history]);

  return (
    <div className="board-container">
      <div className="board-header-info">
        <span className="opening-label">{openingName}</span>
        <span className="phase-badge">{gamePhase}</span>
      </div>

      <div className="clock-display black">
        <span className="clock-label">NEGRAS</span>
        <span className="clock-time">{clocks.black}</span>
      </div>

      <div className="board-main-area">
        <Chessboard
          options={{
            position: fen,
            onPieceDrop: onDrop,
            boardOrientation: 'white',
            customDarkSquareStyle: { backgroundColor: '#2d3436' },
            customLightSquareStyle: { backgroundColor: '#636e72' },
            customArrows: arrows,
            customSquareStyles: combinedSquareStyles,
            animationDuration: 200,
          }}
        />

        <EvalBadgeOverlay
          currentMoveIndex={currentMoveIndex}
          history={history}
          moveEvaluations={moveEvaluations}
        />
      </div>

      <div className="clock-display white">
        <span className="clock-label">BLANCAS</span>
        <span className="clock-time">{clocks.white}</span>
      </div>
    </div>
  );
};

const EvalBadgeOverlay = ({ currentMoveIndex, history, moveEvaluations }) => {
  if (currentMoveIndex < 0) return null;
  const currentMove = history[currentMoveIndex];
  if (!currentMove) return null;
  const evalData = EVAL_ICONS[moveEvaluations[currentMoveIndex]];
  if (!evalData) return null;

  const file = currentMove.to.charCodeAt(0) - 'a'.charCodeAt(0); // 0–7
  const rank = parseInt(currentMove.to[1]) - 1;                  // 0–7

  // Borde derecho de la casilla en %, luego restamos el radio del badge
  const leftPct = ((file + 1) / 8) * 100;
  const topPct = ((7 - rank) / 8) * 100;

  return (
    <div className="eval-badge-overlay" aria-hidden="true">
      <div
        className="eval-badge"
        style={{
          left: `calc(${leftPct}% - ${BADGE_SIZE}px + 4px)`,
          top: `calc(${topPct}%  + 4px)`,
          backgroundColor: evalData.bg,
        }}
      >
        {evalData.icon}
      </div>
    </div>
  );
};