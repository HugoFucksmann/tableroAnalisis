import React from 'react';
import { Chessboard } from 'react-chessboard';
import { useGameStore } from '../../store/useGameStore';
import './Board.css';

export const Board = () => {
  const { fen, makeMove, clocks, arrows, highlights, gamePhase, openingName } = useGameStore();

  function onDrop({ sourceSquare, targetSquare }) {
    // Pieza soltada en el mismo casillero (drag cancelado o click sin mover)
    if (sourceSquare === targetSquare) return false;

    const move = makeMove({
      from: sourceSquare,
      to: targetSquare,
      promotion: 'q',
    });
    return move !== null;
  }

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
            customSquareStyles: highlights,
            animationDuration: 200,
          }}
        />
      </div>

      <div className="clock-display white">
        <span className="clock-label">BLANCAS</span>
        <span className="clock-time">{clocks.white}</span>
      </div>
    </div>
  );
};