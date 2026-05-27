import React from 'react';
import { CheckSquare, Square, Zap, Loader, ExternalLink } from 'lucide-react';

export const GameCard = ({ 
  game, 
  isAnalyzed, 
  isSelected, 
  loadingId, 
  onToggleSelection, 
  onLoadGame 
}) => {
  return (
    <div
      className={`gi-card ${isAnalyzed ? 'analyzed' : ''} ${isSelected ? 'selected' : ''}`}
    >
      <button
        className="gi-checkbox"
        onClick={(e) => { e.stopPropagation(); onToggleSelection(game.id); }}
        title="Seleccionar para acción masiva"
        aria-label={isSelected ? 'Deseleccionar partida' : 'Seleccionar partida'}
      >
        {isSelected ? <CheckSquare className="gi-card-icon" /> : <Square className="gi-card-icon" />}
      </button>

      <button
        className={`gi-card-body ${loadingId === game.id ? 'loading' : ''}`}
        onClick={() => onLoadGame(game.pgn, game.id)}
        disabled={!!loadingId}
      >
        <div className="gi-card-players">
          <span className="gi-player white" title={game.white}>{game.white}</span>
          <span className="gi-result">{game.result}</span>
          <span className="gi-player black" title={game.black}>{game.black}</span>
        </div>
        <div className="gi-card-meta">
          <span className="gi-date">{game.date}</span>
          <div className="gi-card-status">
            {isAnalyzed && (
              <span className="gi-analyzed-badge" title="Partida analizada">
                <Zap className="gi-card-icon-xs" fill="currentColor" />
              </span>
            )}
            {loadingId === game.id
              ? <Loader className="gi-card-icon gi-spin" />
              : <ExternalLink className="gi-card-icon gi-ext-icon" />}
          </div>
        </div>
      </button>
    </div>
  );
};
