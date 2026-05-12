import React from 'react';
import { EVAL_CONFIG } from '../../../constants/chessConstants.jsx';
import './MoveInsightCard.css';

const SPECIAL_LABELS = {
  'Insta-move Blunder': { color: '#f44336', label: 'IB' },
  'Deep-think Blunder': { color: '#b71c1c', label: 'DB' },
  'Time Pressure Error': { color: '#ff5722', label: 'TP' }
};

export const renderSan = (san) => {
  const pieceIcons = {
    'N': '♘', 'B': '♗', 'R': '♖', 'Q': '♕', 'K': '♔'
  };
  const firstChar = san[0];
  if (pieceIcons[firstChar]) {
    return (
      <>
        <span className="piece-icon-not">{pieceIcons[firstChar]}</span>
        {san.substring(1)}
      </>
    );
  }
  return san;
};

export const MoveInsightCard = ({ stats }) => {
  if (!stats) return null;

  const totalGames = stats.count;
  const labels = stats.labels || {};
  
  const topLabels = Object.entries(labels)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  return (
    <div className="move-insight-card">
      <div className="insight-header">
        <div className="insight-san-box">
          <span className="insight-label">Análisis de la última jugada</span>
          <span className="insight-san">{renderSan(stats.san)}</span>
        </div>
        <div className="insight-summary">
          <div className="insight-stat">
            <span className="val">{totalGames}</span>
            <span className="lbl">Partidas</span>
          </div>
          <div className="insight-stat">
            <span className={`val ${parseFloat(stats.avgEval) > 0 ? 'pos' : 'neg'}`}>
              {stats.avgEval > 0 ? '+' : ''}{stats.avgEval || '0.0'}
            </span>
            <span className="lbl">Eval. Media</span>
          </div>
        </div>
      </div>

      <div className="insight-history-compact">
        {topLabels.length > 0 ? (
          <div className="top-valuations">
            {topLabels.map(([label, count]) => {
              const config = EVAL_CONFIG[label] || SPECIAL_LABELS[label];
              return (
                <div key={label} className="valuation-pill-large" style={{ backgroundColor: config?.bg || 'rgba(255,255,255,0.05)' }}>
                  <span className="v-icon" style={{ color: config?.color }}>{config?.icon || '?'}</span>
                  <span className="v-count">{count}</span>
                  <span className="v-label">{label}</span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="no-errors-msg">
            <span className="v-icon" style={{ color: '#4caf50' }}>✓</span>
            Sin errores registrados en esta posición
          </div>
        )}
      </div>
    </div>
  );
};
