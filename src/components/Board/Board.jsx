import React, { useState, useEffect, useRef } from 'react';
import { Chessboard } from 'react-chessboard';
import { EvaluationBar } from '../Analysis/EvaluationBar';
import { useGameStore } from '../../store/useGameStore';
import { useShallow } from 'zustand/react/shallow';
import { useAnalysisSync } from '../../hooks/useAnalysisSync';
import { calculateMaterial } from '../../utils/chessUtils';

import { PlayerArea } from './PlayerArea';
import { EvalBadgeOverlay } from './EvalBadge';
import { ArrowEvalOverlay } from './ArrowEvalOverlay';
import './Board.css';

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Converts a UCI move string (e.g. "e2e4") to a react-chessboard v5 Arrow object.
 */
function uciToArrow(uci, color = 'rgba(217, 119, 6, 0.8)') {
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

/**
 * Calcula la diferencia de evaluación.
 * Asegura que ambas unidades estén en "peones" (no centipeones).
 */
function computeDelta(lineObj, baselineScore, baselineMate, isBlackTurn) {
  if (lineObj.mate != null) return { delta: null, mate: lineObj.mate };
  if (baselineMate != null) return { delta: null, mate: null };

  const lineScore = lineObj.score;
  if (lineScore == null || baselineScore == null) return { delta: null, mate: null };

  const parsedLine = parseFloat(lineScore);
  const parsedBaseline = parseFloat(baselineScore);

  if (isNaN(parsedLine) || isNaN(parsedBaseline)) return { delta: null, mate: null };

  // Ambos ya son white-centric pawns (positivos = ventaja blanca).
  const rawDelta = parsedLine - parsedBaseline;
  
  // Convertimos a perspectiva del jugador (player-relative):
  // Si juegan negras, un incremento positivo de rawDelta significa
  // que las blancas mejoran, por lo que las negras pierden (delta negativo).
  const playerDelta = isBlackTurn ? -rawDelta : rawDelta;

  return { delta: playerDelta, mate: null };
}

// ── Component ────────────────────────────────────────────────────────────────

export const Board = () => {
  useAnalysisSync();

  const fen = useGameStore(state => state.fen);
  const makeMove = useGameStore(state => state.makeMove);
  const clocks = useGameStore(state => state.clocks);
  const players = useGameStore(state => state.players);
  const playerElos = useGameStore(state => state.playerElos);
  const history = useGameStore(state => state.history);
  const currentMoveIndex = useGameStore(state => state.currentMoveIndex);
  const boardOrientation = useGameStore(state => state.boardOrientation);
  const goToMove = useGameStore(state => state.goToMove);
  const arrows = useGameStore(state => state.arrows);
  const moveEvaluations = useGameStore(state => state.moveEvaluations);

  // Subscripciones específicas a la jugada actual para evitar re-renders por otras jugadas
  const currentLines = useGameStore(state => state.alternativeLines[state.currentMoveIndex]);
  const currentBestMove = useGameStore(state => state.bestMoves[state.currentMoveIndex]);
  const currentEval = useGameStore(useShallow(state => state.evaluationHistory[state.currentMoveIndex]));

  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [promotionMove, setPromotionMove] = useState(null);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // ── Wheel navigation ──────────────────────────────────────────────────────
  const boardRef = useRef(null);
  const scrollState = useRef({ currentMoveIndex, maxIndex: history.length - 1 });

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
      if (now - lastScrollTime < 60) return;

      const { currentMoveIndex: currentIdx, maxIndex } = scrollState.current;

      if (e.deltaY > 0) {
        if (currentIdx < maxIndex) {
          goToMove(currentIdx + 1);
          lastScrollTime = now;
        }
      }
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

  const squareStyles = React.useMemo(() => {
    const highlights = {};
    const move = currentMoveIndex >= 0 ? history[currentMoveIndex] : null;
    if (move) {
      highlights[move.from] = { backgroundColor: 'rgba(255, 255, 100, 0.22)' };
      highlights[move.to] = { backgroundColor: 'rgba(255, 255, 100, 0.32)' };
    }
    return highlights;
  }, [currentMoveIndex, history]);

  // ── Arrows logic ─────────────────────────────────────────────────────────
  const { combinedArrows, arrowsWithDelta } = React.useMemo(() => {
    const storeArrows = arrows ?? [];
    const lines = currentLines ?? [];
    const arrowMap = new Map(); // key → { arrow, delta, mate, isEngineArrow }

    const isBlackTurn = activeColor === 'black';

    // Opción B: Usar la mejor jugada del motor como base comparativa
    const bestLine = lines.find(l => l.multipv === 1);
    const baselineScore = bestLine?.score ?? currentEval?.score ?? null;
    const baselineMate = bestLine?.mate ?? currentEval?.mate ?? null;

    // 1. Líneas MultiPV del motor (con delta de evaluación)
    lines.forEach((line) => {
      const opacities = { 1: '0.9', 2: '0.7', 3: '0.5', 4: '0.3', 5: '0.15' };
      const opacity = opacities[line.multipv] || '0.1';
      const color = `rgba(217, 119, 6, ${opacity})`;

      const arrow = uciToArrow(line.move, color);
      if (!arrow) return;

      const key = `${arrow.startSquare}-${arrow.endSquare}`;
      if (arrowMap.has(key)) return;

      const { delta, mate } = computeDelta(line, baselineScore, baselineMate, isBlackTurn);

      arrowMap.set(key, { arrow, delta, mate, isEngineArrow: true });
    });

    // 2. Fallback: single bestMove (Si el motor solo dio la jugada principal)
    if (arrowMap.size === 0 && currentBestMove) {
      const arrow = uciToArrow(currentBestMove, 'rgba(217, 119, 6, 0.8)');
      if (arrow) {
        const key = `${arrow.startSquare}-${arrow.endSquare}`;
        // Como es la mejor jugada por defecto (no tenemos scores alternativos), 
        // le asignamos un delta de 0 para que muestre el símbolo '='.
        arrowMap.set(key, { arrow, delta: 0, mate: baselineMate, isEngineArrow: true });
      }
    }

    // 3. Flechas del store (Aperturas o pintadas manualmente)
    for (const storeArrow of storeArrows) {
      const key = `${storeArrow.startSquare}-${storeArrow.endSquare}`;
      if (storeArrows.length === 1) {
        // Single store arrow overrides (e.g. hovered explorer move)
        arrowMap.set(key, { arrow: storeArrow, delta: null, mate: null, isEngineArrow: false });
      } else {
        if (!arrowMap.has(key)) {
          arrowMap.set(key, { arrow: storeArrow, delta: null, mate: null, isEngineArrow: false });
        }
      }
    }
    const entries = Array.from(arrowMap.values());
    return {
      combinedArrows: entries.map(e => e.arrow),
      arrowsWithDelta: entries,
    };
  }, [currentLines, currentBestMove, currentMoveIndex, arrows, currentEval, activeColor]);

  // ── Event handlers ────────────────────────────────────────────────────────
  function onDrop(arg1, arg2, arg3) {
    const sourceSquare = typeof arg1 === 'object' ? arg1.sourceSquare : arg1;
    const targetSquare = typeof arg1 === 'object' ? arg1.targetSquare : arg2;
    const piece = typeof arg1 === 'object' ? arg1.piece : arg3;

    if (!targetSquare || sourceSquare === targetSquare) return false;

    const isPawn = piece ? piece[1] === 'P' : true;
    const isPromotionRank = targetSquare[1] === '8' || targetSquare[1] === '1';

    if (isPawn && isPromotionRank) {
      setPromotionMove({ from: sourceSquare, to: targetSquare });
      return false;
    }

    return makeMove({ from: sourceSquare, to: targetSquare, promotion: 'q' }) !== null;
  }

  function onPromotionPieceSelect(piece) {
    if (piece && promotionMove) {
      const promPiece = piece[1].toLowerCase();
      makeMove({ ...promotionMove, promotion: promPiece });
    }
    setPromotionMove(null);
    return true;
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
          {/* IMPORTANTE: position: relative en el CSS de board-main-area */}
          <div className="board-main-area" ref={boardRef}>
            <Chessboard
              options={{
                position: fen,
                onPieceDrop: onDrop,
                boardOrientation: boardOrientation,
                darkSquareStyle: { backgroundColor: '#292524' },
                lightSquareStyle: { backgroundColor: '#57534e' },
                arrows: combinedArrows,
                squareStyles: squareStyles,
                animationDurationInMs: 180,
              }}
              promotionToSquare={promotionMove?.to ?? null}
              onPromotionPieceSelect={onPromotionPieceSelect}
            />

            {/* Eval delta badges floating above each engine arrow */}
            <ArrowEvalOverlay
              arrowsWithDelta={arrowsWithDelta}
              orientation={boardOrientation}
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