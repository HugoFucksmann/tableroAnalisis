import React from 'react';
import { useGameStore } from '../../store/useGameStore';
import { useShallow } from 'zustand/react/shallow';
import { Loader, AlertCircle, BookOpen, Globe } from 'lucide-react';
import { backendService } from '../../services/backendService';
import { getPieceIcon } from '../../utils/chessUtils';
import { lichessExplorerService } from '../../services/lichessExplorerService';
import './OpeningExplorer.css';

function sanToArrow(san, chessInstance, color = 'var(--arrow-explorer-hover)') {
  try {
    const moves = chessInstance.moves({ verbose: true });
    const match = moves.find(m => m.san === san);
    if (!match) return null;
    return { startSquare: match.from, endSquare: match.to, color };
  } catch { return null; }
}

const RenderMoveSAN = ({ san, turn }) => {
  const pieceChar = san[0];
  const isPiece = /^[KQRBN]/.test(pieceChar);
  if (!isPiece) return <span className="move-san">{san}</span>;
  const side = turn === 'w' ? 'white' : 'black';
  return (
    <span className="move-san">
      <span className={`piece-icon ${side}`}>{getPieceIcon(pieceChar, side)}</span>
      {san.slice(1)}
    </span>
  );
};

const MoveRow = ({ move, type, turn, onHover, onLeave, onPlay }) => (
  <div
    className="move-stat-row"
    onMouseEnter={() => onHover(move.san)}
    onMouseLeave={onLeave}
    onClick={() => onPlay(move.san)}
    onKeyDown={(e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onPlay(move.san);
      }
    }}
    role="button"
    tabIndex={0}
  >
    <div className="move-san-container"><RenderMoveSAN san={move.san} turn={turn} /></div>
    <div className="win-rate-bar-container">
      <div className="win-rate-bar">
        {type === 'offline' ? <div className="bar-segment tsv-freq" style={{ width: `${move.freq}%` }} /> : (
          <><div className="bar-segment white" style={{ width: `${move.white}%` }} /><div className="bar-segment draw" style={{ width: `${move.draw}%` }} /><div className="bar-segment black" style={{ width: `${move.black}%` }} /></>
        )}
      </div>
    </div>
    <div className="games-count">{type === 'offline' ? <span className="count-label">Off</span> : (move.games >= 1000 ? `${(move.games / 1000).toFixed(1)}k` : move.games)}</div>
  </div>
);

export const OpeningExplorer = () => {
  const { setArrows, game, fen, makeMove, lichessToken, showTokenInput, setLichessToken } = useGameStore(useShallow(state => ({
    setArrows: state.setArrows, game: state.game, fen: state.fen, makeMove: state.makeMove,
    lichessToken: state.lichessToken, showTokenInput: state.showTokenInput, setLichessToken: state.setLichessToken,
  })));

  const [state, setState] = React.useState({
    bookData: { moves: [], opening: '' },
    lichessData: null,
    loading: false,
    error: null,
    isStale: false,
  });

  const turn = fen?.split(' ')[1] || 'w';

  React.useEffect(() => {
    let active = true;
    setState(prev => ({ ...prev, isStale: true }));

    const offlineTimer = setTimeout(() => loadOffline(), 50);
    const onlineTimer = setTimeout(() => loadOnline(), 400);

    async function loadOffline() {
      try {
        const result = await backendService.request('get_book_moves', { fen }, 'book_moves');
        if (!active) return;

        const arrows = (result.moves || []).slice(0, 2).flatMap(m => {
          const arrow = sanToArrow(m.san, game, 'var(--arrow-explorer-base)');
          return arrow ? [arrow] : [];
        });
        setArrows(arrows);

        setState(prev => ({
          ...prev,
          bookData: { moves: result.moves || [], opening: result.opening || '' },
          isStale: false
        }));
      } catch (e) {
        console.warn('[OpeningExplorer] Offline load failed:', e);
        if (active) setState(prev => ({ ...prev, isStale: false }));
      }
    }

    async function loadOnline() {
      if (active) setState(prev => ({ ...prev, loading: true, error: null }));
      try {
        const data = await lichessExplorerService.fetchMastersData(fen, lichessToken);
        if (!active) return;

        const cleanName = (data.opening?.name || '').split(':')[0].trim();
        setState(prev => ({
          ...prev,
          loading: false,
          lichessData: {
            opening: cleanName,
            moves: (data.moves || []).slice(0, 10).map(m => {
              const total = (m.white || 0) + (m.draws || 0) + (m.black || 0);
              return {
                san: m.san,
                white: total > 0 ? Math.round((m.white / total) * 100) : 0,
                draw: total > 0 ? Math.round((m.draws / total) * 100) : 0,
                black: total > 0 ? Math.round((m.black / total) * 100) : 0,
                games: total,
              };
            }),
          },
        }));
      } catch (err) {
        if (active) setState(prev => ({ ...prev, loading: false, error: err.message }));
      }
    }

    return () => { active = false; clearTimeout(offlineTimer); clearTimeout(onlineTimer); };
  }, [fen, game, setArrows, lichessToken]);

  const handleHover = (san) => {
    const arrow = sanToArrow(san, game, 'var(--arrow-explorer-hover)');
    setArrows(arrow ? [arrow] : []);
  };

  const handleLeave = () => {
    const sourceMoves = state.bookData.moves.length > 0 ? state.bookData.moves : (state.lichessData?.moves ?? []);
    const arrows = sourceMoves.slice(0, 2).flatMap(m => {
      const arrow = sanToArrow(m.san, game, 'var(--arrow-explorer-base)');
      return arrow ? [arrow] : [];
    });
    setArrows(arrows);
  };

  const { bookData, lichessData, loading: lichessLoading, error: lichessError, isStale } = state;

  const hasAnyData = bookData.moves.length > 0 || lichessData;

  return (
    <div className={`explorer-container-v2 ${isStale ? 'stale' : ''}`} onMouseLeave={handleLeave}>
      {showTokenInput && (
        <div className="explorer-header-mini">
          <input className="explorer-token-input-mini" type="password" placeholder="Lichess Token…" value={lichessToken || ''} onChange={(e) => setLichessToken(e.target.value)} />
        </div>
      )}

      <div className="explorer-scroll-area premium-scroll">
        {bookData.moves.length > 0 && (
          <div className="explorer-subgroup">
            <div className="subgroup-label"><BookOpen size={10} /> OFFLINE</div>
            {bookData.moves.slice(0, 8).map(m => (
              <MoveRow key={`off-${m.san}`} move={m} type="offline" turn={turn} onHover={handleHover} onLeave={handleLeave} onPlay={makeMove} />
            ))}
          </div>
        )}

        {bookData.moves.length > 0 && lichessData && <div className="subgroup-divider" />}

        {lichessLoading && !lichessData && (
          <div className="explorer-loading-mini"><Loader className="gi-spin" size={14} /> <span>Sincronizando Lichess…</span></div>
        )}

        {lichessError && (
          <div className="explorer-error-mini"><AlertCircle size={12} /> <span>{lichessError}</span></div>
        )}

        {lichessData && (
          <div className="explorer-subgroup">
            <div className="subgroup-label"><Globe size={10} /> MASTERS</div>
            {lichessData.moves.slice(0, 10).map(m => (
              <MoveRow key={`on-${m.san}`} move={m} type="online" turn={turn} onHover={handleHover} onLeave={handleLeave} onPlay={makeMove} />
            ))}
          </div>
        )}

        {!hasAnyData && !isStale && (
          <div className="explorer-empty-mini">Fuera de teoría</div>
        )}
      </div>
    </div>
  );
};