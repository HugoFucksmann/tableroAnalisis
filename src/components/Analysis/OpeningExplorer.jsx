import React from 'react';
import { useGameStore } from '../../store/useGameStore';
import { useShallow } from 'zustand/react/shallow';
import { Loader, AlertCircle } from 'lucide-react';
import './OpeningExplorer.css';

function sanToArrow(san, chessInstance, color = 'var(--arrow-explorer-hover)') {
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
    showTokenInput,
    setLichessToken,
    makeMove,
  } = useGameStore(useShallow(state => ({
    setArrows: state.setArrows,
    game: state.game,
    fen: state.fen,
    lichessToken: state.lichessToken,
    showTokenInput: state.showTokenInput,
    setLichessToken: state.setLichessToken,
    makeMove: state.makeMove,
  })));

  const [data, setData] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [hoveredMove, setHovered] = React.useState(null);

  React.useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
      loadData();
    }, 600); // Debounce de 600ms

    const loadData = async () => {
        setLoading(true);
        setError(null);
        try {
            const cleanFen = fen.trim().split(' ').slice(0, 4).join(' ');
            const mastersUrl = `https://explorer.lichess.ovh/masters?fen=${encodeURIComponent(cleanFen)}`;
            const playerUrl = `https://explorer.lichess.ovh/lichess?fen=${encodeURIComponent(cleanFen)}&ratings=1800,2000,2200,2500`;

            const headers = { 'Accept': 'application/json' };
            // Enviar token si está configurado
            if (lichessToken && lichessToken.trim().length > 10) {
                headers['Authorization'] = `Bearer ${lichessToken.trim()}`;
            }
            
            let res = await fetch(mastersUrl, { headers });
            
            let explorerData = { moves: [] };

            if (res.ok) {
                explorerData = await res.json();
            } else if (res.status === 401 || res.status === 429) {
                // Lichess Nginx devuelve 401 o 429 cuando superas el límite sin token
                console.warn(`[OpeningExplorer] Masters DB rechazó la petición (${res.status}). Probando Fallback...`);
            } else {
                throw new Error(`Error del servidor Lichess (${res.status})`);
            }

            // Fallback a la base de datos de jugadores si la de maestros falló o no tiene jugadas
            if (!explorerData.moves || explorerData.moves.length === 0) {
                const resPlayer = await fetch(playerUrl, { headers });
                if (resPlayer.ok) {
                    explorerData = await resPlayer.json();
                } else if (resPlayer.status === 401 || resPlayer.status === 429) {
                    throw new Error('Configura tu Token de Lichess (icono 🔑) para continuar usando el explorador.');
                } else {
                    throw new Error(`Error en Lichess Players DB (${resPlayer.status})`);
                }
            }

            if (!active) return;
            
            const rawOpeningName = explorerData.opening?.name || 'Teoría de Aperturas';
            const colonIdx = rawOpeningName.indexOf(':');
            const cleanOpeningName = colonIdx !== -1 ? rawOpeningName.slice(0, colonIdx).trim() : rawOpeningName;

            const formattedData = {
                opening: cleanOpeningName,
                moves: (explorerData.moves || []).slice(0, 12).map(m => {
                    const w = m.white || 0;
                    const d = m.draws || m.draw || 0;
                    const b = m.black || 0;
                    const total = w + d + b;
                    return {
                        san: m.san,
                        white: total > 0 ? Math.round((w / total) * 100) : 0,
                        draw: total > 0 ? Math.round((d / total) * 100) : 0,
                        black: total > 0 ? Math.round((b / total) * 100) : 0,
                        games: total
                    };
                })
            };

            setData(formattedData);

            const bookArrows = formattedData.moves
              .slice(0, 2)
              .map(m => sanToArrow(m.san, game, 'var(--arrow-explorer-base)'))
              .filter(Boolean);
            setArrows(bookArrows);

        } catch (err) {
            console.warn('OpeningExplorer fetch failed:', err.message);
            if (active) setError(err.message || 'Error al conectar con Lichess.');
        } finally {
            if (active) setLoading(false);
        }
    };

    return () => { 
        active = false;
        clearTimeout(timer);
    };
  }, [fen, lichessToken, game, setArrows]);

  const handleMoveHover = React.useCallback((san) => {
    setHovered(san);
    const arrow = sanToArrow(san, game, 'var(--arrow-explorer-hover)');
    setArrows(arrow ? [arrow] : []);
  }, [game, setArrows]);

  const handleMouseLeave = React.useCallback(() => {
    setHovered(null);
    if (!data) return;
    const arrows = (data.moves ?? [])
      .slice(0, 2)
      .map(m => sanToArrow(m.san, game, 'var(--arrow-explorer-base)'))
      .filter(Boolean);
    setArrows(arrows);
  }, [game, setArrows, data]);

  const handleContainerLeave = React.useCallback(() => {
    setHovered(null);
    if (!data) {
      setArrows([]);
      return;
    }
    const arrows = (data.moves ?? [])
      .slice(0, 2)
      .map(m => sanToArrow(m.san, game, 'var(--arrow-explorer-base)'))
      .filter(Boolean);
    setArrows(arrows);
  }, [game, setArrows, data]);

  const renderContent = () => {
    if (loading && !data) {
      return (
        <div className="explorer-state-msg">
          <Loader className="gi-spin" size={24} />
          <span>Consultando Lichess...</span>
        </div>
      );
    }

    if (error) {
      return (
        <div className="explorer-state-msg error-msg">
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      );
    }

    if (!data || !data.moves?.length) {
      return (
        <div className="explorer-state-msg empty-msg">
          <AlertCircle size={16} />
          <span>No hay datos para esta posición.</span>
        </div>
      );
    }

    return (
      <div className="moves-stats-list">
        {data.moves.slice(0, 10).map((move) => (
          <div
            key={move.san}
            className={`move-stat-row ${hoveredMove === move.san ? 'hovered' : ''}`}
            onMouseEnter={() => handleMoveHover(move.san)}
            onMouseLeave={handleMouseLeave}
            onClick={() => makeMove(move.san)}
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
    );
  };

  return (
    <div className="explorer-container" onMouseLeave={handleContainerLeave}>
      {showTokenInput && (
        <div className="explorer-token-input-wrap">
          <input
            className="explorer-token-input"
            type="password"
            placeholder="Lichess Personal Token..."
            value={lichessToken || ''}
            onChange={(e) => setLichessToken(e.target.value)}
          />
          <p className="explorer-token-hint">
            Ingresa tu token para evitar bloqueos por límite de peticiones.
          </p>
        </div>
      )}
      {renderContent()}
    </div>
  );
};