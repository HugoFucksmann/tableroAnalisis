import React, { useEffect, useCallback, useReducer, useRef } from 'react';
// eslint-disable-next-line no-unused-vars
import { motion } from 'framer-motion';
import { useShallow } from 'zustand/react/shallow';
import { backendService } from '../../services/backendService';
import { useGameStore } from '../../store/useGameStore';
import './StatsDashboard.css';

// Sub-components
import { statsInitialState, statsReducer } from './StatsDashboard/StatsReducer';
import { StatsTabs } from './StatsDashboard/StatsTabs';
import { StatsFilterBar } from './StatsDashboard/StatsFilterBar';
import { StatsSummaryView } from './StatsDashboard/StatsSummaryView';
import { HistoryListView } from './StatsDashboard/HistoryListView';

const PAGE_SIZE = 50;

export const StatsDashboard = () => {
  const [state, dispatch] = useReducer(statsReducer, statsInitialState);
  const {
    rawData, loading, activeTab, selectedIds, historyLoaded,
    isFiltering, historyOffset, hasMore, timeFilter, durationFilter, countFilter
  } = state;

  const { username, analyses, setAnalyses, appendAnalyses, removeAnalyses } = useGameStore(useShallow(state => ({
    username: state.searchUsername,
    analyses: state.analyses,
    setAnalyses: state.setAnalyses,
    appendAnalyses: state.appendAnalyses,
    removeAnalyses: state.removeAnalyses,
  })));

  const lastStatsRequestId = useRef(null);
  const filterTimeoutRef = useRef(null);
  const loadingRef = useRef(loading);
  const prevFiltersRef = useRef({ time: timeFilter, duration: durationFilter, count: countFilter });

  useEffect(() => {
    loadingRef.current = loading;
  }, [loading]);

  // ── Handlers ─────────────────────────────────────────────────────
  const fetchStats = useCallback((force = false) => {
    if (loadingRef.current && !force) return;
    dispatch({ type: 'UPDATE', payload: { isFiltering: true } });
    const reqId = Math.random().toString(36).substring(7);
    lastStatsRequestId.current = reqId;
    backendService.getStats({
      time: timeFilter,
      duration: durationFilter,
      count: countFilter,
      username: username
    }, reqId);
  }, [timeFilter, durationFilter, countFilter, username]);

  // ── Side Effects ─────────────────────────────────────────────────
  useEffect(() => {
    const cleanup = backendService.addHandler((msg) => {
      if (msg.type === 'connection_status' && msg.connected) fetchStats(true);
      
      if (msg.type === 'stats_data') {
        if (lastStatsRequestId.current && msg.requestId !== lastStatsRequestId.current) return;
        dispatch({ type: 'UPDATE', payload: { rawData: msg.stats, loading: false, isFiltering: false } });
      }
      
      if (msg.type === 'error') {
        console.error('[Stats] Error:', msg.message);
        dispatch({ type: 'UPDATE', payload: { loading: false, isFiltering: false } });
      }
      
      if (msg.type === 'analyses_list') {
        if (msg.offset === 0) setAnalyses(msg.analyses);
        else appendAnalyses(msg.analyses);
        dispatch({ type: 'UPDATE', payload: { hasMore: msg.analyses.length === (msg.limit || 50) } });
      }

      if (msg.type === 'analyses_deleted') {
        backendService.getAnalyses(0, PAGE_SIZE);
        dispatch({ type: 'UPDATE', payload: { historyOffset: PAGE_SIZE } });
        fetchStats(true);
      }
    });
    return () => cleanup();
  }, [setAnalyses, appendAnalyses, fetchStats]);

  useEffect(() => {
    dispatch({ type: 'UPDATE', payload: { loading: true } });
    fetchStats(true);
  }, [username, fetchStats]);

  useEffect(() => {
    if (loading) return;

    const prev = prevFiltersRef.current;
    if (
      prev.time === timeFilter &&
      prev.duration === durationFilter &&
      prev.count === countFilter
    ) {
      return;
    }

    prevFiltersRef.current = { time: timeFilter, duration: durationFilter, count: countFilter };

    if (filterTimeoutRef.current) clearTimeout(filterTimeoutRef.current);
    filterTimeoutRef.current = setTimeout(fetchStats, 300);
    return () => clearTimeout(filterTimeoutRef.current);
  }, [timeFilter, durationFilter, countFilter, fetchStats, loading]);

  // ── UI Callbacks ─────────────────────────────────────────────────
  const handleTabChange = useCallback((tab) => {
    dispatch({ type: 'UPDATE', payload: { activeTab: tab } });
    if (tab === 'history' && !historyLoaded) {
      backendService.getAnalyses(0, PAGE_SIZE);
      dispatch({ type: 'UPDATE', payload: { historyOffset: PAGE_SIZE, historyLoaded: true } });
    }
  }, [historyLoaded]);

  const loadMoreHistory = useCallback(() => {
    backendService.getAnalyses(historyOffset, PAGE_SIZE);
    dispatch({ type: 'UPDATE', payload: { historyOffset: historyOffset + PAGE_SIZE } });
  }, [historyOffset]);

  const handleBulkDelete = useCallback(() => {
    if (selectedIds.size === 0) return;
    if (window.confirm(`¿Borrar ${selectedIds.size} análisis?`)) {
      const ids = Array.from(selectedIds);
      backendService.deleteAnalyses(ids);
      removeAnalyses(ids);
      dispatch({ type: 'UPDATE', payload: { selectedIds: new Set() } });
    }
  }, [selectedIds, removeAnalyses]);

  const handleSingleDelete = useCallback((id, e) => {
    e.stopPropagation();
    if (window.confirm('¿Borrar este análisis?')) {
      backendService.deleteAnalyses([id]);
      removeAnalyses([id]);
    }
  }, [removeAnalyses]);

  if (loading) return (
    <div className="stats-loading">
      <div className="spinner"></div>
      <span>Cargando perfil…</span>
    </div>
  );

  return (
    <motion.div
      className={`stats-dashboard-new ${isFiltering ? 'is-filtering' : ''}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <StatsTabs 
        activeTab={activeTab} 
        onTabChange={handleTabChange} 
        totalStats={rawData?.total} 
        analysesCount={analyses.length} 
        selectedCount={selectedIds.size} 
        onBulkDelete={handleBulkDelete} 
      />

      {activeTab === 'stats' && (
        <StatsFilterBar 
          timeFilter={timeFilter} 
          durationFilter={durationFilter} 
          countFilter={countFilter} 
          onFilterChange={(key, val) => dispatch({ type: 'UPDATE', payload: { [key]: val } })} 
        />
      )}

      {activeTab === 'history' ? (
        <HistoryListView 
          analyses={analyses} 
          selectedIds={selectedIds} 
          onToggleAll={() => dispatch({ type: 'SELECT_ALL', analyses })} 
          onToggleItem={(id) => dispatch({ type: 'TOGGLE_SELECTION', id })} 
          onDeleteItem={handleSingleDelete} 
          hasMore={hasMore} 
          onLoadMore={loadMoreHistory} 
        />
      ) : (
        <StatsSummaryView stats={rawData} />
      )}
    </motion.div>
  );
};