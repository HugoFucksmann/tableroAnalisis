import React from 'react';
import { Loader2 } from 'lucide-react';
import { RenderSan } from './MoveInsightCard';
import './MoveSection.css';

export const MoveRow = ({ move, isMaster, onClick, onMouseEnter, onMouseLeave }) => {
  return (
    <div
      className="move-row"
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className="move-main-info">
        <div className="move-san-group">
          <span className="move-san"><RenderSan san={move.san} /></span>
        </div>

        <div className="move-stats-row">
          <div className="win-rate-bar-compact">
            <div className="bar-seg w" style={{ width: `${isMaster ? move.white : move.winRate}%` }} />
            <div className="bar-seg d" style={{ width: `${isMaster ? move.draws : move.drawRate}%` }} />
            <div className="bar-seg l" style={{ width: `${isMaster ? move.black : move.lossRate}%` }} />
          </div>
          <span className="wr-val">
            {isMaster ? `${move.white}%` : `${move.winRate}%`}
          </span>
          {!isMaster && move.avgEval != null && (
            <span className={`eval-mini ${parseFloat(move.avgEval) > 0 ? 'pos' : 'neg'}`}>
              {parseFloat(move.avgEval) > 0 ? '+' : ''}{move.avgEval}
            </span>
          )}
        </div>
      </div>

      <div className="move-right-area">
        <span className="count-number">
          {move.count >= 1000 ? `${(move.count / 1000).toFixed(1)}k` : move.count}
        </span>
      </div>
    </div>
  );
};

export const MoveSection = ({ 
  moves, 
  title, 
  isMaster = false, 
  isLoading = false,
  onMoveClick,
  setHoveredExplorerMove
}) => {
  return (
    <section className="explorer-section">
      <div className="section-header">
        <span>{title}</span>
        {isLoading && <Loader2 className="gi-spin" size={10} />}
      </div>
      <div className="moves-list">
        {moves?.length > 0 ? (
          moves.slice(0, 15).map((move) => (
            <MoveRow
              key={move.san}
              move={move}
              isMaster={isMaster}
              onClick={() => onMoveClick(move.san)}
              onMouseEnter={() => setHoveredExplorerMove(move.san)}
              onMouseLeave={() => setHoveredExplorerMove(null)}
            />
          ))
        ) : (
          <div className="explorer-placeholder">
            <span>{isLoading ? 'Cargando datos…' : 'No hay registros'}</span>
          </div>
        )}
      </div>
    </section>
  );
};
