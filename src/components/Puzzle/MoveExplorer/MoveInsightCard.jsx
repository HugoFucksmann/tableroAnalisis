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
    <div className="move-insight-card-modern">
      <div className="insight-main-row">
        <div className="current-move-display">
          <div className="move-target-icon">
            <div className="target-dot" />
          </div>
          <div className="move-info-text">
            <span className="move-san-large">{lastMove ? renderSan(lastMove.san) : 'Inicio'}</span>
            <span className="move-context-label">{lastMove ? 'Jugada actual' : 'Posición inicial'}</span>
          </div>
        </div>

        <div className="engine-status-area">
          <div className={`engine-score-capsule ${currentEval?.score > 0 ? 'pos' : 'neg'}`}>
            <Cpu size={12} className="cpu-icon" />
            <span className="score-val">
              {currentEval ? (
                currentEval.mate
                  ? `M${Math.abs(currentEval.mate)}`
                  : `${currentEval.score > 0 ? '+' : ''}${currentEval.score.toFixed(1)}`
              ) : '...'}
            </span>
          </div>
          
          {currentMoveQuality && (
            <div className="quality-indicator" title={currentMoveQuality.label}>
              <span className="quality-icon" style={{ color: EVAL_CONFIG[currentMoveQuality.label]?.color }}>
                {EVAL_CONFIG[currentMoveQuality.label]?.icon || '?'}
              </span>
            </div>
          )}
        </div>
      </div>

      {(stats || topLabels.length > 0) && (
        <div className="historical-stats-bar">
          <div className="db-summary">
            <Database size={11} className="db-mini-icon" />
            <span className="db-count"><strong>{totalGames.toLocaleString()}</strong> partidas</span>
            {stats?.avgEval !== undefined && (
              <span className="db-avg-eval">
                Avg: <span className={stats.avgEval > 0 ? 'pos' : 'neg'}>{stats.avgEval > 0 ? '+' : ''}{stats.avgEval}</span>
              </span>
            )}
          </div>

          <div className="common-errors-row">
            {topLabels.length > 0 ? (
              topLabels.map(([label, count]) => {
                const config = EVAL_CONFIG[label] || SPECIAL_LABELS[label];
                return (
                  <div key={label} className="error-micro-pill" title={`${count} veces: ${label}`}>
                    <span className="e-icon" style={{ color: config?.color }}>{config?.icon}</span>
                    <span className="e-count">{count}</span>
                  </div>
                );
              })
            ) : (
              <div className="clean-pos-indicator">
                <span className="check-icon">✓</span> Posición sólida
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
