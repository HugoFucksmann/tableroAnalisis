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
    selectedGameIds, analysedGameIds,
    setSearchUsername, setSearchPlatform,
    setImportedGames, appendImportedGames, setPagination, resetGames,
    toggleGameSelection, selectAllGames, clearSelection,
    setAnalysedGameIds,
  } = useGameStore(useShallow(state => ({
    username: state.searchUsername,
    platform: state.searchPlatform,
    games: state.importedGames,
    lichessToken: state.lichessToken,
    lastTimestamp: state.lastTimestamp,
    chesscomPagination: state.chesscomPagination,
    hasMoreGames: state.hasMoreGames,
    selectedGameIds: state.selectedGameIds,
    analysedGameIds: state.analysedGameIds,
    setSearchUsername: state.setSearchUsername,
    setSearchPlatform: state.setSearchPlatform,
    setImportedGames: state.setImportedGames,
    appendImportedGames: state.appendImportedGames,
    setPagination: state.setPagination,
    resetGames: state.resetGames,
    toggleGameSelection: state.toggleGameSelection,
    selectAllGames: state.selectAllGames,
    clearSelection: state.clearSelection,
    setAnalysedGameIds: state.setAnalysedGameIds,
  })));

  // ── Local UI state ───────────────────────────────────────────────
  const [uiState, setUiState] = useState({
    loadingId: null,
    isFetching: false,
    isFetchingMore: false,
    isScanning: false,
    error: '',
    customPgn: '',
    batchStatus: null,
  });

  const { loadingId, isFetching, isFetchingMore, isScanning, error, customPgn, batchStatus } = uiState;

  const [hideAnalyzed, setHideAnalyzed] = useState(false);
  const [emptyPagesCount, setEmptyPagesCount] = useState(0);

  // ── Derived ──────────────────────────────────────────────────────
  // Build Set from the lightweight analysedGameIds (all entries, no LIMIT)
  const analysedIds = useMemo(() => new Set(analysedGameIds), [analysedGameIds]);

  const displayedGames = useMemo(() => {
    if (!hideAnalyzed) return games;
    return games.filter(g => !analysedIds.has(String(g.id)));
  }, [games, analysedIds, hideAnalyzed]);

  const allSelected = useMemo(() => {
    if (displayedGames.length === 0) return false;
    return displayedGames.every(g => selectedGameIds.includes(g.id));
  }, [displayedGames, selectedGameIds]);

  const handleToggleAll = useCallback(() => {
    if (allSelected) {
      const visibleIds = new Set(displayedGames.map(g => g.id));
      const newSelected = selectedGameIds.filter(id => !visibleIds.has(id));
      useGameStore.setState({ selectedGameIds: newSelected });
    } else {
      const newSelected = Array.from(new Set([...selectedGameIds, ...displayedGames.map(g => g.id)]));
      useGameStore.setState({ selectedGameIds: newSelected });
    }
  }, [allSelected, displayedGames, selectedGameIds]);

  const handleToggleHideAnalyzed = useCallback(() => {
    setHideAnalyzed(prev => {
      const newVal = !prev;
      setEmptyPagesCount(0);
      return newVal;
    });
  }, [setHideAnalyzed, setEmptyPagesCount]);

  // updateUi supports both plain patches and functional updaters (prevents stale closures)
  const updateUi = useCallback(
    (patch) => setUiState(prev => ({ ...prev, ...(typeof patch === 'function' ? patch(prev) : patch) })),
    []
  );

  const listRef = useRef(null);
  const fetchingRef = useRef(false);
  const [sentinelNode, setSentinelNode] = useState(null);
  const sentinelRef = useCallback((node) => {
    setSentinelNode(node);
  }, []);

  // ── Sync analysedGameIds and batch status ────────────────────────
  useEffect(() => {
    const cleanup = backendService.addHandler((msg) => {
      // Lightweight: only gameIds needed for badge rendering
      if (msg.type === 'analysed_ids') {
        setAnalysedGameIds(msg.ids);
      }

      // Batch analysis handlers
      switch (msg.type) {
        case 'batch_analysis_started':
          updateUi({ batchStatus: { current: 0, total: msg.total, pct: 0, label: 'Iniciando…' } });
          break;
        case 'batch_analysis_progress':
          // Use functional updater to avoid stale closure on batchStatus
          updateUi(prev => ({
            batchStatus: { ...prev.batchStatus, current: msg.gameIndex, pct: msg.pct, label: msg.label },
          }));
          break;
        case 'batch_analysis_game_complete':
          updateUi(prev => ({
            batchStatus: { ...prev.batchStatus, current: msg.gameIndex + 1, pct: 100 },
          }));
          break;
        case 'batch_analysis_complete':
        case 'batch_analysis_cancelled':
          updateUi({ batchStatus: null });
          clearSelection();
          setEmptyPagesCount(0); // Reset empty count so we can auto-search more after a batch completes
          // Refresh the full analysed IDs set after a batch completes
          backendService.getAnalysedIds();
          break;
      }
    });

    // Load all analysed IDs on mount (no LIMIT, just gameId strings)
    backendService.getAnalysedIds();

    return () => cleanup();
  }, [setAnalysedGameIds, clearSelection, updateUi, setEmptyPagesCount]);

  // ── Handlers ─────────────────────────────────────────────────────
  const handlePlatformSwitch = (p) => {
    setSearchPlatform(p);
    resetGames();
    updateUi({ error: '' });
    setEmptyPagesCount(0);
  };

  const performSearch = useCallback(async (targetUsername, targetPlatform) => {
    if (!targetUsername.trim()) return;
    updateUi({ isFetching: true, error: '' });
    resetGames();
    setEmptyPagesCount(0);

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
  }, [lichessToken, setImportedGames, setPagination, resetGames, updateUi, setEmptyPagesCount]);

  // ── Fetch a single page and append unique games ──────────────────
  // Returns: { fetchedGames, hasMore } or null on error
  const fetchOnePage = useCallback(async () => {
    const storeState = useGameStore.getState();
    const currentLastTimestamp = storeState.lastTimestamp;
    const currentChesscomPagination = storeState.chesscomPagination;
    const currentHasMore = storeState.hasMoreGames;

    if (!currentHasMore) return null;

    let fetchedGames = [];
    if (platform === 'lichess') {
      const result = await fetchLichessGames(username.trim(), 15, currentLastTimestamp, lichessToken);
      fetchedGames = result.games;
      const existingIds = new Set(useGameStore.getState().importedGames.map(g => g.id));
      appendImportedGames(fetchedGames.filter(g => !existingIds.has(g.id)));
      setPagination({ lastTimestamp: result.lastTimestamp, chesscomPagination: null, hasMoreGames: result.hasMore });
      return { fetchedGames, hasMore: result.hasMore };
    } else if (platform === 'chesscom') {
      const result = await fetchChesscomGames(username.trim(), 15, currentChesscomPagination);
      fetchedGames = result.games;
      const existingIds = new Set(useGameStore.getState().importedGames.map(g => g.id));
      appendImportedGames(fetchedGames.filter(g => !existingIds.has(g.id)));
      setPagination({ lastTimestamp: null, chesscomPagination: result.pagination, hasMoreGames: result.hasMore });
      return { fetchedGames, hasMore: result.hasMore };
    }
    return null;
  }, [platform, username, lichessToken, appendImportedGames, setPagination]);

  // ── Normal scroll: load one page (used when filter is off) ───────
  const loadMore = useCallback(async () => {
    if (fetchingRef.current || !hasMoreGames || !username) return;
    fetchingRef.current = true;
    updateUi({ isFetchingMore: true });
    try {
      await fetchOnePage();
    } catch (err) {
      console.error('Error loading more games:', err);
    } finally {
      fetchingRef.current = false;
      updateUi({ isFetchingMore: false });
    }
  }, [hasMoreGames, username, fetchOnePage, updateUi]);

  // ── Filter scan: loop pages until unanalyzed games found ─────────
  // Reads analysedIds from Zustand to always have the latest set.
  const scanUntilUnanalyzed = useCallback(async () => {
    if (fetchingRef.current || !username) return;
    if (!useGameStore.getState().hasMoreGames) return;

    fetchingRef.current = true;
    updateUi({ isScanning: true, isFetchingMore: false });
    try {
      while (true) {
        const currentAnalysedIds = new Set(useGameStore.getState().analysedGameIds.map(String));
        const result = await fetchOnePage();
        if (!result) break;

        const { fetchedGames, hasMore } = result;
        const foundUnanalysed = fetchedGames.some(g => !currentAnalysedIds.has(String(g.id)));
        if (foundUnanalysed) break;
        if (!hasMore) break;

        // Small delay between pages to avoid rate-limiting
        await new Promise(r => setTimeout(r, 300));
      }
    } catch (err) {
      console.error('Error scanning for unanalyzed games:', err);
    } finally {
      fetchingRef.current = false;
      updateUi({ isScanning: false });
    }
  }, [username, fetchOnePage, updateUi]);

  // Infinite scroll observer
  useEffect(() => {
    if (!hasMoreGames || isFetching || !sentinelNode) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !fetchingRef.current) {
          if (hideAnalyzed) {
            scanUntilUnanalyzed();
          } else {
            loadMore();
          }
        }
      },
      { root: listRef.current, rootMargin: '200px', threshold: 0.1 }
    );
    observer.observe(sentinelNode);
    return () => observer.disconnect();
  }, [hasMoreGames, isFetching, loadMore, scanUntilUnanalyzed, hideAnalyzed, sentinelNode]);

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

        // Opponent is the other player name; gameDate is the real match date from the platform
        const opponent = isWhite ? g.black : (isBlack ? g.white : '');
        const gameDate = g.createdAt ? new Date(g.createdAt).toISOString() : null;

        acc.push({
          pgn: g.pgn,
          gameId: g.id,
          username: username.trim(),
          playerColor,
          win,
          timeControl: g.timeControl,
          opponent,
          gameDate,
        });
      }
      return acc;
    }, []);

    if (selectedGames.length > 0) {
      backendService.analyzeGames(selectedGames, useGameStore.getState().engineConfig);
    }
  };

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
            onToggleAll={handleToggleAll}
            analysedIds={analysedIds}
            selectedGameIds={selectedGameIds}
            loadingId={loadingId}
            onToggleGameSelection={toggleGameSelection}
            onLoadGame={handleLoadGame}
            isFetchingMore={isFetchingMore}
            isScanning={isScanning}
            listRef={listRef}
            sentinelRef={sentinelRef}
            hideAnalyzed={hideAnalyzed}
            onToggleHideAnalyzed={handleToggleHideAnalyzed}
            hasMoreGames={hasMoreGames}
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