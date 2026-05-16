import React from 'react';
import { AlertTriangle } from 'lucide-react';

export const HistoryItem = React.memo(({ item, selected, onToggle, onDelete }) => {
  const formattedDate = React.useMemo(() => {
    try {
      return new Date(item.date).toLocaleDateString();
    } catch {
      return 'Unknown date';
    }
  }, [item.date]);

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
          <span>{item.moveCount} jugadas</span>
          {item.timeControl && (
            <span className="hi-tc">{item.timeControl}</span>
          )}
          <span className={`hi-result-badge ${item.win ? 'win' : 'loss'}`}>
            {item.win ? 'Victoria' : 'Derrota'}
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
