import React from 'react';
import { useGameStore } from '../../store/useGameStore';
import { fetchOpeningExplorer } from '../../services/gameApi';
import { Loader, AlertCircle } from 'lucide-react';
import './OpeningExplorer.css';

function sanToArrow(san, chessInstance, color = 'rgb(0, 100, 255)') {
  try {
    const moves = chessInstance.moves({ verbose: true });
    const match = moves.find(m => m.san === san);
    if (!match) return null;
    return { startSquare: match.from, endSquare: match.to, color };
  } catch {
    return null;
  }
}

export const OpeningExplorer = () => {
  const {
    setArrows,
    game,
    fen,
    lichessToken,
    openingName,
    ecoCode,
  } = useGameStore();

  const [data, setData] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [hoveredMove, setHovered] = React.useState(null);

  React.useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    fetchOpeningExplorer(fen, lichessToken)
      .then(explorerData => {
        if (!active) return;
        setData(explorerData);

        const bookArrows = (explorerData.moves ?? [])
          .slice(0, 2)
          .map(m => sanToArrow(m.san, game, 'rgba(100, 149, 237, 0.45)'))
          .filter(Boolean);
        setArrows(bookArrows);
      })
      .catch(err => {
        console.warn('OpeningExplorer fetch failed:', err);
        if (active) setError('No se pudo conectar con Lichess.');
      })
      .finally(() => { if (active) setLoading(false); });

    return () => { active = false; };
  }, [fen, lichessToken]);

  const handleMoveHover = React.useCallback((san) => {
    setHovered(san);
    const arrow = sanToArrow(san, game, 'rgba(0, 120, 255, 0.8)');
    setArrows(arrow ? [arrow] : []);
  }, [game, setArrows]);

  const handleMouseLeave = React.useCallback(() => {
    setHovered(null);
    if (!data) return;
    const arrows = (data.moves ?? [])
      .slice(0, 3)
      .map(m => sanToArrow(m.san, game, 'rgba(100, 149, 237, 0.45)'))
      .filter(Boolean);
    setArrows(arrows);
  }, [game, setArrows, data]);

  const handleContainerLeave = React.useCallback(() => {
    setHovered(null);
    setArrows([]);
  }, [setArrows]);

  if (loading && !data) {
    return (
      <div className="explorer-container loading">
        <Loader className="gi-spin" size={24} />
        <span>Consultando Lichess...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="explorer-container error">
        <AlertCircle size={20} />
        <span>{error}</span>
      </div>
    );
  }

  if (!data || !data.moves?.length) {
    return (
      <div className="explorer-container empty">
        <AlertCircle size={16} />
        <span>No hay datos para esta posición.</span>
      </div>
    );
  }

  const displayName = openingName || data.opening;

  return (
    <div className="explorer-container" onMouseLeave={handleContainerLeave}>
      <div className="opening-name">
        {ecoCode && <span style={{ opacity: 0.6, marginRight: 6, fontSize: '0.8em' }}>{ecoCode}</span>}
        {displayName}
      </div>

      <div className="moves-stats-list">
        {data.moves.slice(0, 10).map((move) => (
          <div
            key={move.san}
            className={`move-stat-row ${hoveredMove === move.san ? 'hovered' : ''}`}
            onMouseEnter={() => handleMoveHover(move.san)}
            onMouseLeave={handleMouseLeave}
          >
            <div className="move-san">{move.san}</div>
            <div className="win-rate-bar">
              <div className="bar-segment white" style={{ width: `${move.white}%` }}>
                {move.white > 15 && <span>{move.white}%</span>}
              </div>
              <div className="bar-segment draw" style={{ width: `${move.draw}%` }}>
                {move.draw > 15 && <span>{move.draw}%</span>}
              </div>
              <div className="bar-segment black" style={{ width: `${move.black}%` }}>
                {move.black > 15 && <span>{move.black}%</span>}
              </div>
            </div>
            <div className="games-count">
              {move.games >= 1000 ? `${(move.games / 1000).toFixed(1)}k` : move.games}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};