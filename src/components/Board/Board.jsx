import React, { useState, useEffect } from 'react';
import { Chessboard } from 'react-chessboard';
import { EvaluationBar } from '../Analysis/EvaluationBar';

import { useGameStore } from '../../store/useGameStore';
import { useAnalysisSync } from '../../hooks/useAnalysisSync';
import { calculateMaterial } from '../../utils/chessUtils';

import { PlayerArea } from './PlayerArea';
import { EvalBadgeOverlay } from './EvalBadge';
import './Board.css';

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Converts a UCI move string (e.g. "e2e4") to a react-chessboard v5 Arrow object.
 */
function uciToArrow(uci, color = 'rgb(0, 193, 177)') {
  if (!uci || uci.length < 4) return null;
  return { startSquare: uci.slice(0, 2), endSquare: uci.slice(2, 4), color };
}

/**
 * Derives whose turn it is from a FEN string.
 * Returns 'white' | 'black'.
 */
function getActiveColor(fen) {
  return fen?.split(' ')[1] === 'b' ? 'black' : 'white';
}

// ── Component ────────────────────────────────────────────────────────────────

export const Board = () => {
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
    arrows,
    boardOrientation,
  } = useGameStore();

  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);


  // ── Sounds ──────────────────────────────────────────────────────────────
  const moveSound = React.useMemo(() => new Audio('https://www.chess.com/chess-themes/pieces/neo/sounds/move-self.mp3'), []);
  const captureSound = React.useMemo(() => new Audio('https://www.chess.com/chess-themes/pieces/neo/sounds/capture.mp3'), []);

  React.useEffect(() => {
    if (currentMoveIndex < 0) return;
    const move = history[currentMoveIndex];
    if (!move) return;
    const isCapture = move.captured || move.san?.includes('x');
    (isCapture ? captureSound : moveSound).play().catch(() => { });
  }, [currentMoveIndex, history, moveSound, captureSound]);

  // ── Derived state ────────────────────────────────────────────────────────
  const material = React.useMemo(() => calculateMaterial(fen), [fen]);
  const activeColor = React.useMemo(() => getActiveColor(fen), [fen]);

  // Last-move highlight squares
  const squareStyles = React.useMemo(() => {
    const move = currentMoveIndex >= 0 ? history[currentMoveIndex] : null;
    if (!move) return {};
    return {
      [move.from]: { backgroundColor: 'rgba(255, 255, 100, 0.22)' },
      [move.to]: { backgroundColor: 'rgba(255, 255, 100, 0.32)' },
    };
  }, [currentMoveIndex, history]);

  // Merged arrows: engine best-move + store arrows (opening explorer, etc.)
  const combinedArrows = React.useMemo(() => {
    const engineArrow = uciToArrow(bestMoves[currentMoveIndex]);
    const storeArrows = arrows ?? [];
    const seen = new Set();
    const result = [];

    if (engineArrow) {
      seen.add(`${engineArrow.startSquare}-${engineArrow.endSquare}`);
      result.push(engineArrow);
    }
    for (const arrow of storeArrows) {
      const key = `${arrow.startSquare}-${arrow.endSquare}`;
      if (!seen.has(key)) {
        seen.add(key);
        result.push(arrow);
      }
    }
    return result;
  }, [bestMoves, currentMoveIndex, arrows]);

  // ── Event handlers ────────────────────────────────────────────────────────
  function onDrop({ sourceSquare, targetSquare }) {
    if (!targetSquare || sourceSquare === targetSquare) return false;
    return makeMove({ from: sourceSquare, to: targetSquare, promotion: 'q' }) !== null;
  }

  // ── Layout helpers ────────────────────────────────────────────────────────
  const topSide = boardOrientation === 'white' ? 'black' : 'white';
  const bottomSide = boardOrientation === 'white' ? 'white' : 'black';

  const playerAreaProps = (side, isTop) => ({
    side,
    name: players[side],
    clock: clocks[side] ?? null,
    material: material[side],
    isActive: activeColor === side,
    isTop,
  });

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="board-container">
      <PlayerArea {...playerAreaProps(topSide, true)} />

      <div className="board-main-layout">
        <div className="eval-bar-aside">
          <EvaluationBar orientation={isMobile ? 'horizontal' : 'vertical'} />
        </div>

        <div className="board-frame">
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
                animationDurationInMs: 180,
              }}
            />
            <EvalBadgeOverlay
              currentMoveIndex={currentMoveIndex}
              history={history}
              moveEvaluations={moveEvaluations}
              orientation={boardOrientation}
            />
          </div>
        </div>
      </div>

      <PlayerArea {...playerAreaProps(bottomSide, false)} />
    </div>
  );
};