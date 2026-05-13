import React from 'react';
import { History, Filter } from 'lucide-react';
import AccuracyLineChart from '../AccuracyLineChart';
import {
  ColorStatsCard,
  PhaseStatsCard,
  OpeningStatsCard,
  QualityStatsCard,
  BlundersByTimeCard,
  DangerousOpeningsCard
} from '../StatsCards';

export const StatsSummaryView = ({ stats }) => {
  if (!stats) return null;

  if (stats.empty) {
    return (
      <div className="empty-view">
        <Filter size={36} />
        <p>Sin datos para este filtro</p>
      </div>
    );
  }

  return (
    <div className="stats-layout-grid">
      {/* Gráfico de tendencia */}
      <section className="stats-main-chart">
        <div className="chart-header">
          <div className="chart-title">
            <History size={13} /> Evolución de precisión
          </div>
          <div className="main-accuracy-display">
            <span className="big-acc">{stats.avgAcc}%</span>
            <span className="acc-sub">Promedio</span>
          </div>
        </div>
        <AccuracyLineChart data={stats.trend} />
      </section>

      <div className="stats-secondary-grid">
        <ColorStatsCard stats={stats} />
        <PhaseStatsCard stats={stats} />
        <OpeningStatsCard stats={stats} />
        <QualityStatsCard stats={stats} />
        <BlundersByTimeCard stats={stats} />
        <DangerousOpeningsCard stats={stats} />
      </div>
    </div>
  );
};
