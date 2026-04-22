import React from 'react';
import { useGameStore } from '../../store/useGameStore';
import { EVAL_CONFIG, PIECE_ICONS } from '../../constants/chessConstants.jsx';
import './MoveList.css';

export const MoveList = () => {
  const { history, moveEvaluations, currentMoveIndex, goToMove } = useGameStore();
  const scrollRef = React.useRef(null);

  // Auto-scroll al movimiento activo
  React.useEffect(() => {
    if (scrollRef.current) {
      const activeItem = scrollRef.current.querySelector('.move-item.active');
      if (activeItem) {
        activeItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, [currentMoveIndex]);

  const getSan = (entry) =>
    entry && typeof entry === 'object' ? entry.san : entry;

  const movePairs = [];
  for (let i = 0; i < history.length; i += 2) {
    movePairs.push({
      round: Math.floor(i / 2) + 1,
      white: { san: getSan(history[i]), index: i, eval: moveEvaluations[i] },
      black: history[i + 1]
        ? { san: getSan(history[i + 1]), index: i + 1, eval: moveEvaluations[i + 1] }
        : null,
    });
  }

  const renderMove = (move) => {
    if (!move) return null;
    const config = EVAL_CONFIG[move.eval];

    const pieceMatch = move.san.match(/^([NBRQK])/);
    const piece = pieceMatch ? pieceMatch[1] : null;
    const moveText = piece ? move.san.substring(1) : move.san;

    return (
      <div
        key={move.index}
        className={`move-item ${currentMoveIndex === move.index ? 'active' : ''}`}
        title={move.eval || ''}
        onClick={() => goToMove(move.index)}
      >
        <span className="san">
          {piece && <span className="piece-icon">{PIECE_ICONS[piece]}</span>}
          {moveText}
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
        {movePairs.map((pair) => (
          <div key={pair.round} className="move-row">
            <span className="round-num">{pair.round}.</span>
            {renderMove(pair.white)}
            {renderMove(pair.black)}
          </div>
        ))}
        {history.length === 0 && (
          <div className="empty-history">Sin movimientos aún</div>
        )}
      </div>
    </div>
  );
};