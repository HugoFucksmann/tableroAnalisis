import React, { useState, useEffect, useMemo } from 'react';
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

const AccuracyLineChart = ({ data }) => {
  if (!data || data.length === 0) return (
    <div className="no-data-chart">No hay suficientes datos para mostrar la tendencia</div>
  );

  const width = 1000;
  const height = 220;
  const padding = 40;

  const accuracies = data.map(d => d.accuracy);
  const minAcc = Math.min(...accuracies) - 5;
  const maxAcc = 100;

  const points = data.map((d, i) => {
    const x = padding + (i * (width - 2 * padding) / Math.max(1, data.length - 1));
    const y = height - padding - ((d.accuracy - minAcc) * (height - 2 * padding) / (maxAcc - minAcc));
    return { x, y, ...d };
  });

  const pathD = points.length > 1
    ? `M ${points[0].x} ${points[0].y} ` + points.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ')
    : '';

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
        {[70, 80, 90, 100].map(val => {
          const y = height - padding - ((val - minAcc) * (height - 2 * padding) / (maxAcc - minAcc));
          if (y < padding || y > height - padding) return null;
          return (
            <line key={val} x1={padding} y1={y} x2={width - padding} y2={y} stroke="rgba(255,255,255,0.03)" strokeDasharray="4" />
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

export const StatsDashboard = () => {
  const [rawData, setRawData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('stats'); // 'stats' | 'history'
  const [selectedIds, setSelectedIds] = useState(new Set());

  const { analyses, setAnalyses, loadPgn } = useGameStore(useShallow(state => ({
    analyses: state.analyses,
    setAnalyses: state.setAnalyses,
    loadPgn: state.loadPgn
  })));

  // Filtros
  const [timeFilter, setTimeFilter] = useState('all');
  const [durationFilter, setDurationFilter] = useState('all');
  const [countFilter, setCountFilter] = useState('25'); // 10, 25, 50, all

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
    backendService.getAnalyses();
    return () => cleanup();
  }, [setAnalyses]);

  const filteredStats = useMemo(() => {
    if (!rawData) return null;

    let games = [...rawData.games];

    // 1. Filtrar por Duración
    if (durationFilter !== 'all') {
      games = games.filter(g => g.timeControl === durationFilter);
    }

    // 2. Filtrar por Tiempo
    if (timeFilter !== 'all') {
      const now = new Date();
      const days = timeFilter === '7d' ? 7 : 30;
      const limit = new Date(now.setDate(now.getDate() - days));
      games = games.filter(g => new Date(g.date) >= limit);
    }

    // 3. Filtrar por Cantidad (Últimas X)
    if (countFilter !== 'all') {
      games = games.slice(0, parseInt(countFilter));
    }

    if (games.length === 0) return { empty: true };

    // Cálculos
    const total = games.length;
    const wins = games.filter(g => g.win).length;
    const avgAcc = Math.round(games.reduce((acc, g) => acc + g.accuracy, 0) / total);

    const whiteGames = games.filter(g => g.color === 'white');
    const blackGames = games.filter(g => g.color === 'black');

    const calcColor = (gs) => ({
      acc: gs.length ? Math.round(gs.reduce((acc, g) => acc + g.accuracy, 0) / gs.length) : 0,
      wr: gs.length ? Math.round((gs.filter(g => g.win).length / gs.length) * 100) : 0
    });

    const openings = {};
    games.forEach(g => {
      if (!openings[g.opening]) openings[g.opening] = { wins: 0, total: 0, accSum: 0 };
      openings[g.opening].total++;
      if (g.win) openings[g.opening].wins++;
      openings[g.opening].accSum += g.accuracy;
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

    return {
      total,
      winRate: Math.round((wins / total) * 100),
      avgAcc,
      white: calcColor(whiteGames),
      black: calcColor(blackGames),
      openingStats,
      trend: games.slice().reverse().map(g => ({ date: g.date, accuracy: g.accuracy })),
      tactics: rawData.tacticalBreakdown || [],
      phases: rawData.accuracyByPhase || []
    };
  }, [rawData, timeFilter, durationFilter, countFilter]);

  const toggleSelection = (id) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleBulkDelete = () => {
    if (selectedIds.size === 0) return;
    if (confirm(`¿Borrar ${selectedIds.size} análisis?`)) {
      backendService.deleteAnalyses(Array.from(selectedIds));
      setSelectedIds(new Set());
    }
  };

  const handleSingleDelete = (id, e) => {
    e.stopPropagation();
    if (confirm('¿Borrar este análisis?')) {
      backendService.deleteAnalyses([id]);
    }
  };

  if (loading) return <div className="stats-loading"><div className="spinner"></div><span>Cargando perfil...</span></div>;

  return (
    <motion.div className="stats-dashboard-new" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      {/* Header & Filtros Integrados */}
      <header className="stats-top-bar">
        <div className="stats-title-section">
          <div className="stats-avatar"><User size={18} /></div>
          <div className="stats-header-titles">
            <div className="stats-tabs">
              <button className={activeTab === 'stats' ? 'active' : ''} onClick={() => setActiveTab('stats')}>Dashboard</button>
              <button className={activeTab === 'history' ? 'active' : ''} onClick={() => setActiveTab('history')}>Historial</button>
            </div>
            <p>{activeTab === 'stats' ? `${filteredStats.total || 0} partidas` : `${analyses.length} analizadas`}</p>
          </div>
        </div>

        {activeTab === 'stats' ? (
          <div className="stats-filters-pills">
            <div className="filter-pill-group">
              <Calendar size={14} />
              <button className={timeFilter === 'all' ? 'active' : ''} onClick={() => setTimeFilter('all')}>Todo</button>
              <button className={timeFilter === '7d' ? 'active' : ''} onClick={() => setTimeFilter('7d')}>7d</button>
              <button className={timeFilter === '30d' ? 'active' : ''} onClick={() => setTimeFilter('30d')}>30d</button>
            </div>
            <div className="filter-pill-group">
              <Clock size={14} />
              <button className={durationFilter === 'all' ? 'active' : ''} onClick={() => setDurationFilter('all')}>Mix</button>
              <button className={durationFilter === '5m' ? 'active' : ''} onClick={() => setDurationFilter('5m')}>5m</button>
              <button className={durationFilter === '10m' ? 'active' : ''} onClick={() => setDurationFilter('10m')}>10m</button>
            </div>
            <div className="filter-pill-group">
              <Layers size={14} />
              <button className={countFilter === '10' ? 'active' : ''} onClick={() => setCountFilter('10')}>10</button>
              <button className={countFilter === '25' ? 'active' : ''} onClick={() => setCountFilter('25')}>25</button>
              <button className={countFilter === 'all' ? 'active' : ''} onClick={() => setCountFilter('all')}>∞</button>
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
                  <div className="hi-main">
                    <div className="hi-opening">{item.opening || 'Unknown Opening'}</div>
                    <div className="hi-meta">
                      <span>{new Date(item.date).toLocaleDateString()}</span>
                      <span>{item.moveCount} jugadas</span>
                    </div>
                  </div>
                  <div className="hi-acc">
                    <div className="hi-acc-val">{item.white?.accuracy}% / {item.black?.accuracy}%</div>
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
      ) : filteredStats.empty ? (
        <div className="empty-view">
          <Filter size={40} />
          <p>Sin datos para este filtro</p>
        </div>
      ) : (
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
                  <span className="cb-label">Blancas</span>
                  <div className="cb-row"><span>WR</span><strong>{filteredStats.white.wr}%</strong></div>
                  <div className="cb-row"><span>Acc</span><strong>{filteredStats.white.acc}%</strong></div>
                </div>
                <div className="color-block black">
                  <span className="cb-label">Negras</span>
                  <div className="cb-row"><span>WR</span><strong>{filteredStats.black.wr}%</strong></div>
                  <div className="cb-row"><span>Acc</span><strong>{filteredStats.black.acc}%</strong></div>
                </div>
              </div>
            </div>

            {/* Phase Accuracy */}
            <div className="stats-card-modern glass-panel">
              <div className="card-title-modern"><Target size={16} /> Por Fase</div>
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

            {/* Tactical Weaknesses */}
            <div className="stats-card-modern glass-panel">
              <div className="card-title-modern"><AlertTriangle size={16} /> Táctica</div>
              <div className="tactical-modern-list">
                {filteredStats.tactics.map((t, i) => (
                  <div key={i} className="t-row-modern">
                    <span className="t-label-m">{t.motive}</span>
                    <div className="t-bar-m"><motion.div className="t-fill-m" initial={{ width: 0 }} animate={{ width: `${t.severity}%` }} /></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};
