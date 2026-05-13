import React from 'react';
import { m } from 'framer-motion';
import { Zap, Target, BookOpen, AlertTriangle, Clock } from 'lucide-react';

export const ColorStatsCard = ({ stats }) => (
  <div className="stats-card-modern">
    <div className="card-title-modern"><Zap size={13} /> Por color</div>
    <div className="color-split-view">
      <div className="color-block white">
        <div className="cb-header">
          <span className="cb-label">Blancas</span>
          <span className="cb-count">{stats.white.count} partidas</span>
        </div>
        <div className="cb-row"><span>Win rate</span><strong>{stats.white.wr}%</strong></div>
        <div className="cb-row"><span>Precisión</span><strong>{stats.white.acc}%</strong></div>
      </div>
      <div className="color-block black">
        <div className="cb-header">
          <span className="cb-label">Negras</span>
          <span className="cb-count">{stats.black.count} partidas</span>
        </div>
        <div className="cb-row"><span>Win rate</span><strong>{stats.black.wr}%</strong></div>
        <div className="cb-row"><span>Precisión</span><strong>{stats.black.acc}%</strong></div>
      </div>
    </div>
  </div>
);

export const PhaseStatsCard = ({ stats }) => (
  <div className="stats-card-modern">
    <div className="card-title-modern"><Target size={13} /> Por fase</div>
    {stats.accuracyByPhase.length > 0 ? (
      <div className="phase-minimal-list">
        {stats.accuracyByPhase.map((p, i) => (
          <div key={p.phase} className="phase-item-new">
            <div className="pi-info">
              <span>{p.phase}</span>
              <strong>{p.accuracy}%</strong>
            </div>
            <div className="pi-bar-bg">
              <m.div
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
);

export const OpeningStatsCard = ({ stats }) => (
  <div className="stats-card-modern">
    <div className="card-title-modern"><BookOpen size={13} /> Aperturas</div>
    <div className="opening-modern-list premium-scroll">
      {stats.openingStats.map((op) => (
        <div key={op.name} className="op-row-modern">
          <span className="op-name-m">{op.name}</span>
          <div className="op-vals-m">
            <span title="Win Rate">W {op.wr}%</span>
            <span title="Accuracy">A {op.acc}%</span>
            <span className="op-count-badge">{op.count}</span>
          </div>
        </div>
      ))}
    </div>
  </div>
);

export const QualityStatsCard = ({ stats }) => (
  <div className="stats-card-modern">
    <div className="card-title-modern"><AlertTriangle size={13} /> Calidad de jugadas</div>
    {stats.moveQuality.length > 0 ? (
      <div className="tactical-modern-list">
        {stats.moveQuality.map((t) => (
          <div key={t.label} className="t-row-modern">
            <span className="t-label-m">{t.label}</span>
            <span className="t-count-m">{t.pct}%</span>
            <div className="t-bar-m">
              <m.div
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
);

export const BlundersByTimeCard = ({ stats }) => {
  if (!stats.blundersByTime || stats.blundersByTime.length === 0) return null;
  return (
    <div className="stats-card-modern">
      <div className="card-title-modern"><Clock size={13} /> Blunders por tiempo</div>
      <div className="time-blunder-grid">
        {stats.blundersByTime.map((b) => (
          <div key={b.label} className="time-blunder-card" style={{ '--accent': b.color }}>
            <div className="tbc-value">{b.count}</div>
            <div className="tbc-label">{b.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const DangerousOpeningsCard = ({ stats }) => {
  if (!stats.dangerousOpenings || stats.dangerousOpenings.length === 0) return null;
  return (
    <div className="stats-card-modern">
      <div className="card-title-modern"><AlertTriangle size={13} color="#f44336" /> Aperturas críticas (Err/Game)</div>
      <div className="dangerous-list">
        {stats.dangerousOpenings.map((op) => (
          <div key={op.name} className="dangerous-row">
            <div className="dr-main">
              <span className="dr-eco">{op.eco || '???'}</span>
              <span className="dr-name">{op.name}</span>
            </div>
            <div className="dr-stats">
              <span className="dr-avg">{op.errorsPerGame.toFixed(1)}</span>
              <span className="dr-label">err/partida</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
