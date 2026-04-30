import React, { useState, useEffect, useRef } from 'react';
import { EvaluationBar } from '../Analysis/EvaluationBar';
import { calculateMaterial } from '../../utils/chessUtils';
import { getActiveColor } from '../../utils/boardUtils';

import { PlayerArea } from './PlayerArea';
import { EvalBadgeOverlay } from './EvalBadge';
import { ConnectedChessboard } from './ConnectedChessboard';
import './Board.css';

import { 
  useFen, useMakeMove, useClocks, usePlayers, usePlayerElos, 
  useHistory, useCurrentMoveIndex, useBoardOrientation, useGoToMove
} from '../../store/selectors/gameSelectors';

import { useFullGameAnalysis } from '../../hooks/useFullGameAnalysis';
import { useLiveAnalysis } from '../../hooks/useLiveAnalysis';
import { useClockSync } from '../../hooks/useClockSync';
import { useEvaluationNavigation } from '../../hooks/useEvaluationNavigation';

import { useBoardInteraction, useBoardNavigation } from './hooks';
import { useGameStore } from '../../store/useGameStore';
import { playChessSound } from '../../utils/soundUtils';

export const Board = () => {
  useFullGameAnalysis();
  useLiveAnalysis();
  useClockSync();
  useEvaluationNavigation();

  const fen = useFen();
  const makeMoveNormal = useMakeMove();
  const clocks = useClocks();
  const players = usePlayers();
  const playerElos = usePlayerElos();
  const history = useHistory();
  const currentMoveIndex = useCurrentMoveIndex();
  const boardOrientation = useBoardOrientation();
  const goToMove = useGoToMove();

  const { appMode, puzzleState, setPuzzleState } = useGameStore();

  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const boardRef = useRef(null);

  useBoardNavigation(boardRef, currentMoveIndex, history.length, goToMove);

  const makeMove = React.useCallback((move) => {
    if (appMode === 'puzzle' && puzzleState && !puzzleState.isSolved) {
      // Puzzle logic interception
      const expectedMove = puzzleState.sequence[puzzleState.currentStep];
      const isPromotionExpected = expectedMove && expectedMove.length === 5;
      const uciMove = move.from + move.to + (isPromotionExpected ? (move.promotion || 'q') : '');

      if (uciMove === expectedMove) {
        // Correct move
        setPuzzleState(prev => ({ ...prev, isWrong: false, currentStep: prev.currentStep + 1, isSolved: prev.currentStep + 1 >= prev.sequence.length }));
        return makeMoveNormal(move);
      } else {
        // Wrong move
        setPuzzleState(prev => ({ ...prev, isWrong: true }));
        playChessSound('illegal'); // Feedback sonoro de error
        return null; // Reject move
      }
    }
    return makeMoveNormal(move);
  }, [appMode, puzzleState, makeMoveNormal, setPuzzleState]);

  const { onDrop, onPromotionPieceSelect, promotionMove } = useBoardInteraction(makeMove);
  
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