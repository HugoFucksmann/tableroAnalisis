import React, { useMemo, useRef, useEffect } from 'react';
import { useGameStore } from '../../store/useGameStore';
import { useShallow } from 'zustand/react/shallow';
import { EVAL_CONFIG } from '../../constants/chessConstants.jsx';
import { getPieceIcon } from '../../utils/chessUtils';
import './MoveList.css';

export const MoveList = () => {
  const { history, moveEvaluations, currentMoveIndex, goToMove, isExploreMode, restoreMainLine } = useGameStore(useShallow(state => ({
    history: state.history,
    moveEvaluations: state.moveEvaluations,
    currentMoveIndex: state.currentMoveIndex,
    goToMove: state.goToMove,
    isExploreMode: state.isExploreMode,
    restoreMainLine: state.restoreMainLine,
  })));

  const scrollRef = useRef(null);

  // Auto-scroll al movimiento activo
  useEffect(() => {
    if (scrollRef.current) {
      const activeItem = scrollRef.current.querySelector('.move-item.active');
      if (activeItem) {
        activeItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, [currentMoveIndex]);

  const getSan = (entry) => (entry && typeof entry === 'object' ? entry.san : entry);

  // FIX: Memoización O(N) solo cuando cambia el historial o las evaluaciones
  const movePairs = useMemo(() => {
    const pairs = [];
    for (let i = 0; i < history.length; i += 2) {
      pairs.push({
        round: Math.floor(i / 2) + 1,
        white: { ...history[i], san: getSan(history[i]), index: i, eval: moveEvaluations[i] },
        black: history[i + 1]
          ? { ...history[i + 1], san: getSan(history[i + 1]), index: i + 1, eval: moveEvaluations[i + 1] }
          : null,
      });
    }
    return pairs;
  }, [history, moveEvaluations]);

  const renderMove = (move, side) => {
    if (!move) return null;
    const config = EVAL_CONFIG[move.eval];

    const pieceMatch = move.san.match(/^([NBRQK])/);
    const piece = pieceMatch ? pieceMatch[1] : null;
    const moveText = piece ? move.san.substring(1) : move.san;

    return (
      <div
        key={move.index}
        className={`move-item ${currentMoveIndex === move.index ? 'active' : ''} ${side}`}
        title={move.eval || ''}
        onClick={() => goToMove(move.index)}
      >
        <span className="san">
          {piece && <span className={`piece-icon ${side}`}>{getPieceIcon(piece, side)}</span>}
          <span className="move-text">{moveText}</span>
        </span>
        {config && (
          <span
            className="eval-icon"
            style={{ color: config.color, backgroundColor: config.bg }}
          >
            {config.icon}
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="move-list-container premium-scroll" ref={scrollRef}>
      <div className="move-list-header">
        <span>#</span>
        <span>Blancas</span>
        <span>Negras</span>
      </div>
      <div className="move-list-body">
        {isExploreMode && (
          <div className="explore-mode-banner">
            <span>Modo Exploración</span>
            <button onClick={restoreMainLine} className="restore-main-btn">Volver a la partida</button>
          </div>
        )}
        {movePairs.map((pair) => (
          <div key={pair.round} className="move-row">
            <span className="round-num">{pair.round}.</span>
            {renderMove(pair.white, 'white')}
            {renderMove(pair.black, 'black')}
          </div>
        ))}
        {history.length === 0 && (
          <div className="empty-history">Sin movimientos aún</div>
        )}
      </div>
    </div>
  );
};