import React from 'react';
import { MOCK_OPENING_DATA } from '../../utils/mockData';
import './OpeningExplorer.css';

export const OpeningExplorer = () => {
  const [selectedElo, setSelectedElo] = React.useState('All');
  const eloFilters = ['All', '500', '1000', '1500', '2000', '2500'];

  return (
    <div className="explorer-container">
      <div className="elo-tabs">
        {eloFilters.map((elo) => (
          <button 
            key={elo} 
            className={`elo-tab ${selectedElo === elo ? 'active' : ''}`}
            onClick={() => setSelectedElo(elo)}
          >
            {elo}
          </button>
        ))}
      </div>

      <div className="opening-name">
        {MOCK_OPENING_DATA.opening}
      </div>

      <div className="moves-stats-list">
        {MOCK_OPENING_DATA.moves.map((move) => (
          <div key={move.san} className="move-stat-row">
            <div className="move-san">{move.san}</div>
            <div className="win-rate-bar">
              <div className="bar-segment white" style={{ width: `${move.white}%` }}>
                {move.white > 10 && <span>{move.white}%</span>}
              </div>
              <div className="bar-segment draw" style={{ width: `${move.draw}%` }}>
                {move.draw > 10 && <span>{move.draw}%</span>}
              </div>
              <div className="bar-segment black" style={{ width: `${move.black}%` }}>
                {move.black > 10 && <span>{move.black}%</span>}
              </div>
            </div>
            <div className="games-count">{(move.games / 1000).toFixed(1)}k</div>
          </div>
        ))}
      </div>
    </div>
  );
};
