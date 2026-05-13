import React from 'react';
import { BarChart2, Cpu } from 'lucide-react';
import './ExplorerHeader.css';
import { EVAL_CONFIG } from '../../../constants/chessConstants.jsx';

export const ExplorerHeader = ({ 
  ecoCode, 
  openingName, 
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
