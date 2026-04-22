import React from 'react';
import { useGameStore } from '../../store/useGameStore';
import { fetchOpeningExplorer } from '../../services/gameApi';
import { Loader, AlertCircle } from 'lucide-react';
import './OpeningExplorer.css';

/**
 * Convierte un movimiento SAN a objeto Arrow de react-chessboard v5.
 * v5 usa: { startSquare: string, endSquare: string, color: string }
 * (ya NO usa arrays [from, to, color])
 */
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

import { BOOK_MOVE_LIMIT, MIN_GAMES_THRESHOLD } from '../../constants/chessConstants.jsx';

export const OpeningExplorer = () => {
  const {
    setArrows,
    setMoveEvaluation,
    game,
    fen,
    history,
    currentMoveIndex,
    setOpeningName,
    lichessToken,
  } = useGameStore();

  const [data, setData] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [hoveredMove, setHoveredMove] = React.useState(null);

  React.useEffect(() => {
    let active = true;

    const loadData = async () => {
      if (!data) setLoading(true);
      setError(null);

      try {
        const explorerData = await fetchOpeningExplorer(fen, lichessToken);

        if (!active) return;

        setData(explorerData);

        if (explorerData.opening) {
          setOpeningName(explorerData.opening);
        }

        // ── Lógica de marcado "Libro" filtrada ──
        const totalGames = (explorerData.moves ?? []).reduce((sum, m) => sum + (m.games || 0), 0);
        
        const isTheory = 
          explorerData.opening && 
          explorerData.opening !== 'Posición no encontrada' &&
          currentMoveIndex < BOOK_MOVE_LIMIT &&
          totalGames >= MIN_GAMES_THRESHOLD;

        if (isTheory && currentMoveIndex >= 0) {
          setMoveEvaluation(currentMoveIndex, 'Libro');
        }

        // Mostrar flechas de las 2 principales jugadas de libro (estilo tenue)
        // Reducimos de 3 a 2 para evitar saturar el tablero (1 motor + 2 libro = 3 total)
        const bookArrows = (explorerData.moves ?? [])
          .slice(0, 2)
          .map(m => sanToArrow(m.san, game, 'rgba(100, 149, 237, 0.45)'))
          .filter(Boolean);
        setArrows(bookArrows);

      } catch (err) {
        console.warn('OpeningExplorer fetch failed:', err);
        if (active) setError('No se pudo conectar con la base de datos de Lichess.');
      } finally {
        if (active) setLoading(false);
      }
    };

    loadData();
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fen, lichessToken]);

  // ── Hover: mostrar flecha destacada para la jugada bajo el cursor ────────
  const handleMoveHover = React.useCallback((san) => {
    setHoveredMove(san);
    const arrow = sanToArrow(san, game, 'rgba(0, 120, 255, 0.8)');
    setArrows(arrow ? [arrow] : []);
  }, [game, setArrows]);

  // ── Al salir de una fila: volver a mostrar las 3 principales ────────────
  const handleMouseLeave = React.useCallback(() => {
    setHoveredMove(null);
    if (!data) return;
    const allArrows = (data.moves ?? [])
      .slice(0, 3)
      .map(m => sanToArrow(m.san, game, 'rgba(100, 149, 237, 0.45)'))
      .filter(Boolean);
    setArrows(allArrows);
  }, [game, setArrows, data]);

  // ── Al salir del contenedor completo: limpiar todas las flechas ──────────
  const handleContainerLeave = React.useCallback(() => {
    setHoveredMove(null);
    setArrows([]);
  }, [setArrows]);

  // ── Estados de carga / error / vacío ────────────────────────────────────
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
        <span>No hay datos disponibles para esta posición.</span>
      </div>
    );
  }

  return (
    <div
      className="explorer-container"
      onMouseLeave={handleContainerLeave}
    >
      <div className="opening-name">
        {data.opening}
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
              {move.games >= 1000
                ? `${(move.games / 1000).toFixed(1)}k`
                : move.games}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};