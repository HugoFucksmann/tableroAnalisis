import React from 'react';
import { Trash2 } from 'lucide-react';
import './HistoryItem.css';

const formatTimeControl = (tc) => {
  if (!tc) return '';
  tc = String(tc).trim();
  if (tc === '-' || tc === '?') return '';

  // Si tiene formato de tiempo HH:MM:SS o MM:SS
  if (tc.includes(':')) {
    const parts = tc.split(':').map(Number);
    let totalSeconds = 0;
    if (parts.length === 3) {
      totalSeconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
    } else if (parts.length === 2) {
      totalSeconds = parts[0] * 60 + parts[1];
    }
    if (!isNaN(totalSeconds) && totalSeconds > 0) {
      const mins = Math.floor(totalSeconds / 60);
      const secs = totalSeconds % 60;
      return secs === 0 ? `${mins}m` : `${mins}m ${secs}s`;
    }
    return tc;
  }

  // Si tiene un formato tipo "segundos+incremento" o "minutos+incremento"
  const plusIndex = tc.indexOf('+');
  if (plusIndex !== -1) {
    const baseStr = tc.substring(0, plusIndex);
    const incStr = tc.substring(plusIndex + 1);
    const baseVal = parseInt(baseStr, 10);
    const incVal = parseInt(incStr, 10);

    if (!isNaN(baseVal)) {
      // Si la base es >= 60, asumimos que son segundos (ej. 300+5, 600+0)
      if (baseVal >= 60) {
        const mins = Math.floor(baseVal / 60);
        return isNaN(incVal) ? `${mins}m` : `${mins}+${incVal}`;
      }
      // Si la base es < 60, ya está en minutos (ej. 5+0, 10+5)
      return tc;
    }
  } else {
    // Es un valor simple (ej. "300", "600", "blitz", "5m")
    const val = parseInt(tc, 10);
    if (!isNaN(val)) {
      if (val >= 60) {
        return `${Math.floor(val / 60)}m`;
      }
      return `${val}m`;
    }
  }

  return tc;
};

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

  const formattedTC = React.useMemo(() => {
    return formatTimeControl(item.timeControl);
  }, [item.timeControl]);

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
          {formattedTC && (
            <span className="hi-tc">{formattedTC}</span>
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
        <button
          className="hi-delete-btn"
          title="Eliminar análisis"
          onClick={(e) => { e.stopPropagation(); onDelete(item.id, e); }}
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
});
