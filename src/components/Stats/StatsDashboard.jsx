import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useShallow } from 'zustand/react/shallow';
import {
  History,
  User,
  Zap,
  Sword,
  Target,
  Filter,
  Clock,
  Calendar,
  Layers,
  BookOpen,
  AlertTriangle
} from 'lucide-react';
import { backendService } from '../../services/backendService';
import { useGameStore } from '../../store/useGameStore';
import './StatsDashboard.css';

// ─── AccuracyLineChart ─────────────────────────────────────────────────────
// Componente puro: solo recibe data y renderiza. Sin side-effects propios.

const AccuracyLineChart = ({ data }) => {
  if (!data || data.length === 0) return (
    <div className="no-data-chart">No hay suficientes datos para mostrar la tendencia</div>
  );

  const width = 1000;
  const height = 220;
  const padding = 40;

  const accuracies = data.map(d => d.accuracy);
  // Clampear mínimo a 50 para no distorsionar el gráfico con outliers extremos
  const minAcc = Math.max(50, Math.min(...accuracies) - 5);
  const maxAcc = 100;
  const range = maxAcc - minAcc;

  const points = data.map((d, i) => {
    const x = padding + (i * (width - 2 * padding) / Math.max(1, data.length - 1));
    const y = height - padding - ((d.accuracy - minAcc) * (height - 2 * padding) / range);
    return { x, y, ...d };
  });

  const pathD = points.length > 1
    ? `M ${points[0].x} ${points[0].y} ` + points.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ')
    : '';

  // Grid: solo mostrar valores dentro del rango visible
  const gridValues = [50, 60, 70, 80, 90, 100].filter(v => v >= minAcc);

  return (
    <div className="line-chart-wrapper">
      <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="lineGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ff9800" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#ff9800" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {gridValues.map(val => {
          const y = height - padding - ((val - minAcc) * (height - 2 * padding) / range);
          if (y < padding || y > height - padding) return null;
          return (
            <g key={val}>
              <line x1={padding} y1={y} x2={width - padding} y2={y} stroke="rgba(255,255,255,0.03)" strokeDasharray="4" />
              <text x={padding - 4} y={y + 4} textAnchor="end" fill="#444" fontSize="10">{val}</text>
            </g>
          );
        })}

        {points.length > 1 && (
          <>
            <motion.path
              d={`${pathD} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`}
              fill="url(#lineGradient)"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            />
            <motion.path
              d={pathD}
              fill="none"
              stroke="#ff9800"
              strokeWidth="3"
              strokeLinecap="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1.5, ease: "easeInOut" }}
            />
          </>
        )}

        {points.map((p, i) => (
          <g key={i} className="point-group">
            <motion.circle
              cx={p.x} cy={p.y} r="4" fill="#121212" stroke="#ff9800" strokeWidth="2"
              initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 1 + i * 0.05 }}
            />
            <text x={p.x} y={p.y - 12} textAnchor="middle" fill="#888" fontSize="11">{p.accuracy}%</text>
          </g>
        ))}
      </svg>
    </div>
  );
};

// ─── StatsDashboard ────────────────────────────────────────────────────────

export const StatsDashboard = () => {
  const [rawData, setRawData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('stats'); // 'stats' | 'history'
  const [selectedIds, setSelectedIds] = useState(new Set());
  // Lazy: historial solo se carga cuando el usuario abre ese tab
  const [historyLoaded, setHistoryLoaded] = useState(false);

  const { analyses, setAnalyses, loadPgn } = useGameStore(useShallow(state => ({
    analyses: state.analyses,
    setAnalyses: state.setAnalyses,
    loadPgn: state.loadPgn
  })));

  // Filtros
  const [timeFilter, setTimeFilter] = useState('all');
  const [durationFilter, setDurationFilter] = useState('all');
  const [countFilter, setCountFilter] = useState('25');

  // ── Carga inicial: solo stats. El historial se pide al cambiar de tab. ──
  useEffect(() => {
    const cleanup = backendService.addHandler((msg) => {
      if (msg.type === 'stats_data') {
        setRawData(msg.stats);
        setLoading(false);
      }
      if (msg.type === 'analyses_list') {
        setAnalyses(msg.analyses);
      }
    });
    backendService.getStats();
    return () => cleanup();
  }, [setAnalyses]);

  // ── Lazy load del historial al cambiar de tab ──────────────────────────
  const handleTabChange = useCallback((tab) => {
    setActiveTab(tab);
    if (tab === 'history' && !historyLoaded) {
      backendService.getAnalyses();
      setHistoryLoaded(true);
    }
  }, [historyLoaded]);

  // ── filteredStats: cómputo local sobre rawData ─────────────────────────
  const filteredStats = useMemo(() => {
    if (!rawData) return null;

    let games = [...rawData.games];

    // 1. Filtrar por Duración
    if (durationFilter !== 'all') {
      games = games.filter(g => g.timeControl === durationFilter);
    }

    // 2. Filtrar por Tiempo — sin mutar el objeto Date
    if (timeFilter !== 'all') {
      const days = timeFilter === '7d' ? 7 : 30;
      const limitMs = Date.now() - days * 86_400_000;
      games = games.filter(g => new Date(g.date).getTime() >= limitMs);
    }

    // 3. Filtrar por Cantidad (Últimas X)
    if (countFilter !== 'all') {
      games = games.slice(0, parseInt(countFilter));
    }

    if (games.length === 0) return { empty: true };

    const total = games.length;
    const wins = games.filter(g => g.win).length;
    const avgAcc = Math.round(games.reduce((acc, g) => acc + g.accuracy, 0) / total);

    const whiteGames = games.filter(g => g.color === 'white');
    const blackGames = games.filter(g => g.color === 'black');

    const calcColor = (gs) => ({
      acc: gs.length ? Math.round(gs.reduce((acc, g) => acc + g.accuracy, 0) / gs.length) : 0,
      wr: gs.length ? Math.round((gs.filter(g => g.win).length / gs.length) * 100) : 0,
      count: gs.length
    });

    const openings = {};
    games.forEach(g => {
      // Group by base opening name (e.g. "Ruy Lopez: Classical" -> "Ruy Lopez")
      const baseOpening = g.opening ? g.opening.split(':')[0].trim() : 'Unknown Opening';
      if (!openings[baseOpening]) openings[baseOpening] = { wins: 0, total: 0, accSum: 0 };
      openings[baseOpening].total++;
      if (g.win) openings[baseOpening].wins++;
      openings[baseOpening].accSum += g.accuracy;
    });

    const openingStats = Object.entries(openings)
      .map(([name, data]) => ({
        name,
        wr: Math.round((data.wins / data.total) * 100),
        acc: Math.round(data.accSum / data.total),
        count: data.total
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 4);

    // Para fases y calidad de jugadas: usamos los datos del backend directamente.
    // Si los filtros reducen el conjunto, mostramos los datos globales del rawData
    // (que ya son las últimas 20 partidas). No recalculamos aquí para no duplicar
    // la lógica de agregación que vive en GameStore.
    const phases = rawData.accuracyByPhase || [];
    const moveQuality = rawData.moveQuality || [];

    return {
      total,
      winRate: Math.round((wins / total) * 100),
      avgAcc,
      white: calcColor(whiteGames),
      black: calcColor(blackGames),
      openingStats,
      trend: games.slice().reverse().map(g => ({ date: g.date, accuracy: g.accuracy })),
      moveQuality,
      phases,
    };
  }, [rawData, timeFilter, durationFilter, countFilter]);

  const toggleSelection = useCallback((id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleBulkDelete = useCallback(() => {
    if (selectedIds.size === 0) return;
    if (confirm(`¿Borrar ${selectedIds.size} análisis?`)) {
      backendService.deleteAnalyses(Array.from(selectedIds));
      setSelectedIds(new Set());
    }
  }, [selectedIds]);

  const handleSingleDelete = useCallback((id, e) => {
    e.stopPropagation();
    if (confirm('¿Borrar este análisis?')) {
      backendService.deleteAnalyses([id]);
    }
  }, []);

  if (loading) return <div className="stats-loading"><div className="spinner"></div><span>Cargando perfil...</span></div>;

  return (
    <motion.div className="stats-dashboard-new" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      {/* Header & Filtros Integrados */}
      <header className="stats-top-bar">
        <div className="stats-title-section">
          <div className="stats-avatar"><User size={18} /></div>
          <div className="stats-header-titles">
            <div className="stats-tabs">
              <button className={activeTab === 'stats' ? 'active' : ''} onClick={() => handleTabChange('stats')}>Dashboard</button>
              <button className={activeTab === 'history' ? 'active' : ''} onClick={() => handleTabChange('history')}>Historial</button>
            </div>
            <p>{activeTab === 'stats' ? `${filteredStats?.total || 0} partidas` : `${analyses.length} analizadas`}</p>
          </div>
        </div>

        {activeTab === 'stats' ? (
          <div className="stats-filters-pills">
            <div className="filter-pill-group dropdown-group">
              <Calendar size={14} />
              <select 
                value={timeFilter} 
                onChange={(e) => setTimeFilter(e.target.value)}
                className="stats-dropdown"
              >
                <option value="all">Todo</option>
                <option value="7d">Últimos 7 días</option>
                <option value="30d">Últimos 30 días</option>
              </select>
            </div>
            <div className="filter-pill-group dropdown-group">
              <Clock size={14} />
              <select 
                value={durationFilter} 
                onChange={(e) => setDurationFilter(e.target.value)}
                className="stats-dropdown"
              >
                <option value="all">Mix (Todos)</option>
                <option value="1m">1m (Bala)</option>
                <option value="3m">3m (Blitz)</option>
                <option value="5m">5m (Blitz)</option>
                <option value="10m">10m (Rápida)</option>
                <option value="15m">15m (Rápida)</option>
                <option value="30m">30m (Clásica)</option>
              </select>
            </div>
            <div className="filter-pill-group dropdown-group">
              <Layers size={14} />
              <select 
                value={countFilter} 
                onChange={(e) => setCountFilter(e.target.value)}
                className="stats-dropdown"
              >
                <option value="10">Últimas 10</option>
                <option value="25">Últimas 25</option>
                <option value="50">Últimas 50</option>
                <option value="all">Todas</option>
              </select>
            </div>
          </div>
        ) : (
          <div className="history-actions">
            {selectedIds.size > 0 && (
              <button className="bulk-delete-btn" onClick={handleBulkDelete}>
                <AlertTriangle size={14} /> Borrar {selectedIds.size}
              </button>
            )}
          </div>
        )}
      </header>

      {activeTab === 'history' ? (
        <div className="stats-history-view glass-panel premium-scroll">
          <div className="history-list">
            {analyses.length === 0 ? (
              <div className="empty-history">No hay partidas analizadas aún</div>
            ) : (
              analyses.slice().reverse().map(item => (
                <div
                  key={item.id}
                  className={`history-item ${selectedIds.has(item.id) ? 'selected' : ''}`}
                  onClick={() => toggleSelection(item.id)}
                >
                  <div className="hi-check"><div className="hi-check-inner"></div></div>
                  <div className={`hi-color-dot ${item.color === 'black' ? 'black' : 'white'}`} title={item.color === 'black' ? 'Negras' : 'Blancas'} />
                  <div className="hi-main">
                    <div className="hi-opening">{item.opening || 'Unknown Opening'}</div>
                    <div className="hi-meta">
                      <span>{new Date(item.date).toLocaleDateString()}</span>
                      <span>{item.moveCount} jugadas</span>
                      {item.timeControl && <span className="hi-tc">{item.timeControl}</span>}
                      <span className={`hi-result-badge ${item.win ? 'win' : 'loss'}`}>{item.win ? 'Victoria' : 'Derrota'}</span>
                    </div>
                  </div>
                  <div className="hi-acc">
                    <div className="hi-acc-val">
                      {item.color === 'white' ? item.white?.accuracy : item.black?.accuracy}%
                    </div>
                    <div className="hi-acc-label">mi precisión</div>
                  </div>
                  <div className="hi-actions">
                    <button className="hi-delete" onClick={(e) => handleSingleDelete(item.id, e)} title="Borrar">
                      <AlertTriangle size={14} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : filteredStats?.empty ? (
        <div className="empty-view">
          <Filter size={40} />
          <p>Sin datos para este filtro</p>
        </div>
      ) : filteredStats ? (
        <div className="stats-layout-grid">
          {/* Main Trend Chart */}
          <section className="stats-main-chart glass-panel">
            <div className="chart-header">
              <div className="chart-title"><History size={16} /> Evolución de Precisión</div>
              <div className="main-accuracy-display">
                <span className="big-acc">{filteredStats.avgAcc}%</span>
                <span className="acc-sub">Promedio</span>
              </div>
            </div>
            <AccuracyLineChart data={filteredStats.trend} />
          </section>

          {/* Secondary Grid */}
          <div className="stats-secondary-grid">
            {/* Color Performance */}
            <div className="stats-card-modern glass-panel">
              <div className="card-title-modern"><Zap size={16} /> Por Color</div>
              <div className="color-split-view">
                <div className="color-block white">
                  <span className="cb-label">Blancas <span className="cb-count">({filteredStats.white.count})</span></span>
                  <div className="cb-row"><span>WR</span><strong>{filteredStats.white.wr}%</strong></div>
                  <div className="cb-row"><span>Acc</span><strong>{filteredStats.white.acc}%</strong></div>
                </div>
                <div className="color-block black">
                  <span className="cb-label">Negras <span className="cb-count">({filteredStats.black.count})</span></span>
                  <div className="cb-row"><span>WR</span><strong>{filteredStats.black.wr}%</strong></div>
                  <div className="cb-row"><span>Acc</span><strong>{filteredStats.black.acc}%</strong></div>
                </div>
              </div>
            </div>

            {/* Phase Accuracy — solo si hay datos reales */}
            <div className="stats-card-modern glass-panel">
              <div className="card-title-modern"><Target size={16} /> Por Fase</div>
              {filteredStats.phases.length > 0 ? (
                <div className="phase-minimal-list">
                  {filteredStats.phases.map((p, i) => (
                    <div key={p.phase} className="phase-item-new">
                      <div className="pi-info"><span>{p.phase}</span><strong>{p.accuracy}%</strong></div>
                      <div className="pi-bar-bg">
                        <motion.div
                          className="pi-bar-fill"
                          initial={{ width: 0 }}
                          animate={{ width: `${p.accuracy}%` }}
                          style={{ background: p.color || (i === 0 ? '#4caf50' : i === 1 ? '#ff9800' : '#2196f3') }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="card-placeholder">
                  <span>Disponible tras analizar partidas</span>
                </div>
              )}
            </div>

            {/* Opening Mastery */}
            <div className="stats-card-modern glass-panel">
              <div className="card-title-modern"><BookOpen size={16} /> Aperturas</div>
              <div className="opening-modern-list">
                {filteredStats.openingStats.map((op, i) => (
                  <div key={i} className="op-row-modern">
                    <span className="op-name-m">{op.name}</span>
                    <div className="op-vals-m">
                      <span title="Win Rate">W {op.wr}%</span>
                      <span title="Accuracy">A {op.acc}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Move Quality Distribution — solo si hay datos reales */}
            <div className="stats-card-modern glass-panel">
              <div className="card-title-modern"><AlertTriangle size={16} /> Calidad de Jugadas</div>
              {filteredStats.moveQuality.length > 0 ? (
                <div className="tactical-modern-list">
                  {filteredStats.moveQuality.map((t, i) => (
                    <div key={i} className="t-row-modern">
                      <span className="t-label-m">{t.label}</span>
                      <span className="t-count-m">{t.pct}%</span>
                      <div className="t-bar-m">
                        <motion.div 
                          className="t-fill-m" 
                          initial={{ width: 0 }} 
                          animate={{ width: `${t.pct}%` }} 
                          style={{ background: t.color }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="card-placeholder">
                  <span>Disponible tras analizar partidas</span>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </motion.div>
  );
};
