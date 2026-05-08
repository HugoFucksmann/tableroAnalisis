import React from 'react';
import { useGameStore } from '../../store/useGameStore';
import { useShallow } from 'zustand/react/shallow';
import { fetchLichessGames, fetchChesscomGames } from '../../services/gameApi';
import { Search, ExternalLink, Loader, AlertCircle, FileText, Zap, CheckSquare, Square, Cpu, Brain, X } from 'lucide-react';
import { backendService } from '../../services/backendService';
import './GameImport.css';

export const GameImport = ({ onGameSelect }) => {
  // ── Store: game state ────────────────────────────────────────────
  const loadPgn = useGameStore(s => s.loadPgn);

  // ── Store: library slice ─────────────────────────────────────────
  const {
    username, platform, games, lichessToken,
    lastTimestamp, chesscomPagination, hasMoreGames,
    selectedGameIds, analyses,
    setSearchUsername, setSearchPlatform,
    setImportedGames, appendImportedGames, setPagination, resetGames,
    toggleGameSelection, selectAllGames, clearSelection,
    setAnalyses,
  } = useGameStore(useShallow(state => ({
    username: state.searchUsername,
    platform: state.searchPlatform,
    games: state.importedGames,
    lichessToken: state.lichessToken,
    lastTimestamp: state.lastTimestamp,
    chesscomPagination: state.chesscomPagination,
    hasMoreGames: state.hasMoreGames,
    selectedGameIds: state.selectedGameIds,
    analyses: state.analyses,
    setSearchUsername: state.setSearchUsername,
    setSearchPlatform: state.setSearchPlatform,
    setImportedGames: state.setImportedGames,
    appendImportedGames: state.appendImportedGames,
    setPagination: state.setPagination,
    resetGames: state.resetGames,
    toggleGameSelection: state.toggleGameSelection,
    selectAllGames: state.selectAllGames,
    clearSelection: state.clearSelection,
    setAnalyses: state.setAnalyses,
  })));

  // ── Local UI state (transient, no need to persist) ───────────────
  const [loadingId, setLoadingId] = React.useState(null);
  const [isFetching, setIsFetching] = React.useState(false);
  const [isFetchingMore, setIsFetchingMore] = React.useState(false);
  const [error, setError] = React.useState('');
  const [customPgn, setCustomPgn] = React.useState('');
  const [batchStatus, setBatchStatus] = React.useState(null);

  const listRef = React.useRef(null);
  const sentinelRef = React.useRef(null);

  // ── Sync analyses cache from backend on mount ────────────────────
  React.useEffect(() => {
    const cleanup = backendService.addHandler((msg) => {
      if (msg.type === 'analyses_list') {
        if (msg.offset === 0) {
          setAnalyses(msg.analyses);
        } else {
          setAnalyses(prev => {
            const existingIds = new Set(prev.map(a => a.id));
            const newItems = msg.analyses.filter(a => !existingIds.has(a.id));
            return [...prev, ...newItems];
          });
        }
      }

      // Batch analysis handlers
      if (msg.type === 'batch_analysis_started') {
        setBatchStatus({ current: 0, total: msg.total, pct: 0, label: 'Iniciando...' });
      } else if (msg.type === 'batch_analysis_progress') {
        setBatchStatus(prev => ({
          ...prev,
          current: msg.gameIndex,
          pct: msg.pct,
          label: msg.label
        }));
      } else if (msg.type === 'batch_analysis_game_complete') {
        setBatchStatus(prev => ({ ...prev, current: msg.gameIndex + 1, pct: 100 }));
      } else if (msg.type === 'batch_analysis_complete') {
        setBatchStatus(null);
        clearSelection();
        backendService.getAnalyses(0, 50); // Refresh list
      } else if (msg.type === 'batch_analysis_cancelled') {
        setBatchStatus(null);
        backendService.getAnalyses(0, 50);
      }
    });
    backendService.getAnalyses(0, 50);
    return () => cleanup();
  }, [setAnalyses, clearSelection]);

  // ── Handlers ─────────────────────────────────────────────────────
  const handlePlatformSwitch = (p) => {
    setSearchPlatform(p);
    resetGames();
    setError('');
  };

  const performSearch = React.useCallback(async (targetUsername, targetPlatform) => {
    if (!targetUsername.trim()) return;
    setIsFetching(true);
    setError('');
    resetGames();

    try {
      if (targetPlatform === 'lichess') {
        const result = await fetchLichessGames(targetUsername.trim(), 15, null, lichessToken);
        setImportedGames(result.games);
        setPagination({ lastTimestamp: result.lastTimestamp, chesscomPagination: null, hasMoreGames: result.hasMore });
        if (result.games.length === 0) setError('No se encontraron partidas recientes.');
      } else if (targetPlatform === 'chesscom') {
        const result = await fetchChesscomGames(targetUsername.trim(), 15, null);
        setImportedGames(result.games);
        setPagination({ lastTimestamp: null, chesscomPagination: result.pagination, hasMoreGames: result.hasMore });
        if (result.games.length === 0) setError('No se encontraron partidas recientes.');
      }
    } catch (err) {
      setError(err.message);
      resetGames();
    } finally {
      setIsFetching(false);
    }
  }, [lichessToken, setImportedGames, setPagination, resetGames]);

  const loadMore = React.useCallback(async () => {
    if (isFetching || isFetchingMore || !hasMoreGames || !username) return;
    setIsFetchingMore(true);
    try {
      if (platform === 'lichess') {
        const result = await fetchLichessGames(username.trim(), 15, lastTimestamp, lichessToken);
        appendImportedGames(result.games);
        setPagination({ lastTimestamp: result.lastTimestamp, chesscomPagination, hasMoreGames: result.hasMore });
      } else if (platform === 'chesscom') {
        const result = await fetchChesscomGames(username.trim(), 15, chesscomPagination);
        appendImportedGames(result.games);
        setPagination({ lastTimestamp: null, chesscomPagination: result.pagination, hasMoreGames: result.hasMore });
      }
    } catch (err) {
      console.error('Error loading more games:', err);
    } finally {
      setIsFetchingMore(false);
    }
  }, [isFetching, isFetchingMore, hasMoreGames, username, platform, lastTimestamp, chesscomPagination, lichessToken, appendImportedGames, setPagination]);

  // Infinite scroll observer
  React.useEffect(() => {
    if (!hasMoreGames || isFetching) return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting && !isFetchingMore) loadMore(); },
      { root: listRef.current, rootMargin: '200px', threshold: 0.1 }
    );
    if (sentinelRef.current) observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasMoreGames, isFetching, isFetchingMore, loadMore]);

  // Auto-search on mount if username is set and list is empty
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

  const handleSearch = (e) => {
    if (e.key === 'Enter' || e.type === 'click') performSearch(username, platform);
  };

  const handleLoadGame = (pgn, gameId) => {
    setLoadingId(gameId);
    const ok = loadPgn(pgn, gameId);
    if (!ok) { setLoadingId(null); return; }
    if (onGameSelect) onGameSelect();
    setLoadingId(null);
  };

  // ── Derived ──────────────────────────────────────────────────────
  const analysedIds = React.useMemo(
    () => new Set(analyses.map(a => String(a.gameId))),
    [analyses]
  );

  // ── Bulk actions ─────────────────────────────────────────────────
  const unanalysedIds = React.useMemo(
    () => games.filter(g => !analysedIds.has(String(g.id))).map(g => g.id),
    [games, analysedIds]
  );

  const selectedCount = selectedGameIds.length;
  // Consideramos "todo seleccionado" si están marcadas todas las no analizadas,
  // o si absolutamente todas las partidas de la lista están marcadas.
  const allSelected = games.length > 0 && (
    (unanalysedIds.length > 0 && unanalysedIds.every(id => selectedGameIds.includes(id))) ||
    (selectedCount > 0 && selectedCount === games.length)
  );

  const handleAnalyzeBatch = () => {
    const selectedGames = games
      .filter(g => selectedGameIds.includes(g.id))
      .map(g => ({
        pgn: g.pgn,
        gameId: g.id,
        playerColor: g.white.toLowerCase().includes(username.toLowerCase()) ? 'white' : 'black',
        win: g.result === '1-0' ? (g.white.toLowerCase().includes(username.toLowerCase())) : (g.result === '0-1' ? g.black.toLowerCase().includes(username.toLowerCase()) : false)
      }));
    if (selectedGames.length === 0) return;
    backendService.analyzeGames(selectedGames, useGameStore.getState().engineConfig);
  };

  const handleCancelBatch = () => {
    backendService.cancel();
  };

  const listTitle = username ? `Partidas de ${username}` : 'Búsqueda de partidas';

  return (
    <div className="gi-root">

      <div className="gi-header-bar">
        {/* ── Platform selector ───────────────────────────────────── */}
        <div className="gi-platform-toggle">
          <button
            className={`gi-toggle-btn ${platform === 'lichess' ? 'active' : ''}`}
            onClick={() => handlePlatformSwitch('lichess')}
            title="Lichess"
          >
            <img src="/lichess-favicon.png" alt="Lichess" className="gi-platform-icon"
              onError={(e) => { e.target.style.display = 'none'; }} />
          </button>
          <button
            className={`gi-toggle-btn ${platform === 'chesscom' ? 'active' : ''}`}
            onClick={() => handlePlatformSwitch('chesscom')}
            title="Chess.com"
          >
            <img src="/chesscom-favicon.ico" alt="Chess.com" className="gi-platform-icon"
              onError={(e) => { e.target.style.display = 'none'; }} />
          </button>
          <button
            className={`gi-toggle-btn ${platform === 'pgn' ? 'active' : ''}`}
            onClick={() => handlePlatformSwitch('pgn')}
            title="PGN Manual"
          >
            <FileText size={16} className="gi-platform-icon" />
          </button>
        </div>

        {/* ── Search Input (if not PGN) ─────────────────────────── */}
        {platform !== 'pgn' && (
          <div className="gi-search-wrap">
            <input
              className="gi-search-input"
              type="text"
              placeholder={`Usuario en ${platform === 'lichess' ? 'Lichess' : 'Chess.com'}…`}
              value={username}
              onChange={(e) => setSearchUsername(e.target.value)}
              onKeyDown={handleSearch}
            />
            <button
              className="gi-search-btn"
              onClick={handleSearch}
              disabled={isFetching || !username.trim()}
              aria-label="Buscar"
            >
              {isFetching ? <Loader size={15} className="gi-spin" /> : <Search size={15} />}
            </button>
          </div>
        )}
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
          {error && (
            <div className="gi-error">
              <AlertCircle size={13} /><span>{error}</span>
            </div>
          )}

          {/* ── Game list ──────────────────────────────────────── */}
          <div className="gi-list-section">
            {games.length > 0 && (
              <div className="gi-list-header">
                <p className="gi-list-label">{listTitle}</p>
                <button
                  className="gi-select-all-btn"
                  onClick={() => allSelected ? clearSelection() : selectAllGames()}
                  title={allSelected ? 'Deseleccionar todo' : 'Seleccionar todo'}
                >
                  {allSelected
                    ? <CheckSquare size={14} />
                    : <Square size={14} />}
                  <span>{allSelected ? 'Ninguna' : 'Todas'}</span>
                </button>
              </div>
            )}
            {!games.length && <p className="gi-list-label">{listTitle}</p>}

            {isFetching ? (
              <div className="gi-fetching">
                <Loader size={22} className="gi-spin" />
                <span>Buscando partidas…</span>
              </div>
            ) : (
              <div ref={listRef} className="gi-list premium-scroll">
                {games.length > 0 ? (
                  <>
                    {games.map((game) => {
                      const isAnalyzed = analysedIds.has(String(game.id));
                      const isSelected = selectedGameIds.includes(game.id);
                      return (
                        <div
                          key={game.id}
                          className={`gi-card ${isAnalyzed ? 'analyzed' : ''} ${isSelected ? 'selected' : ''}`}
                        >
                          {/* Checkbox de selección */}
                          <button
                            className="gi-checkbox"
                            onClick={(e) => { e.stopPropagation(); toggleGameSelection(game.id); }}
                            title="Seleccionar para acción masiva"
                            aria-label={isSelected ? 'Deseleccionar partida' : 'Seleccionar partida'}
                          >
                            {isSelected ? <CheckSquare size={15} /> : <Square size={15} />}
                          </button>

                          {/* Área principal: carga la partida al tablero */}
                          <button
                            className={`gi-card-body ${loadingId === game.id ? 'loading' : ''}`}
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
                              <div className="gi-card-status">
                                {isAnalyzed && (
                                  <span className="gi-analyzed-badge" title="Partida analizada">
                                    <Zap size={10} fill="currentColor" />
                                  </span>
                                )}
                                {loadingId === game.id
                                  ? <Loader size={13} className="gi-spin" />
                                  : <ExternalLink size={13} className="gi-ext-icon" />}
                              </div>
                            </div>
                          </button>
                        </div>
                      );
                    })}

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
                  !isFetching && !error && <div className="gi-empty-state" />
                )}
              </div>
            )}
          </div>

          {/* ── Batch Progress Overlay ─────────────────────────── */}
          {batchStatus && (
            <div className="gi-batch-overlay">
              <div className="gi-batch-card">
                <div className="gi-batch-header">
                  <Brain size={18} className="gi-brain-icon" />
                  <div className="gi-batch-title">
                    <h4>Analizando Partidas</h4>
                    <span>Partida {batchStatus.current + 1} de {batchStatus.total}</span>
                  </div>
                  <button className="gi-batch-cancel" onClick={handleCancelBatch}>
                    <X size={16} />
                  </button>
                </div>

                <div className="gi-batch-progress">
                  <div className="gi-progress-track">
                    <div
                      className="gi-progress-fill"
                      style={{ width: `${batchStatus.pct}%` }}
                    />
                  </div>
                  <div className="gi-progress-info">
                    <span className="gi-progress-label">{batchStatus.label}</span>
                    <span className="gi-progress-pct">{batchStatus.pct}%</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Bulk Action Bar ────────────────────────────────── */}
          {selectedCount > 0 && !batchStatus && (
            <div className="gi-bulk-bar">
              <span className="gi-bulk-count">{selectedCount} seleccionada{selectedCount !== 1 ? 's' : ''}</span>
              <div className="gi-bulk-actions">
                <button
                  className="gi-bulk-btn analyze"
                  onClick={handleAnalyzeBatch}
                  title="Analizar partidas seleccionadas en lote"
                >
                  <Cpu size={14} />
                  Analizar Partidas
                </button>
              </div>
              <button className="gi-bulk-clear" onClick={clearSelection} title="Limpiar selección">✕</button>
            </div>
          )}
        </>
      )}
    </div>
  );
};