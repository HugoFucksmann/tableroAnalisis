import React from 'react';
import { useGameStore } from '../../store/useGameStore';
import { useShallow } from 'zustand/react/shallow';
import { fetchLichessGames, fetchChesscomGames } from '../../services/gameApi';
import { Search, ExternalLink, Loader, AlertCircle, FileText } from 'lucide-react';
import './GameImport.css';

export const GameImport = ({ onGameSelect }) => {
  const {
    loadPgn,
    isAnalyzing,
    analysisProgress,
    searchUsername: username,
    searchPlatform: platform,
    importedGames: games,
    setSearchUsername: setUsername,
    setSearchPlatform: setPlatform,
    setImportedGames: setGames,
    lichessToken,
    setLichessToken,
  } = useGameStore(useShallow(state => ({
    loadPgn: state.loadPgn,
    isAnalyzing: state.isAnalyzing,
    analysisProgress: state.analysisProgress,
    searchUsername: state.searchUsername,
    searchPlatform: state.searchPlatform,
    importedGames: state.importedGames,
    setSearchUsername: state.setSearchUsername,
    setSearchPlatform: state.setSearchPlatform,
    setImportedGames: state.setImportedGames,
    lichessToken: state.lichessToken,
    setLichessToken: state.setLichessToken,
  })));

  const [loadingId, setLoadingId] = React.useState(null);
  const [isFetching, setIsFetching] = React.useState(false);
  const [isFetchingMore, setIsFetchingMore] = React.useState(false);
  const [error, setError] = React.useState('');
  const [showTokenInput, setShowTokenInput] = React.useState(false);
  const [customPgn, setCustomPgn] = React.useState('');

  // Estados de paginación
  const [hasMore, setHasMore] = React.useState(false);
  const [lastTimestamp, setLastTimestamp] = React.useState(null); // Lichess
  const [chesscomPagination, setChesscomPagination] = React.useState(null); // Chess.com

  const sentinelRef = React.useRef(null);

  const handlePlatformSwitch = (p) => {
    setPlatform(p);
    setGames([]);
    setError('');
    setHasMore(false);
    setLastTimestamp(null);
    setChesscomPagination(null);
  };

  const performSearch = React.useCallback(async (targetUsername, targetPlatform) => {
    if (!targetUsername.trim()) return;
    setIsFetching(true);
    setError('');
    setHasMore(false);
    setLastTimestamp(null);
    setChesscomPagination(null);

    try {
      if (targetPlatform === 'lichess') {
        const result = await fetchLichessGames(targetUsername.trim(), 15, null, lichessToken);
        setGames(result.games);
        setLastTimestamp(result.lastTimestamp);
        setHasMore(result.hasMore);
        if (result.games.length === 0) setError('No se encontraron partidas recientes.');
      } else if (targetPlatform === 'chesscom') {
        const result = await fetchChesscomGames(targetUsername.trim(), 15, null);
        setGames(result.games);
        setChesscomPagination(result.pagination);
        setHasMore(result.hasMore);
        if (result.games.length === 0) setError('No se encontraron partidas recientes.');
      }
    } catch (err) {
      setError(err.message);
      setGames([]);
    } finally {
      setIsFetching(false);
    }
  }, [lichessToken, setGames]);

  const loadMore = React.useCallback(async () => {
    if (isFetching || isFetchingMore || !hasMore || !username) return;

    setIsFetchingMore(true);
    try {
      if (platform === 'lichess') {
        const result = await fetchLichessGames(username.trim(), 15, lastTimestamp, lichessToken);
        setGames([...games, ...result.games]);
        setLastTimestamp(result.lastTimestamp);
        setHasMore(result.hasMore);
      } else if (platform === 'chesscom') {
        const result = await fetchChesscomGames(username.trim(), 15, chesscomPagination);
        setGames([...games, ...result.games]);
        setChesscomPagination(result.pagination);
        setHasMore(result.hasMore);
      }
    } catch (err) {
      console.error('Error loading more games:', err);
    } finally {
      setIsFetchingMore(false);
    }
  }, [isFetching, isFetchingMore, hasMore, username, platform, lastTimestamp, chesscomPagination, lichessToken, games, setGames]);

  // Observer para el sentinel
  React.useEffect(() => {
    if (!hasMore || isFetching || isFetchingMore) return;

    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        loadMore();
      }
    }, { threshold: 0.1 });

    if (sentinelRef.current) {
      observer.observe(sentinelRef.current);
    }

    return () => observer.disconnect();
  }, [hasMore, isFetching, isFetchingMore, loadMore]);

  // Carga inicial: buscar partidas al montar o al cambiar plataforma si la lista está vacía
  const lastSearchRef = React.useRef({ username: '', platform: '' });
  React.useEffect(() => {
    const shouldSearch =
      username &&
      games.length === 0 &&
      (lastSearchRef.current.username !== username || lastSearchRef.current.platform !== platform);

    if (shouldSearch) {
      lastSearchRef.current = { username, platform };
      performSearch(username, platform);
    }
  }, [username, games.length, platform, performSearch]);

  const handleSearch = async (e) => {
    if (e.key === 'Enter' || e.type === 'click') {
      performSearch(username, platform);
    }
  };

  const handleLoadGame = async (pgn, gameId) => {
    setLoadingId(gameId);
    const ok = loadPgn(pgn);
    if (!ok) { setLoadingId(null); return; }
    if (onGameSelect) onGameSelect();
    setLoadingId(null);
  };

  const listTitle = username ? `Partidas de ${username}` : 'Búsqueda de partidas';

  return (
    <div className="gi-root">

      {/* ── Platform toggle ─────────────────────────────────────── */}
      <div className="gi-platform-toggle">
        <button
          className={`gi-toggle-btn ${platform === 'lichess' ? 'active' : ''}`}
          onClick={() => handlePlatformSwitch('lichess')}
        >
          <img
            src="/lichess-favicon.png"
            alt="Lichess"
            className="gi-platform-icon"
            onError={(e) => { e.target.style.display = 'none'; }}
          />
          Lichess
        </button>
        <button
          className={`gi-toggle-btn ${platform === 'chesscom' ? 'active' : ''}`}
          onClick={() => handlePlatformSwitch('chesscom')}
        >
          <img
            src="/chesscom-favicon.ico"
            alt="Chess.com"
            className="gi-platform-icon"
            onError={(e) => { e.target.style.display = 'none'; }}
          />
          Chess.com
        </button>
        <button
          className={`gi-toggle-btn ${platform === 'pgn' ? 'active' : ''}`}
          onClick={() => handlePlatformSwitch('pgn')}
        >
          <FileText size={14} className="gi-platform-icon" />
          PGN Manual
        </button>
      </div>

      {platform === 'pgn' ? (
        <div className="gi-pgn-manual-wrap">
          <textarea
            className="gi-pgn-textarea premium-scroll"
            placeholder="Pega el texto de tu PGN aquí..."
            value={customPgn}
            onChange={(e) => setCustomPgn(e.target.value)}
          />
          <button
            className="gi-pgn-load-btn"
            onClick={() => handleLoadGame(customPgn, Date.now())}
            disabled={!customPgn.trim()}
          >
            Cargar al tablero
          </button>
        </div>
      ) : (
        <>
          {/* ── Search ──────────────────────────────────────────────── */}
          <div className="gi-search-wrap">
            <input
              className="gi-search-input"
              type="text"
              placeholder={`Usuario en ${platform === 'lichess' ? 'Lichess' : 'Chess.com'}…`}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyDown={handleSearch}
            />
            <button
              className="gi-search-btn"
              onClick={handleSearch}
              disabled={isFetching || !username.trim()}
              aria-label="Buscar"
            >
              {isFetching
                ? <Loader size={15} className="gi-spin" />
                : <Search size={15} />}
            </button>
          </div>


          {error && (
            <div className="gi-error">
              <AlertCircle size={13} />
              <span>{error}</span>
            </div>
          )}

          {/* ── Game list ───────────────────────────────────────────── */}
          <div className="gi-list-section">
            <p className="gi-list-label">{listTitle}</p>

            {isFetching ? (
              <div className="gi-fetching">
                <Loader size={22} className="gi-spin" />
                <span>Buscando partidas…</span>
              </div>
            ) : (
              <div className="gi-list premium-scroll">
                {games.length > 0 ? (
                  <>
                    {games.map((game) => (
                      <button
                        key={game.id}
                        className={`gi-card ${loadingId === game.id ? 'loading' : ''}`}
                        onClick={() => handleLoadGame(game.pgn, game.id)}
                        disabled={!!loadingId}
                      >
                        <div className="gi-card-players">
                          <span className="gi-player white" title={game.white}>{game.white}</span>
                          <span className="gi-result">{game.result}</span>
                          <span className="gi-player black" title={game.black}>{game.black}</span>
                        </div>
                        <div className="gi-card-meta">
                          <span className="gi-date">{game.date}</span>
                          {loadingId === game.id
                            ? <Loader size={13} className="gi-spin" />
                            : <ExternalLink size={13} className="gi-ext-icon" />}
                        </div>
                      </button>
                    ))}
                    {/* Sentinel para infinite scroll */}
                    <div ref={sentinelRef} className="gi-sentinel">
                      {isFetchingMore && (
                        <div className="gi-loading-more">
                          <Loader size={18} className="gi-spin" />
                          <span>Cargando más...</span>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  !isFetching && !error && (
                    <div className="gi-empty-state" />
                  )
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};