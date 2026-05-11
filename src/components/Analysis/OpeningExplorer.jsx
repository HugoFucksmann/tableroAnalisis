import React from 'react';
import { useGameStore } from '../../store/useGameStore';
import { useShallow } from 'zustand/react/shallow';
import { Loader, AlertCircle, BookOpen, Globe } from 'lucide-react';
import { backendService } from '../../services/backendService';
import './OpeningExplorer.css';

function sanToArrow(san, chessInstance, color = 'var(--arrow-explorer-hover)') {
  try {
    const moves = chessInstance.moves({ verbose: true });
    const match = moves.find(m => m.san === san);
    if (!match) return null;
    return { startSquare: match.from, endSquare: match.to, color };
  } catch { return null; }
}

// ── Sección Polyglot ─────────────────────────────────────────────────────────
function PolyglotSection({ moves, game, onHover, onLeave, onPlay }) {
  if (!moves?.length) return null;
  const totalW = moves.reduce((s, m) => s + m.weight, 0);

  return (
    <div className="explorer-section">
      <div className="explorer-source-badge polyglot-badge">
        <BookOpen size={10} />
        <span>GM Book · gm2001</span>
      </div>
      <div className="moves-stats-list">
        {moves.slice(0, 8).map(m => (
          <div
            key={m.san}
            className="move-stat-row"
            onMouseEnter={() => onHover(m.san)}
            onMouseLeave={onLeave}
            onClick={() => onPlay(m.san)}
          >
            <div className="move-san">{m.san}</div>
            <div className="win-rate-bar">
              <div
                className="bar-segment polyglot-freq"
                style={{ width: `${m.freq}%` }}
              >
                {m.freq > 12 && <span>{m.freq}%</span>}
              </div>
              <div className="bar-segment polyglot-rest" style={{ width: `${100 - m.freq}%` }} />
            </div>
            <div className="games-count poly-weight">w:{m.weight}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Sección Lichess ──────────────────────────────────────────────────────────
function LichessSection({ data, loading, error, game, onHover, onLeave, onPlay }) {
  if (loading && !data) {
    return (
      <div className="explorer-section">
        <div className="explorer-source-badge lichess-badge">
          <Globe size={10} />
          <span>Lichess Masters</span>
        </div>
        <div className="explorer-state-msg compact">
          <Loader className="gi-spin" size={16} />
          <span>Cargando...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="explorer-section">
        <div className="explorer-source-badge lichess-badge">
          <Globe size={10} />
          <span>Lichess Masters</span>
        </div>
        <div className="explorer-state-msg compact error-msg">
          <AlertCircle size={14} />
          <span>{error}</span>
        </div>
      </div>
    );
  }

  if (!data?.moves?.length) return null;

  return (
    <div className="explorer-section">
      <div className="explorer-source-badge lichess-badge">
        <Globe size={10} />
        <span>Lichess · {data.opening}</span>
      </div>
      <div className="moves-stats-list">
        {data.moves.slice(0, 8).map(move => (
          <div
            key={move.san}
            className="move-stat-row"
            onMouseEnter={() => onHover(move.san)}
            onMouseLeave={onLeave}
            onClick={() => onPlay(move.san)}
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
}

// ── Componente principal ─────────────────────────────────────────────────────
export const OpeningExplorer = () => {
  const {
    setArrows, game, fen,
    lichessToken, showTokenInput, setLichessToken, makeMove,
  } = useGameStore(useShallow(state => ({
    setArrows:      state.setArrows,
    game:           state.game,
    fen:            state.fen,
    lichessToken:   state.lichessToken,
    showTokenInput: state.showTokenInput,
    setLichessToken: state.setLichessToken,
    makeMove:       state.makeMove,
  })));

  const [polyglotMoves, setPolyglotMoves] = React.useState([]);
  const [lichessData,   setLichessData]   = React.useState(null);
  const [lichessLoading, setLichessLoading] = React.useState(false);
  const [lichessError,   setLichessError]   = React.useState(null);
  const [hoveredMove, setHovered] = React.useState(null);

  React.useEffect(() => {
    let active = true;
    setPolyglotMoves([]);
    setLichessData(null);
    setLichessError(null);

    const timer = setTimeout(() => {
      loadBoth();
    }, 600);

    async function loadBoth() {
      // ── Polyglot (paralelo) ──────────────────────────────────────────────
      if (backendService.isConnected) {
        backendService.request('get_book_moves', { fen }, 'book_moves')
          .then(result => {
            if (!active) return;
            if (result.source === 'polyglot' && result.moves?.length > 0) {
              setPolyglotMoves(result.moves);
              // Flechas del libro: top 2 por defecto
              const arrows = result.moves.slice(0, 2)
                .map(m => sanToArrow(m.san, game, 'var(--arrow-explorer-base)'))
                .filter(Boolean);
              setArrows(arrows);
            }
          })
          .catch(() => {}); // silencioso si el backend no responde
      }

      // ── Lichess (paralelo) ───────────────────────────────────────────────
      setLichessLoading(true);
      try {
        const cleanFen  = fen.trim().split(' ').slice(0, 4).join(' ');
        const mastersUrl = `https://explorer.lichess.ovh/masters?fen=${encodeURIComponent(cleanFen)}`;
        const playerUrl  = `https://explorer.lichess.ovh/lichess?fen=${encodeURIComponent(cleanFen)}&ratings=1800,2000,2200,2500`;

        const headers = { 'Accept': 'application/json' };
        if (lichessToken?.trim().length > 10) {
          headers['Authorization'] = `Bearer ${lichessToken.trim()}`;
        }

        let res = await fetch(mastersUrl, { headers });
        let explorerData = { moves: [] };

        if (res.ok) {
          explorerData = await res.json();
        } else if (res.status !== 401 && res.status !== 429) {
          throw new Error(`Error del servidor Lichess (${res.status})`);
        }

        if (!explorerData.moves?.length) {
          const resPlayer = await fetch(playerUrl, { headers });
          if (resPlayer.ok) {
            explorerData = await resPlayer.json();
          } else if (resPlayer.status === 401 || resPlayer.status === 429) {
            throw new Error('Configura tu Token de Lichess (🔑) para usar el explorador.');
          } else {
            throw new Error(`Error Lichess Players DB (${resPlayer.status})`);
          }
        }

        if (!active) return;

        const rawName   = explorerData.opening?.name || '';
        const colonIdx  = rawName.indexOf(':');
        const cleanName = colonIdx !== -1 ? rawName.slice(0, colonIdx).trim() : rawName;

        setLichessData({
          opening: cleanName || 'Teoría de Aperturas',
          moves: (explorerData.moves || []).slice(0, 12).map(m => {
            const w = m.white || 0;
            const d = m.draws || m.draw || 0;
            const b = m.black || 0;
            const total = w + d + b;
            return {
              san:   m.san,
              white: total > 0 ? Math.round((w / total) * 100) : 0,
              draw:  total > 0 ? Math.round((d / total) * 100) : 0,
              black: total > 0 ? Math.round((b / total) * 100) : 0,
              games: total,
            };
          }),
        });

      } catch (err) {
        if (active) setLichessError(err.message);
      } finally {
        if (active) setLichessLoading(false);
      }
    }

    return () => { active = false; clearTimeout(timer); };
  }, [fen, lichessToken, game, setArrows]);

  const handleHover = React.useCallback((san) => {
    setHovered(san);
    const arrow = sanToArrow(san, game, 'var(--arrow-explorer-hover)');
    setArrows(arrow ? [arrow] : []);
  }, [game, setArrows]);

  const handleLeave = React.useCallback(() => {
    setHovered(null);
    // Restaurar flechas: Polyglot si disponible, sino Lichess
    const source = polyglotMoves.length > 0 ? polyglotMoves : (lichessData?.moves ?? []);
    const arrows = source.slice(0, 2)
      .map(m => sanToArrow(m.san, game, 'var(--arrow-explorer-base)'))
      .filter(Boolean);
    setArrows(arrows);
  }, [game, setArrows, polyglotMoves, lichessData]);

  const hasAnyData = polyglotMoves.length > 0 || lichessData || lichessLoading;

  if (!hasAnyData && !lichessError) {
    return (
      <div className="explorer-container">
        <div className="explorer-state-msg empty-msg">
          <AlertCircle size={14} />
          <span>No hay datos para esta posición.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="explorer-container" onMouseLeave={handleLeave}>
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

      {/* Sección Polyglot */}
      {polyglotMoves.length > 0 && (
        <PolyglotSection
          moves={polyglotMoves}
          game={game}
          onHover={handleHover}
          onLeave={handleLeave}
          onPlay={makeMove}
        />
      )}

      {/* Separador */}
      {polyglotMoves.length > 0 && (lichessData || lichessLoading) && (
        <div className="explorer-divider" />
      )}

      {/* Sección Lichess */}
      <LichessSection
        data={lichessData}
        loading={lichessLoading}
        error={lichessError}
        game={game}
        onHover={handleHover}
        onLeave={handleLeave}
        onPlay={makeMove}
      />
    </div>
  );
};