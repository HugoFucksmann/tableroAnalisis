import React, { useMemo } from 'react';
import { useGameStore } from '../../store/useGameStore';
import { useShallow } from 'zustand/react/shallow';
import { Clock, Zap, Brain, Sparkles, AlertCircle, CheckCircle2 } from 'lucide-react';
import './TimeErrorBreakdown.css';

export const TimeErrorBreakdown = ({ mistakeCounts }) => {
  const { moveEvaluations, errorTimeClasses, playerColor, analysisReady, history, pgnCommentsByIndex } =
    useGameStore(useShallow(state => ({
      moveEvaluations: state.moveEvaluations,
      errorTimeClasses: state.errorTimeClasses,
      playerColor: state.playerColor,
      analysisReady: state.analysisReady,
      history: state.history,
      pgnCommentsByIndex: state.pgnCommentsByIndex,
    })));

  const hasClocks = useMemo(() => {
    if (pgnCommentsByIndex && Object.values(pgnCommentsByIndex).some(c => c?.includes('%clk'))) return true;
    if (errorTimeClasses && Object.keys(errorTimeClasses).length > 0) return true;
    return false;
  }, [pgnCommentsByIndex, errorTimeClasses]);

  const stats = useMemo(() => {
    if (!analysisReady || !moveEvaluations) return null;

    let timePressure = 0, precipitation = 0, overthinking = 0, total = 0;

    Object.entries(moveEvaluations).forEach(([idxStr, type]) => {
      const idx = parseInt(idxStr, 10);
      const isPlayer = (idx % 2 === 0) ? (playerColor === 'white') : (playerColor === 'black');
      if (!isPlayer || !['Error grave', 'Error', 'Imprecisión'].includes(type)) return;

      total++;
      const tc = errorTimeClasses?.[idx];
      if (tc === 'time_pressure') timePressure++;
      else if (tc === 'precipitation') precipitation++;
      else if (tc === 'overthinking') overthinking++;
    });

    const tactical = total - (timePressure + precipitation + overthinking);
    return { timePressure, precipitation, overthinking, tactical, total };
  }, [moveEvaluations, errorTimeClasses, playerColor, analysisReady]);

  /* ── Estados previos al análisis ── */
  if (!analysisReady) {
    if (!history?.length) return null;
    return (
      <div className="time-error-breakdown-wrapper preview-wrapper">
        <div className="legend-item-preview" title="Análisis de gestión de tiempo disponible">
          <Clock size={12} className="preview-icon animate-pulse" />
          <span className="preview-text">
            ¿Quieres ver cómo afectó el reloj a tus jugadas? <strong>Analiza la partida</strong> para ver el desglose de errores por tiempo de reflexión.
          </span>
        </div>
      </div>
    );
  }

  if (!hasClocks) {
    return (
      <div className="time-error-breakdown-wrapper no-clocks-wrapper">
        <div className="legend-item-no-clocks" title="Sin datos de reloj">
          <AlertCircle size={12} className="no-clocks-icon" />
          <span className="no-clocks-text">
            Esta partida no contiene registros de tiempo en el reloj para analizar la gestión del tiempo.
          </span>
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const { timePressure, precipitation, overthinking, tactical, total } = stats;

  const pct = (n) => (total > 0 ? Math.round((n / total) * 100) : 0);
  const pctPressure = pct(timePressure);
  const pctPrecipitation = pct(precipitation);
  const pctOverthinking = pct(overthinking);
  const pctTactical = total > 0 ? Math.max(0, 100 - pctPressure - pctPrecipitation - pctOverthinking) : 0;

  return (
    <div className="time-error-breakdown-wrapper">
      {total > 0 && (
        <div className="time-legend-row">

          {/* Calidad: blunders / mistakes / inaccuracies — izquierda */}
          <div className="legend-quality-icons">
            <span className="legend-quality-item" style={{ color: '#e05555' }} title={`Errores Graves: ${mistakeCounts?.blunders ?? 0}`}>
              ??&nbsp;{mistakeCounts?.blunders ?? 0}
            </span>
            <span className="legend-quality-item" style={{ color: '#e09a30' }} title={`Errores: ${mistakeCounts?.mistakes ?? 0}`}>
              ?&nbsp;{mistakeCounts?.mistakes ?? 0}
            </span>
            <span className="legend-quality-item" style={{ color: '#c8b830' }} title={`Imprecisiones: ${mistakeCounts?.inaccuracies ?? 0}`}>
              ?!&nbsp;{mistakeCounts?.inaccuracies ?? 0}
            </span>
          </div>

          <span className="legend-separator" />

          {/* Tipos de error por tiempo — derecha */}
          <div className="legend-time-icons">
            <div className="legend-item pressure" title="Apuros de tiempo: menos de 40s en el reloj">
              <Clock size={11} className="legend-icon" />
              <span className="legend-num">{timePressure} ({pctPressure}%)</span>
            </div>
            <div className="legend-item precipitation" title="Precipitación: jugar rápido en menos de 3s">
              <Zap size={11} className="legend-icon" />
              <span className="legend-num">{precipitation} ({pctPrecipitation}%)</span>
            </div>
            <div className="legend-item overthinking" title="Sobrepensar: pensar más de 30s">
              <Brain size={11} className="legend-icon" />
              <span className="legend-num">{overthinking} ({pctOverthinking}%)</span>
            </div>
            <div className="legend-item tactical" title="Tácticos: errores de cálculo no relacionados al reloj">
              <Sparkles size={11} className="legend-icon" />
              <span className="legend-num">{tactical} ({pctTactical}%)</span>
            </div>
          </div>
        </div>
      )}

      {total === 0 && (
        <div className="time-perfect-game-badge">
          <CheckCircle2 size={12} className="perfect-check-icon animate-pulse" />
          <span className="perfect-text">¡Precisión impecable! No cometiste ningún error en esta partida.</span>
        </div>
      )}
    </div>
  );
};