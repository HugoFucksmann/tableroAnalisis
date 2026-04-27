import React, { useState, useEffect, useRef } from 'react';
import { EvaluationBar } from '../Analysis/EvaluationBar';
import { calculateMaterial } from '../../utils/chessUtils';
import { getActiveColor } from '../../utils/boardUtils';

import { PlayerArea } from './PlayerArea';
import { EvalBadgeOverlay } from './EvalBadge';
import { ConnectedChessboard } from './ConnectedChessboard';
import './Board.css';

// Selectors
import { 
  useFen, useMakeMove, useClocks, usePlayers, usePlayerElos, 
  useHistory, useCurrentMoveIndex, useBoardOrientation, useGoToMove
} from '../../store/selectors/gameSelectors';

// Analysis Hooks
import { useFullGameAnalysis } from '../../hooks/useFullGameAnalysis';
import { useLiveAnalysis } from '../../hooks/useLiveAnalysis';
import { useClockSync } from '../../hooks/useClockSync';
import { useEvaluationNavigation } from '../../hooks/useEvaluationNavigation';

// Board Hooks
import { useBoardInteraction, useBoardNavigation } from './hooks';

// ── Component ────────────────────────────────────────────────────────────────

export const Board = () => {
  // Sync Hooks
  useFullGameAnalysis();
  useLiveAnalysis();
  useClockSync();
  useEvaluationNavigation();

  // Selectors
  const fen = useFen();
  const makeMove = useMakeMove();
  const clocks = useClocks();
  const players = usePlayers();
  const playerElos = usePlayerElos();
  const history = useHistory();
  const currentMoveIndex = useCurrentMoveIndex();
  const boardOrientation = useBoardOrientation();
  const goToMove = useGoToMove();

  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const boardRef = useRef(null);

  // Board Hooks
  useBoardNavigation(boardRef, currentMoveIndex, history.length, goToMove);
  const { onDrop, onPromotionPieceSelect, promotionMove } = useBoardInteraction(makeMove);
  
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
            
            <ConnectedChessboard
                fen={fen}
                boardOrientation={boardOrientation}
                squareStyles={squareStyles}
                promotionMove={promotionMove}
                onDrop={onDrop}
                onPromotionPieceSelect={onPromotionPieceSelect}
            />

            <EvalBadgeOverlay />
          </div>
        </div>
      </div>

      <PlayerArea {...playerAreaProps(bottomSide, false)} />
    </div>
  );
};