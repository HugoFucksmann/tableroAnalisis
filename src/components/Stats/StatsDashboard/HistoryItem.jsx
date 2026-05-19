import React from 'react';
import { AlertTriangle } from 'lucide-react';
import './HistoryItem.css';


export const HistoryItem = React.memo(({ item, selected, onToggle, onDelete }) => {
  const formattedDate = React.useMemo(() => {
    try {
      // Prefer gameDate (real match date) over date (analysis date)
      const raw = item.gameDate || item.date;
      return raw ? new Date(raw).toLocaleDateString() : '—';
    } catch {
      return '—';
    }
  }, [item.gameDate, item.date]);

  // win is stored as integer: 1=win, 0=draw, -1=loss
  const resultLabel = item.win === 1 ? 'Victoria' : item.win === 0 ? 'Empate' : 'Derrota';
  const resultClass = item.win === 1 ? 'win' : item.win === 0 ? 'draw' : 'loss';

  // Derive opponent from stored field; fallback to white/black player names
  const opponent = item.opponent
    || (item.color === 'white' ? item.playerBlack : item.playerWhite)
    || null;

  return (
    <div
      className={`history-item ${selected ? 'selected' : ''}`}
      onClick={() => onToggle(item.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onToggle(item.id);
        }
      }}
      role="button"
      tabIndex={0}
    >
      <div className="hi-check"><div className="hi-check-inner"></div></div>
      <div className="hi-main">
        <div className="hi-opening">{item.opening || 'Unknown Opening'}</div>
        <div className="hi-meta">
          <span>{formattedDate}</span>
          {opponent && (
            <span className="hi-opponent" title="Rival">vs {opponent}</span>
          )}
          <span>{item.moveCount} jugadas</span>
          {item.timeControl && (
            <span className="hi-tc">{item.timeControl}</span>
          )}
          <span className={`hi-result-badge ${resultClass}`}>
            {resultLabel}
          </span>
          <span style={{ color: 'var(--text-muted)' }}>
            {item.color === 'white' ? '♙' : '♟'}
          </span>
        </div>
      </div>
      <div className="hi-acc">
        <div className="hi-acc-val">
          {item.color === 'white' ? item.white?.accuracy : item.black?.accuracy}%
        </div>
        <div className="hi-acc-label">precisión</div>
      </div>
      <div className="hi-actions">
        <button
          className="hi-delete"
          onClick={(e) => onDelete(item.id, e)}
          title="Borrar"
        >
          <AlertTriangle size={13} />
        </button>
      </div>
    </div>
  );
});
