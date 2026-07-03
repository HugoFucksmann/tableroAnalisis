import React from 'react';
import { BarChart2 } from 'lucide-react';
import './ExplorerHeader.css';
import { ViewToggle } from '../../common/ViewToggle';

const COLOR_OPTIONS = [
  { value: 'white', label: 'W', title: 'Ver como Blancas' },
  { value: 'black', label: 'B', title: 'Ver como Negras' },
];

export const ExplorerHeader = ({ 
  ecoCode, 
  openingName, 
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
          <ViewToggle
            options={COLOR_OPTIONS}
            value={playerColor}
            onChange={handleSetColor}
          />
        </div>
      </div>
    </header>
  );
};
