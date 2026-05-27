import React from 'react';
import { FileText } from 'lucide-react';

export const PlatformSelector = ({ platform, onPlatformSwitch }) => {
  return (
    <div className="gi-platform-toggle">
      <button
        className={`gi-toggle-btn ${platform === 'lichess' ? 'active' : ''}`}
        onClick={() => onPlatformSwitch('lichess')}
        title="Lichess"
      >
        <img 
          src="/lichess-favicon.png" 
          alt="Lichess" 
          className="gi-platform-icon"
          onError={(e) => { e.target.style.display = 'none'; }} 
        />
      </button>
      <button
        className={`gi-toggle-btn ${platform === 'chesscom' ? 'active' : ''}`}
        onClick={() => onPlatformSwitch('chesscom')}
        title="Chess.com"
      >
        <img 
          src="/chesscom-favicon.ico" 
          alt="Chess.com" 
          className="gi-platform-icon"
          onError={(e) => { e.target.style.display = 'none'; }} 
        />
      </button>
      <button
        className={`gi-toggle-btn ${platform === 'pgn' ? 'active' : ''}`}
        onClick={() => onPlatformSwitch('pgn')}
        title="PGN Manual"
      >
        <FileText className="gi-platform-icon" />
      </button>
    </div>
  );
};
