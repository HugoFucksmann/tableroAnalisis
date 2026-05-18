import React from 'react';
import { m } from 'framer-motion';
import { Zap, Target, BookOpen, AlertTriangle, Clock, Brain, Timer, ShieldAlert, Award } from 'lucide-react';
import { useGameStore } from '../../store/useGameStore';

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

export const PsychologicalProfileCard = ({ stats }) => {
  const setSelectedStatCategory = useGameStore(state => state.setSelectedStatCategory);

  if (!stats.advancedStats) return null;
  const { convertedAdvantages, blownAdvantages, comebackWins, savedDraws, failedComebacks, tiltEvents } = stats.advancedStats;
  
  const totalAdvantages = convertedAdvantages + blownAdvantages;
  const conversionRate = totalAdvantages > 0 ? Math.round((convertedAdvantages / totalAdvantages) * 100) : 0;
  
  const totalComebackChances = comebackWins + savedDraws + failedComebacks;
  const resilienceRate = totalComebackChances > 0 ? Math.round(((comebackWins + savedDraws) / totalComebackChances) * 100) : 0;

  return (
    <div className="stats-card-modern">
      <div className="card-title-modern"><Brain size={13} color="#9c27b0" /> Psicología & Control</div>
      
      <div className="psycho-list-modern">
        {/* Row 1: Conversión */}
        <div 
            className={`psycho-row ${blownAdvantages > 0 ? 'clickable' : ''}`} 
            onClick={() => blownAdvantages > 0 && setSelectedStatCategory('blown_advantage')}
            title={blownAdvantages > 0 ? "Ver ventajas desperdiciadas" : "No hay ventajas desperdiciadas"}
        >
          <div className="psycho-info">
            <span className="psycho-label">Conversión de Ventaja</span>
            <span className="psycho-sub">{convertedAdvantages} ganadas de {totalAdvantages} oportunidades</span>
          </div>
          <div className="psycho-data">
            <span className="psycho-val">{conversionRate}%</span>
            <div className="t-bar-m">
              <m.div className="t-fill-m" initial={{ width: 0 }} animate={{ width: `${conversionRate}%` }} style={{ background: '#4caf50' }} />
            </div>
          </div>
        </div>

        {/* Row 2: Remontadas */}
        <div 
            className={`psycho-row ${(comebackWins + savedDraws) > 0 ? 'clickable' : ''}`} 
            onClick={() => (comebackWins + savedDraws) > 0 && setSelectedStatCategory('comeback')}
            title={(comebackWins + savedDraws) > 0 ? "Ver remontadas y empates salvados" : "No hay remontadas"}
        >
          <div className="psycho-info">
            <span className="psycho-label">Resiliencia</span>
            <span className="psycho-sub">{comebackWins + savedDraws} salvadas de {totalComebackChances} crisis</span>
          </div>
          <div className="psycho-data">
            <span className="psycho-val">{resilienceRate}%</span>
            <div className="t-bar-m">
              <m.div className="t-fill-m" initial={{ width: 0 }} animate={{ width: `${resilienceRate}%` }} style={{ background: '#2196f3' }} />
            </div>
          </div>
        </div>

        {/* Row 3: Tilt */}
        <div 
            className={`psycho-row tilt-row ${tiltEvents > 0 ? 'clickable' : ''}`} 
            onClick={() => tiltEvents > 0 && setSelectedStatCategory('tilt')}
            title={tiltEvents > 0 ? "Ver posiciones de colapso" : "Excelente control, sin colapsos"}
        >
          <div className="psycho-info">
            <span className="psycho-label">Control Emocional</span>
            <span className="psycho-sub">Efecto cascada (colapsos post-error)</span>
          </div>
          <div className="psycho-data text-only">
            <span className="psycho-val" style={{ color: tiltEvents > 0 ? '#f44336' : '#4caf50' }}>
              {tiltEvents === 0 ? 'Excelente' : `${tiltEvents} colapsos`}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export const TimeManagementCard = ({ stats }) => {
  if (!stats.advancedStats || stats.advancedStats.avgMidgameTime === 0) return null;
  const { avgMidgameTime, avgBlunderTime } = stats.advancedStats;
  
  const speedRatio = avgBlunderTime / avgMidgameTime;
  let assessment = 'Reflexión Constante';
  let assessmentColor = '#4caf50';
  let desc = `Piensas los errores al mismo ritmo que las buenas jugadas.`;

  if (speedRatio < 0.5) {
    assessment = 'Impulsividad';
    assessmentColor = '#ff9800';
    desc = `Juegas al doble de velocidad justo antes de cometer un error.`;
  } else if (speedRatio < 0.2) {
    assessment = 'Insta-move / Pánico';
    assessmentColor = '#f44336';
    desc = `Haces errores graves jugando casi al instante sin pensar.`;
  } else if (speedRatio > 2) {
    assessment = 'Sobrepensado';
    assessmentColor = '#ff9800';
    desc = `Te bloqueas y consumes mucho reloj en posiciones críticas.`;
  }

  return (
    <div className="stats-card-modern">
      <div className="card-title-modern"><Timer size={13} color="#00bcd4" /> Gestión de Tiempo Crítico</div>
      
      <div className="tm-modern-view">
        <div className="tm-comparison">
          <div className="tm-side">
            <span className="tm-val">{(avgMidgameTime / 1000).toFixed(1)}s</span>
            <span className="tm-label">Ritmo Normal</span>
          </div>
          <div className="tm-divider"></div>
          <div className="tm-side alert-side">
            <span className="tm-val" style={{ color: assessmentColor }}>{(avgBlunderTime / 1000).toFixed(1)}s</span>
            <span className="tm-label">En Errores</span>
          </div>
        </div>

        <div className="tm-insight">
          <span className="tm-badge" style={{ backgroundColor: assessmentColor + '15', color: assessmentColor, border: `1px solid ${assessmentColor}30` }}>
            {assessment}
          </span>
          <span className="tm-desc">{desc}</span>
        </div>
      </div>
    </div>
  );
};
