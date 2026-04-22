import React from 'react';
import { useGameStore } from '../../store/useGameStore';
import { MOCK_GAMES } from '../../utils/mockData';
import { Search, ExternalLink } from 'lucide-react';
import { Chess } from 'chess.js';
import './GameImport.css';

export const GameImport = ({ onGameSelect }) => {
  const { loadPgn } = useGameStore();
  const [platform, setPlatform] = React.useState('lichess'); // 'lichess' or 'chesscom'

  const handleLoadGame = (pgn) => {
    loadPgn(pgn);
    if (onGameSelect) onGameSelect();
  };

  return (
    <div className="game-import-container">
      <div className="platform-switch">
        <button 
          className={`switch-btn ${platform === 'lichess' ? 'active' : ''}`}
          onClick={() => setPlatform('lichess')}
        >
          Lichess
        </button>
        <button 
          className={`switch-btn ${platform === 'chesscom' ? 'active' : ''}`}
          onClick={() => setPlatform('chesscom')}
        >
          Chess.com
        </button>
      </div>

      <div className="search-bar">
        <Search size={16} className="search-icon" />
        <input type="text" placeholder="Buscar usuario (Lichess/Chess.com)..." />
      </div>
      
      <div className="mock-games-list premium-scroll">
        <h4>Partidas Recientes</h4>
        {MOCK_GAMES.map((game) => (
          <div key={game.id} className="game-card" onClick={() => handleLoadGame(game.pgn)}>
            <div className="game-card-info">
              <div className="players">
                <span className="player white">{game.white}</span>
                <span className="vs">vs</span>
                <span className="player black">{game.black}</span>
              </div>
              <div className="game-meta">
                <span className="result">{game.result}</span>
                <span className="date">{game.date}</span>
              </div>
            </div>
            <ExternalLink size={14} className="load-icon" />
          </div>
        ))}
      </div>
    </div>
  );
};
