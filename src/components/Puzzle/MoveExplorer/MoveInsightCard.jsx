import React from 'react';
import { EVAL_CONFIG } from '../../../constants/chessConstants.jsx';
import { useGameStore } from '../../../store/useGameStore';
import { Cpu, Database } from 'lucide-react';
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
  const currentMoveIndex = useGameStore(state => state.currentMoveIndex);
  const evaluationHistory = useGameStore(state => state.evaluationHistory);
  const moveEvaluations = useGameStore(state => state.moveEvaluations);
  const history = useGameStore(state => state.history);

  const currentEval = evaluationHistory[currentMoveIndex];
  const currentMoveQuality = moveEvaluations[currentMoveIndex];
  const lastMove = currentMoveIndex >= 0 ? history[currentMoveIndex] : null;

  const totalGames = stats?.count || 0;
  const labels = stats?.labels || {};
  const topLabels = Object.entries(labels)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  return (
    <div className="move-insight-card">
      <div className="insight-header">
        <div className="insight-san-box">
          <span className="insight-label">Análisis de la posición</span>
          <span className="insight-san">{lastMove ? renderSan(lastMove.san) : 'Inicio'}</span>
        </div>

        <div className="insight-live-engine">
          <div className={`engine-eval-badge ${currentEval?.score > 0 ? 'pos' : 'neg'}`}>
            <Cpu size={14} className="engine-icon" />
            <span className="engine-score">
              {currentEval ? (
                currentEval.mate
                  ? `M${Math.abs(currentEval.mate)}`
                  : `${currentEval.score > 0 ? '+' : ''}${currentEval.score.toFixed(1)}`
              ) : '...'}
            </span>
          </div>
          {currentMoveQuality && (
            <div
              className="current-move-valuation"
              style={{ color: EVAL_CONFIG[currentMoveQuality.label]?.color || '#fff' }}
              title={currentMoveQuality.label}
            >
              {EVAL_CONFIG[currentMoveQuality.label]?.icon || '?'}
            </div>
          )}
        </div>
      </div>

      {(stats || topLabels.length > 0) && (
        <div className="insight-history-compact">
          <div className="history-stats-row">
            <Database size={12} className="db-icon" />
            <span className="stat-item">{totalGames} partidas registradas</span>
            {stats?.avgEval !== undefined && (
              <>
                <span className="stat-separator">•</span>
                <span className="stat-item">
                  Eval histórica: <span className={stats.avgEval > 0 ? 'pos' : 'neg'}>{stats.avgEval > 0 ? '+' : ''}{stats.avgEval}</span>
                </span>
              </>
            )}
          </div>

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
              Sin errores graves frecuentes en esta posición
            </div>
          )}
        </div>
      )}
    </div>
  );
};
