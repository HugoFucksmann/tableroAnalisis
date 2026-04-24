import React, { useState, useEffect } from 'react';
import { Chessboard } from 'react-chessboard';
import { EvaluationBar } from '../Analysis/EvaluationBar';
import { useGameStore } from '../../store/useGameStore';
import { useShallow } from 'zustand/react/shallow';
import { useAnalysisSync } from '../../hooks/useAnalysisSync';
import { calculateMaterial, replayTo } from '../../utils/chessUtils';

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
    playerElos,
    history,
    currentMoveIndex,
    moveEvaluations,
    bestMoves,
    alternativeLines,
    arrows,
    boardOrientation,
    goToMove,
  } = useGameStore(useShallow(state => ({
    fen: state.fen,
    makeMove: state.makeMove,
    clocks: state.clocks,
    players: state.players,
    playerElos: state.playerElos,
    history: state.history,
    currentMoveIndex: state.currentMoveIndex,
    moveEvaluations: state.moveEvaluations,
    bestMoves: state.bestMoves,
    alternativeLines: state.alternativeLines,
    arrows: state.arrows,
    boardOrientation: state.boardOrientation,
    goToMove: state.goToMove,
  })));

  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // ── Wheel navigation ──────────────────────────────────────────────────────
  const boardRef = React.useRef(null);
  const scrollState = React.useRef({ currentMoveIndex, maxIndex: history.length - 1 });

  useEffect(() => {
    scrollState.current = { currentMoveIndex, maxIndex: history.length - 1 };
  }, [currentMoveIndex, history.length]);

  useEffect(() => {
    const el = boardRef.current;
    if (!el) return;

    let lastScrollTime = 0;

    const handleWheel = (e) => {
      e.preventDefault();
      
      const now = performance.now();
      // Throttle de 60ms para evitar saltos locos con trackpads o scroll muy rápido
      if (now - lastScrollTime < 60) return;

      const { currentMoveIndex: currentIdx, maxIndex } = scrollState.current;

      // Scroll hacia abajo (deltaY > 0) -> Siguiente jugada
      if (e.deltaY > 0) {
        if (currentIdx < maxIndex) {
          goToMove(currentIdx + 1);
          lastScrollTime = now;
        }
      } 
      // Scroll hacia arriba (deltaY < 0) -> Jugada anterior
      else if (e.deltaY < 0) {
        if (currentIdx > -1) {
          goToMove(currentIdx - 1);
          lastScrollTime = now;
        }
      }
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [goToMove]);

  // ── Derived state ────────────────────────────────────────────────────────
  const material = React.useMemo(() => calculateMaterial(fen), [fen]);
  const activeColor = React.useMemo(() => getActiveColor(fen), [fen]);

  // Last-move highlight squares
  const squareStyles = React.useMemo(() => {
    const highlights = {};
    
    // 1. Last move highlights
    const move = currentMoveIndex >= 0 ? history[currentMoveIndex] : null;
    if (move) {
      highlights[move.from] = { backgroundColor: 'rgba(255, 255, 100, 0.22)' };
      highlights[move.to] = { backgroundColor: 'rgba(255, 255, 100, 0.32)' };
    }

    return highlights;
  }, [currentMoveIndex, history]);

  // Merged arrows: engine alternative lines (max 5) + store arrows (opening explorer)
  const combinedArrows = React.useMemo(() => {
    const storeArrows = arrows ?? [];
    const lines = alternativeLines[currentMoveIndex] ?? [];
    const arrowMap = new Map();

    // 1) Motor: Mostrar todas las líneas alternativas calculadas por el motor (según config MultiPV)
    lines.forEach((line) => {
      // Opacidad decreciente según el ranking: 90%, 70%, 50%, 30%, 15%
      const opacities = { 1: '0.9', 2: '0.7', 3: '0.5', 4: '0.3', 5: '0.15' };
      const opacity = opacities[line.multipv] || '0.1';
      const color = `rgba(0, 193, 177, ${opacity})`;

      const arrow = uciToArrow(line.move, color);
      if (arrow) {
        const key = `${arrow.startSquare}-${arrow.endSquare}`;
        if (!arrowMap.has(key)) {
          arrowMap.set(key, arrow);
        }
      }
    });

    // Fallback: si no hay líneas pero sí bestMove (por si acaso)
    if (arrowMap.size === 0 && bestMoves[currentMoveIndex]) {
      const arrow = uciToArrow(bestMoves[currentMoveIndex], 'rgba(0, 193, 177, 0.9)');
      if (arrow) {
        const key = `${arrow.startSquare}-${arrow.endSquare}`;
        arrowMap.set(key, arrow);
      }
    }

    // 2) Flechas del store (ej: Opening Explorer)
    for (const arrow of storeArrows) {
      const key = `${arrow.startSquare}-${arrow.endSquare}`;
      
      // Si es un "hover" activo del explorador (suele ser 1 sola flecha),
      // sobreescribimos la flecha del motor para que destaque la azul fuerte.
      // Si son las flechas default del libro (varias), priorizamos las del motor.
      if (storeArrows.length === 1) {
        arrowMap.set(key, arrow);
      } else {
        if (!arrowMap.has(key)) {
          arrowMap.set(key, arrow);
        }
      }
    }
    
    return Array.from(arrowMap.values());
  }, [alternativeLines, bestMoves, currentMoveIndex, arrows]);

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
    elo: playerElos?.[side] ?? null,
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
          <div className="board-main-area" ref={boardRef}>
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