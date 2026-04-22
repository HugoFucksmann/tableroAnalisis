import React from 'react';
import { MOCK_OPENING_DATA } from '../../utils/mockData';
import { useGameStore } from '../../store/useGameStore';
import './OpeningExplorer.css';

// Convierte un SAN simple del explorer (e4, Nf3, O-O…) a coordenadas from/to
// usando la posición actual del tablero via chess.js para que la flecha sea exacta.
// Si no puede resolverlo devuelve null.
function sanToArrow(san, chessInstance, color = 'rgb(0, 100, 255)') {
  try {
    const moves = chessInstance.moves({ verbose: true });
    const match = moves.find(m => m.san === san);
    if (!match) return null;
    return [match.from, match.to, color];
  } catch {
    return null;
  }
}

export const OpeningExplorer = () => {
  const [selectedElo, setSelectedElo] = React.useState('All');
  const [hoveredMove, setHoveredMove] = React.useState(null);
  const { setArrows, game } = useGameStore();

  const eloFilters = ['All', '500', '1000', '1500', '2000', '2500'];

  // Al hacer hover sobre un movimiento del explorer, muestra su flecha en el tablero
  const handleMoveHover = React.useCallback((san) => {
    setHoveredMove(san);
    const arrow = sanToArrow(san, game, 'rgba(0, 120, 255, 0.8)');
    setArrows(arrow ? [arrow] : []);
  }, [game, setArrows]);

  // Al salir, muestra todas las flechas del explorer (más tenues)
  const handleMouseLeave = React.useCallback(() => {
    setHoveredMove(null);
    const allArrows = MOCK_OPENING_DATA.moves
      .map(m => sanToArrow(m.san, game, 'rgba(100, 149, 237, 0.45)'))
      .filter(Boolean);
    setArrows(allArrows);
  }, [game, setArrows]);

  // Al salir del contenedor entero, limpia las flechas
  const handleContainerLeave = React.useCallback(() => {
    setHoveredMove(null);
    setArrows([]);
  }, [setArrows]);

  return (
    <div
      className="explorer-container"
      onMouseLeave={handleContainerLeave}
    >
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
          <div
            key={move.san}
            className={`move-stat-row ${hoveredMove === move.san ? 'hovered' : ''}`}
            onMouseEnter={() => handleMoveHover(move.san)}
            onMouseLeave={handleMouseLeave}
          >
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