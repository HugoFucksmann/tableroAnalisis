import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useShallow } from 'zustand/react/shallow';
import {
  History,
  LayoutDashboard,
  List,
  Filter,
  Clock,
  Calendar,
  Layers,
  AlertTriangle
} from 'lucide-react';
import { backendService } from '../../services/backendService';
import { useGameStore } from '../../store/useGameStore';
import './StatsDashboard.css';

import AccuracyLineChart from './AccuracyLineChart';
import { 
  ColorStatsCard, 
  PhaseStatsCard, 
  OpeningStatsCard, 
  QualityStatsCard, 
  BlundersByTimeCard, 
  DangerousOpeningsCard 
} from './StatsCards';

// ─── HistoryItem ────────────────────────────────────────────────────────────

const HistoryItem = React.memo(({ item, selected, onToggle, onDelete }) => (
  <div
    className={`history-item ${selected ? 'selected' : ''}`}
    onClick={() => onToggle(item.id)}
  >
    <div className="hi-check"><div className="hi-check-inner"></div></div>
    <div className="hi-main">
      <div className="hi-opening">{item.opening || 'Unknown Opening'}</div>
      <div className="hi-meta">
        <span>{new Date(item.date).toLocaleDateString()}</span>
        <span>{item.moveCount} jugadas</span>
        {item.timeControl && (
          <span className="hi-tc">{item.timeControl}</span>
        )}
        <span className={`hi-result-badge ${item.win ? 'win' : 'loss'}`}>
          {item.win ? 'Victoria' : 'Derrota'}
        </span>
        <span style={{ color: 'var(--text-muted)' }}>
          {item.color === 'white' ? '♙' : '♟'}
        </span>
      </div>
    </div>
    <div className="hi-acc">
      <div className="hi-acc-val">
        {item.color === 'white' ? item.white?.accuracy : item.black?.accuracy}%
      </div>
      <div className="hi-acc-label">precisión</div>
    </div>
    <div className="hi-actions">
      <button
        className="hi-delete"
        onClick={(e) => onDelete(item.id, e)}
        title="Borrar"
      >
        <AlertTriangle size={13} />
      </button>
    </div>
  </div>
));

// ─── StatsDashboard ────────────────────────────────────────────────────────

export const StatsDashboard = () => {
  const [rawData, setRawData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('stats');
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [isFiltering, setIsFiltering] = useState(false);

  const { username, analyses, setAnalyses, appendAnalyses, removeAnalyses } = useGameStore(useShallow(state => ({
    username: state.searchUsername,
    analyses: state.analyses,
    setAnalyses: state.setAnalyses,
    appendAnalyses: state.appendAnalyses,
    removeAnalyses: state.removeAnalyses,
  })));


  const [historyOffset, setHistoryOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const PAGE_SIZE = 50;

  const [timeFilter, setTimeFilter] = useState('all');
  const [durationFilter, setDurationFilter] = useState('all');
  const [countFilter, setCountFilter] = useState('25');

  const lastStatsRequestId = React.useRef(null);
  const filterTimeoutRef = React.useRef(null);

  // ── Handlers de mensajes ───────────────────────────────────────
  useEffect(() => {
    const cleanup = backendService.addHandler((msg) => {
      if (msg.type === 'stats_data') { 
        if (lastStatsRequestId.current && msg.requestId !== lastStatsRequestId.current) {
          return;
        }
        setRawData(msg.stats); 
        setLoading(false); 
        setIsFiltering(false);
      }
      if (msg.type === 'error') {
        console.error('[Stats] Error del backend:', msg.message);
        setLoading(false);
        setIsFiltering(false);
      }
      if (msg.type === 'analyses_list') { 
        if (msg.offset === 0) {
          setAnalyses(msg.analyses);
        } else {
          appendAnalyses(msg.analyses);
        }
        setHasMore(msg.analyses.length === (msg.limit || 50));
      }
    });
    return () => cleanup();
  }, [setAnalyses, appendAnalyses]);

  // ── Carga inicial ──────────────────────────────────────────────
  useEffect(() => {
    setLoading(true);
    const reqId = Math.random().toString(36).substring(7);
    lastStatsRequestId.current = reqId;

    backendService.getStats({
      time: timeFilter,
      duration: durationFilter,
      count: countFilter,
      username: username
    }, reqId);
    // Solo al montar o si el username cambia drásticamente
  }, [username]);

  // ── Lazy load historial ────────────────────────────────────────

  const handleTabChange = useCallback((tab) => {
    setActiveTab(tab);
    if (tab === 'history' && !historyLoaded) {
      backendService.getAnalyses(0, PAGE_SIZE);
      setHistoryOffset(PAGE_SIZE);
      setHistoryLoaded(true);
    }
  }, [historyLoaded]);

  const loadMoreHistory = useCallback(() => {
    backendService.getAnalyses(historyOffset, PAGE_SIZE);
    setHistoryOffset(prev => prev + PAGE_SIZE);
  }, [historyOffset]);

  // ── Actualización por filtros (Debounced) ───────────────────
  const fetchStats = useCallback(() => {
    if (loading) return; // Evitar fetch si ya estamos en carga inicial
    
    setIsFiltering(true);
    const reqId = Math.random().toString(36).substring(7);
    lastStatsRequestId.current = reqId;
    backendService.getStats({
      time: timeFilter,
      duration: durationFilter,
      count: countFilter,
      username: username
    }, reqId);
  }, [timeFilter, durationFilter, countFilter, username, loading]);

  useEffect(() => {
    // No activar el debounce si es la carga inicial (ya disparada por el useEffect de [username])
    if (loading) return;

    if (filterTimeoutRef.current) clearTimeout(filterTimeoutRef.current);
    filterTimeoutRef.current = setTimeout(fetchStats, 300);
    return () => clearTimeout(filterTimeoutRef.current);
  }, [timeFilter, durationFilter, countFilter, fetchStats, loading]);

  // ── Stats (ahora vienen procesadas del backend) ────────────────
  const filteredStats = useMemo(() => {
    if (!rawData) return null;
    return rawData;
  }, [rawData]);

  // ── Selección historial ────────────────────────────────────────
  const toggleSelection = useCallback((id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const handleBulkDelete = useCallback(() => {
    if (selectedIds.size === 0) return;
    if (confirm(`¿Borrar ${selectedIds.size} análisis?`)) {
      const ids = Array.from(selectedIds);
      backendService.deleteAnalyses(ids);
      removeAnalyses(ids); 
      setSelectedIds(new Set());
      // Forzar refresco de stats tras borrar
      setTimeout(fetchStats, 100);
    }
  }, [selectedIds, removeAnalyses, fetchStats]);

  const handleSingleDelete = useCallback((id, e) => {
    e.stopPropagation();
    if (confirm('¿Borrar este análisis?')) {
      backendService.deleteAnalyses([id]);
      removeAnalyses([id]); 
      // Forzar refresco de stats tras borrar
      setTimeout(fetchStats, 100);
    }
  }, [removeAnalyses, fetchStats]);

  // ── Render ─────────────────────────────────────────────────────
  if (loading) return (
    <div className="stats-loading">
      <div className="spinner"></div>
      <span>Cargando perfil...</span>
    </div>
  );

  return (
    <motion.div 
      className={`stats-dashboard-new ${isFiltering ? 'is-filtering' : ''}`} 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }}
    >

      {/* ── Header ──────────────────────────────────────────────── */}
      <header className="stats-top-bar">
        <div className="stats-title-section">
          <span className="stats-section-title">
            {activeTab === 'stats' ? 'Dashboard' : 'Historial'}
          </span>
          <span className="stats-section-count">
            {activeTab === 'stats'
              ? `${filteredStats?.total || 0} partidas`
              : `${analyses.length} analizadas`}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {activeTab === 'history' && selectedIds.size > 0 && (
            <button className="bulk-delete-btn" onClick={handleBulkDelete}>
              <AlertTriangle size={13} /> Borrar {selectedIds.size}
            </button>
          )}
          <div className="stats-view-toggle">
            <button
              className={`view-btn ${activeTab === 'stats' ? 'active' : ''}`}
              onClick={() => handleTabChange('stats')}
              title="Dashboard"
            >
              <LayoutDashboard size={14} />
            </button>
            <button
              className={`view-btn ${activeTab === 'history' ? 'active' : ''}`}
              onClick={() => handleTabChange('history')}
              title="Historial"
            >
              <List size={14} />
            </button>
          </div>
        </div>
      </header>

      {/* ── Filtros ─────────────────────────────────────────────── */}
      {activeTab === 'stats' && (
        <div className="stats-filters-bar">
          <div className="filter-pill-group">
            <Calendar size={13} />
            <select
              value={timeFilter}
              onChange={(e) => setTimeFilter(e.target.value)}
              className="stats-dropdown"
              aria-label="Período"
            >
              <option value="all">Todo</option>
              <option value="7d">7 días</option>
              <option value="30d">30 días</option>
            </select>
          </div>
          <div className="filter-pill-group">
            <Clock size={13} />
            <select
              value={durationFilter}
              onChange={(e) => setDurationFilter(e.target.value)}
              className="stats-dropdown"
              aria-label="Control de tiempo"
            >
              <option value="all">Mix</option>
              <option value="1m">1m Bala</option>
              <option value="3m">3m Blitz</option>
              <option value="5m">5m Blitz</option>
              <option value="10m">10m Rápida</option>
              <option value="15m">15m Rápida</option>
              <option value="30m">30m Clásica</option>
            </select>
          </div>
          <div className="filter-pill-group">
            <Layers size={13} />
            <select
              value={countFilter}
              onChange={(e) => setCountFilter(e.target.value)}
              className="stats-dropdown"
              aria-label="Cantidad de partidas"
            >
              <option value="10">Últ. 10</option>
              <option value="25">Últ. 25</option>
              <option value="50">Últ. 50</option>
              <option value="all">Todas</option>
            </select>
          </div>
        </div>
      )}

      {/* ── Historial ───────────────────────────────────────────── */}
      {activeTab === 'history' ? (
        <div className="stats-history-view premium-scroll">
          <div className="history-list">
            {analyses.length === 0 ? (
              <div className="empty-history">No hay partidas analizadas aún</div>
            ) : (
              analyses.map(item => (
                <HistoryItem
                  key={item.id}
                  item={item}
                  selected={selectedIds.has(item.id)}
                  onToggle={toggleSelection}
                  onDelete={handleSingleDelete}
                />
              ))
            )}
            {analyses.length > 0 && hasMore && (
              <button className="load-more-history-btn" onClick={loadMoreHistory}>
                Cargar más partidas
              </button>
            )}
          </div>
        </div>

        /* ── Empty filter ─────────────────────────────────────────── */
      ) : filteredStats?.empty ? (
        <div className="empty-view">
          <Filter size={36} />
          <p>Sin datos para este filtro</p>
        </div>

        /* ── Dashboard ────────────────────────────────────────────── */
      ) : filteredStats ? (
        <div className="stats-layout-grid">

          {/* Gráfico de tendencia */}
          <section className="stats-main-chart">
            <div className="chart-header">
              <div className="chart-title">
                <History size={13} /> Evolución de precisión
              </div>
              <div className="main-accuracy-display">
                <span className="big-acc">{filteredStats.avgAcc}%</span>
                <span className="acc-sub">Promedio</span>
              </div>
            </div>
            <AccuracyLineChart data={filteredStats.trend} />
          </section>

          <div className="stats-secondary-grid">

            <ColorStatsCard stats={filteredStats} />
            <PhaseStatsCard stats={filteredStats} />
            <OpeningStatsCard stats={filteredStats} />
            <QualityStatsCard stats={filteredStats} />
            <BlundersByTimeCard stats={filteredStats} />
            <DangerousOpeningsCard stats={filteredStats} />



          </div>
        </div>
      ) : null}
    </motion.div>
  );
};