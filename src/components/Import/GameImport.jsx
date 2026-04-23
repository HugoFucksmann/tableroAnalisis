import React from 'react';
import { useGameStore } from '../../store/useGameStore';
import { fetchLichessGames, fetchChesscomGames } from '../../services/gameApi';
import { Search, ExternalLink, Loader, AlertCircle, Key, Settings } from 'lucide-react';
import { EngineConfigModal } from './EngineConfigModal';
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
    engineConfig,
  } = useGameStore();

  const [loadingId, setLoadingId] = React.useState(null);
  const [isFetching, setIsFetching] = React.useState(false);
  const [error, setError] = React.useState('');
  const [showTokenInput, setShowTokenInput] = React.useState(false);
  const [showEngineConfig, setShowEngineConfig] = React.useState(false);

  const handlePlatformSwitch = (p) => {
    setPlatform(p);
    setGames([]);
    setError('');
  };

  const performSearch = async (targetUsername, targetPlatform) => {
    if (!targetUsername.trim()) return;
    setIsFetching(true);
    setError('');
    try {
      const fetchedGames =
        targetPlatform === 'lichess'
          ? await fetchLichessGames(targetUsername.trim(), 10, lichessToken)
          : await fetchChesscomGames(targetUsername.trim());
      setGames(fetchedGames);
      if (fetchedGames.length === 0) setError('No se encontraron partidas recientes.');
    } catch (err) {
      setError(err.message);
      setGames([]);
    } finally {
      setIsFetching(false);
    }
  };

  React.useEffect(() => {
    if (username && games.length === 0 && !isFetching) {
      performSearch(username, platform);
    }
  }, []);

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

  // Quick summary shown in the engine row badge
  const depth = engineConfig?.depth ?? 18;
  const multiPv = engineConfig?.multiPv ?? 1;
  const configSummary = `D${depth} · ${multiPv}PV`;

  return (
    <div className="gi-root">

      {/* ── Engine settings row ─────────────────────────────────── */}
      <div className="gi-engine-selector">
        <div className="gi-engine-info">
          <span className="gi-engine-label">Motor:</span>
          <span className="gi-engine-name">Stockfish 18 Lite</span>
          <span className="gi-engine-config-badge">{configSummary}</span>
        </div>
        <button
          className="gi-engine-gear-btn"
          onClick={() => setShowEngineConfig(true)}
          title="Configurar motor de análisis"
          aria-label="Configurar motor de análisis"
        >
          <Settings size={14} />
        </button>
      </div>

      {showEngineConfig && (
        <EngineConfigModal onClose={() => setShowEngineConfig(false)} />
      )}

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
      </div>

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
        {platform === 'lichess' && (
          <button
            className={`gi-token-toggle-btn ${lichessToken ? 'has-token' : ''}`}
            onClick={() => setShowTokenInput(!showTokenInput)}
            title="Configurar Token de Lichess"
          >
            <Key size={15} />
          </button>
        )}
      </div>

      {showTokenInput && platform === 'lichess' && (
        <div className="gi-token-input-wrap">
          <input
            className="gi-token-input"
            type="password"
            placeholder="Lichess Personal Token..."
            value={lichessToken}
            onChange={(e) => setLichessToken(e.target.value)}
          />
          <p className="gi-token-hint">
            Requerido para evitar errores 401 en el Opening Explorer.
          </p>
        </div>
      )}

      {/* ── Analysis progress ───────────────────────────────────── */}
      {isAnalyzing && (
        <div className="gi-analysis-bar">
          <div className="gi-analysis-header">
            <Loader size={12} className="gi-spin" />
            <span>Analizando con Stockfish</span>
            <span className="gi-analysis-pct">{analysisProgress}%</span>
          </div>
          <div className="gi-track">
            <div className="gi-fill" style={{ width: `${analysisProgress}%` }} />
          </div>
        </div>
      )}

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
              games.map((game) => (
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
              ))
            ) : (
              !isFetching && !error && (
                <div className="gi-empty-state" />
              )
            )}
          </div>
        )}
      </div>

    </div>
  );
};