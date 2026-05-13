import React from 'react';
import { BarChart2, Cpu } from 'lucide-react';
import './ExplorerHeader.css';
import { EVAL_CONFIG } from '../../../constants/chessConstants.jsx';

export const ExplorerHeader = ({ 
  ecoCode, 
  openingName, 
  currentEval, 
  moveEvaluations, 
  currentMoveIndex,
  playerColor,
  handleSetColor
}) => {
  return (
    <header className="explorer-header">
      <div className="header-top">
        <div className="explorer-title-area">
          <div className="explorer-title">
            <BarChart2 size={16} className="text-accent" />
            Explorador
          </div>
          <div className="opening-info-compact">
            <span className="eco-badge">{ecoCode || '---'}</span>
            <span className="opening-name" title={openingName || 'Posición personalizada'}>
              {openingName || 'Sin apertura definida'}
            </span>
            <div className="live-eval-group">
              <div className={`live-eval-badge ${currentEval?.score > 0 ? 'pos' : 'neg'}`}>
                {currentEval ? (
                  `${currentEval.score > 0 ? '+' : ''}${currentEval.score}`
                ) : '...'}
              </div>
              {moveEvaluations[currentMoveIndex] && (
                <div 
                  className="current-move-valuation"
                  style={{ color: EVAL_CONFIG[moveEvaluations[currentMoveIndex].label]?.color || '#fff' }}
                  title={moveEvaluations[currentMoveIndex].label}
                >
                  {EVAL_CONFIG[moveEvaluations[currentMoveIndex].label]?.icon || '?'}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="header-actions">
          <div className="perspective-toggle">
            <button
              className={`toggle-btn ${playerColor === 'white' ? 'active' : ''}`}
              onClick={() => handleSetColor('white')}
              title="Ver como Blancas"
            >
              W
            </button>
            <button
              className={`toggle-btn ${playerColor === 'black' ? 'active' : ''}`}
              onClick={() => handleSetColor('black')}
              title="Ver como Negras"
            >
              B
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
