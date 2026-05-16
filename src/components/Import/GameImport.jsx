import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useGameStore } from '../../store/useGameStore';
import { useShallow } from 'zustand/react/shallow';
import { fetchLichessGames, fetchChesscomGames } from '../../services/gameApi';
import { backendService } from '../../services/backendService';
import './GameImport.css';

// Sub-components
import { PlatformSelector } from './GameImport/PlatformSelector';
import { SearchInput } from './GameImport/SearchInput';
import { PgnManualImport } from './GameImport/PgnManualImport';
import { ImportGameList } from './GameImport/ImportGameList';
import { BatchProgressOverlay } from './GameImport/BatchProgressOverlay';
import { BulkActionBar } from './GameImport/BulkActionBar';
import { AlertCircle } from 'lucide-react';

export const GameImport = ({ onGameSelect }) => {
  // ── Store ──────────────────────────────────────────────────────────
  const loadPgn = useGameStore(s => s.loadPgn);

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

  // ── Local UI state ───────────────────────────────────────────────
  const [uiState, setUiState] = useState({
    loadingId: null,
    isFetching: false,
    isFetchingMore: false,
    error: '',
    customPgn: '',
    batchStatus: null,
  });

  const { loadingId, isFetching, isFetchingMore, error, customPgn, batchStatus } = uiState;
  const updateUi = (patch) => setUiState(prev => ({ ...prev, ...patch }));

  const listRef = useRef(null);
  const sentinelRef = useRef(null);

  // ── Sync analyses cache and batch status ─────────────────────────
  useEffect(() => {
    const cleanup = backendService.addHandler((msg) => {
      if (msg.type === 'analyses_list') {
        if (msg.offset === 0) setAnalyses(msg.analyses);
        else setAnalyses(prev => {
          const existingIds = new Set(prev.map(a => a.id));
          const newItems = msg.analyses.filter(a => !existingIds.has(a.id));
          return [...prev, ...newItems];
        });
      }

      // Batch analysis handlers
      switch (msg.type) {
        case 'batch_analysis_started':
          updateUi({ batchStatus: { current: 0, total: msg.total, pct: 0, label: 'Iniciando…' } });
          break;
        case 'batch_analysis_progress':
          updateUi({ batchStatus: { ...batchStatus, current: msg.gameIndex, pct: msg.pct, label: msg.label } });
          break;
        case 'batch_analysis_game_complete':
          updateUi({ batchStatus: { ...batchStatus, current: msg.gameIndex + 1, pct: 100 } });
          break;
        case 'batch_analysis_complete':
        case 'batch_analysis_cancelled':
          updateUi({ batchStatus: null });
          clearSelection();
          backendService.getAnalyses(0, 50);
          break;
      }
    });
    backendService.getAnalyses(0, 50);
    return () => cleanup();
  }, [setAnalyses, clearSelection]);

  // ── Handlers ─────────────────────────────────────────────────────
  const handlePlatformSwitch = (p) => {
    setSearchPlatform(p);
    resetGames();
    updateUi({ error: '' });
  };

  const performSearch = useCallback(async (targetUsername, targetPlatform) => {
    if (!targetUsername.trim()) return;
    updateUi({ isFetching: true, error: '' });
    resetGames();

    try {
      if (targetPlatform === 'lichess') {
        const result = await fetchLichessGames(targetUsername.trim(), 15, null, lichessToken);
        setImportedGames(result.games);
        setPagination({ lastTimestamp: result.lastTimestamp, chesscomPagination: null, hasMoreGames: result.hasMore });
        if (result.games.length === 0) updateUi({ error: 'No se encontraron partidas recientes.' });
      } else if (targetPlatform === 'chesscom') {
        const result = await fetchChesscomGames(targetUsername.trim(), 15, null);
        setImportedGames(result.games);
        setPagination({ lastTimestamp: null, chesscomPagination: result.pagination, hasMoreGames: result.hasMore });
        if (result.games.length === 0) updateUi({ error: 'No se encontraron partidas recientes.' });
      }
    } catch (err) {
      updateUi({ error: err.message });
      resetGames();
    } finally {
      updateUi({ isFetching: false });
    }
  }, [lichessToken, setImportedGames, setPagination, resetGames]);

  const loadMore = useCallback(async () => {
    if (isFetching || isFetchingMore || !hasMoreGames || !username) return;
    updateUi({ isFetchingMore: true });
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
      updateUi({ isFetchingMore: false });
    }
  }, [isFetching, isFetchingMore, hasMoreGames, username, platform, lastTimestamp, chesscomPagination, lichessToken, appendImportedGames, setPagination]);

  // Infinite scroll observer
  useEffect(() => {
    if (!hasMoreGames || isFetching) return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting && !isFetchingMore) loadMore(); },
      { root: listRef.current, rootMargin: '200px', threshold: 0.1 }
    );
    if (sentinelRef.current) observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasMoreGames, isFetching, isFetchingMore, loadMore]);

  // Auto-search logic
  const lastSearchRef = useRef({ username: '', platform: '' });
  useEffect(() => {
    const shouldSearch = username && games.length === 0 && 
      (lastSearchRef.current.username !== username || lastSearchRef.current.platform !== platform);
    if (shouldSearch) {
      lastSearchRef.current = { username, platform };
      performSearch(username, platform);
    }
  }, [username, games.length, platform, performSearch]);

  const handleLoadGame = (pgn, gameId) => {
    updateUi({ loadingId: gameId });
    const ok = loadPgn(pgn, gameId);
    if (ok && onGameSelect) onGameSelect();
    updateUi({ loadingId: null });
  };

  const handleAnalyzeBatch = () => {
    const userLower = username.trim().toLowerCase();
    const selectedSet = new Set(selectedGameIds);
    
    const selectedGames = games.reduce((acc, g) => {
      if (selectedSet.has(g.id)) {
        const isWhite = g.white.toLowerCase() === userLower;
        const isBlack = g.black.toLowerCase() === userLower;
        const playerColor = isWhite ? 'white' : (isBlack ? 'black' : 'white');
        
        const win = g.result === '1/2-1/2' ? 0 : ((isWhite && g.result === '1-0') || (isBlack && g.result === '0-1') ? 1 : -1);

        acc.push({ 
          pgn: g.pgn, 
          gameId: g.id, 
          username: username.trim(), 
          playerColor, 
          win, 
          timeControl: g.timeControl 
        });
      }
      return acc;
    }, []);

    if (selectedGames.length > 0) {
      backendService.analyzeGames(selectedGames, useGameStore.getState().engineConfig);
    }
  };

  // ── Derived ──────────────────────────────────────────────────────
  const analysedIds = useMemo(() => new Set(analyses.map(a => String(a.gameId))), [analyses]);
  const unanalysedIds = useMemo(() => 
    games.reduce((acc, g) => {
      if (!analysedIds.has(String(g.id))) acc.push(g.id);
      return acc;
    }, []), [games, analysedIds]);
  const allSelected = games.length > 0 && (
    (unanalysedIds.length > 0 && unanalysedIds.every(id => selectedGameIds.includes(id))) ||
    (selectedGameIds.length > 0 && selectedGameIds.length === games.length)
  );

  return (
    <div className="gi-root">
      <div className="gi-header-bar">
        <PlatformSelector platform={platform} onPlatformSwitch={handlePlatformSwitch} />
        <SearchInput 
          platform={platform} 
          username={username} 
          setSearchUsername={setSearchUsername} 
          onSearch={() => performSearch(username, platform)} 
          isFetching={isFetching} 
        />
      </div>

      {platform === 'pgn' ? (
        <PgnManualImport customPgn={customPgn} setCustomPgn={(val) => updateUi({ customPgn: val })} onLoad={(pgn) => handleLoadGame(pgn, `${Date.now()}`)} />
      ) : (
        <>
          {error && <div className="gi-error"><AlertCircle size={13} /><span>{error}</span></div>}
          
          <ImportGameList 
            games={games}
            isFetching={isFetching}
            error={error}
            listTitle={username ? `Partidas de ${username}` : 'Búsqueda de partidas'}
            allSelected={allSelected}
            onToggleAll={() => allSelected ? clearSelection() : selectAllGames()}
            analysedIds={analysedIds}
            selectedGameIds={selectedGameIds}
            loadingId={loadingId}
            onToggleGameSelection={toggleGameSelection}
            onLoadGame={handleLoadGame}
            isFetchingMore={isFetchingMore}
            listRef={listRef}
            sentinelRef={sentinelRef}
          />

          <BatchProgressOverlay batchStatus={batchStatus} onCancel={() => backendService.cancel()} />
          
          <BulkActionBar 
            selectedCount={selectedGameIds.length} 
            batchStatus={batchStatus} 
            onAnalyze={handleAnalyzeBatch} 
            onClear={clearSelection} 
          />
        </>
      )}
    </div>
  );
};