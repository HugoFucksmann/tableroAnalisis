import React, { useMemo } from 'react';
import { useGameStore } from '../../store/useGameStore';
import { useShallow } from 'zustand/react/shallow';
import { Clock, Zap, Brain, Sparkles, AlertCircle, CheckCircle2 } from 'lucide-react';
import './TimeErrorBreakdown.css';

export const TimeErrorBreakdown = () => {
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
    // 1. Revisar si hay algún comentario con [%clk] en el PGN
    if (pgnCommentsByIndex && Object.values(pgnCommentsByIndex).some(comment => comment && comment.includes('%clk'))) {
      return true;
    }
    // 2. Revisar si en los errores calculados hay clases de tiempo asignadas
    if (errorTimeClasses && Object.keys(errorTimeClasses).length > 0) {
      return true;
    }
    return false;
  }, [pgnCommentsByIndex, errorTimeClasses]);

  const stats = useMemo(() => {
    if (!analysisReady || !moveEvaluations) {
      return null;
    }

    let timePressureCount = 0;
    let precipitationCount = 0;
    let overthinkingCount = 0;
    let totalPlayerErrors = 0;
    let blunderCount = 0;
    let mistakeCount = 0;
    let inaccuracyCount = 0;

    Object.entries(moveEvaluations).forEach(([idxStr, type]) => {
      const idx = parseInt(idxStr, 10);
      const isPlayerMove = (idx % 2 === 0) ? (playerColor === 'white') : (playerColor === 'black');
      
      if (isPlayerMove && (type === 'Error' || type === 'Error grave' || type === 'Imprecisión')) {
        totalPlayerErrors++;
        
        if (type === 'Error grave') blunderCount++;
        else if (type === 'Error') mistakeCount++;
        else if (type === 'Imprecisión') inaccuracyCount++;

        const timeClass = errorTimeClasses?.[idx];
        if (timeClass === 'time_pressure') {
          timePressureCount++;
        } else if (timeClass === 'precipitation') {
          precipitationCount++;
        } else if (timeClass === 'overthinking') {
          overthinkingCount++;
        }
      }
    });

    const tacticalCount = totalPlayerErrors - (timePressureCount + precipitationCount + overthinkingCount);

    return {
      timePressure: timePressureCount,
      precipitation: precipitationCount,
      overthinking: overthinkingCount,
      tactical: tacticalCount,
      total: totalPlayerErrors,
      blunders: blunderCount,
      mistakes: mistakeCount,
      inaccuracies: inaccuracyCount,
    };
  }, [moveEvaluations, errorTimeClasses, playerColor, analysisReady]);

  // Caso A: El análisis aún no ha sido solicitado o no está listo.
  // Mostramos una tarjeta de invitación premium con CTA.
  if (!analysisReady) {
    if (!history || history.length === 0) {
      return null;
    }
    return (
      <div className="time-error-breakdown-wrapper preview-wrapper">
        <div className="time-legend-row preview-row">
          <div className="legend-item-preview" title="Análisis de gestión de tiempo disponible">
            <Clock size={12} className="preview-icon animate-pulse" />
            <span className="preview-text">
              ¿Quieres ver cómo afectó el reloj a tus jugadas? <strong>Analiza la partida</strong> para ver el desglose de errores por tiempo de reflexión.
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Caso B: El análisis está listo pero la partida no tiene registros de tiempo (%clk)
  if (!hasClocks) {
    return (
      <div className="time-error-breakdown-wrapper no-clocks-wrapper">
        <div className="time-legend-row no-clocks-row">
          <div className="legend-item-no-clocks" title="Sin datos de reloj">
            <AlertCircle size={12} className="no-clocks-icon" />
            <span className="no-clocks-text">
              Esta partida no contiene registros de tiempo en el reloj para analizar la gestión del tiempo.
            </span>
          </div>
        </div>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  const { timePressure, precipitation, overthinking, tactical, total, blunders, mistakes, inaccuracies } = stats;

  // Calculamos los porcentajes relativos a "total"
  const pctPressure = total > 0 ? Math.round((timePressure / total) * 100) : 0;
  const pctPrecipitation = total > 0 ? Math.round((precipitation / total) * 100) : 0;
  const pctOverthinking = total > 0 ? Math.round((overthinking / total) * 100) : 0;
  const pctTactical = total > 0 ? Math.max(0, 100 - (pctPressure + pctPrecipitation + pctOverthinking)) : 0;

  return (
    <div className="time-error-breakdown-wrapper">
      {/* Leyenda con números y porcentajes */}
      {total > 0 && (
        <div className="time-legend-row">
        <div className="legend-item pressure" title="Apuros de tiempo: menos de 40s en el reloj">
          <Clock size={11} className="legend-icon" />
          <span className="legend-text">Apuros:</span>
          <span className="legend-num">{timePressure} ({pctPressure}%)</span>
        </div>
        <div className="legend-item precipitation" title="Precipitación: jugar rápido en menos de 3s">
          <Zap size={11} className="legend-icon" />
          <span className="legend-text">Prisa:</span>
          <span className="legend-num">{precipitation} ({pctPrecipitation}%)</span>
        </div>
        <div className="legend-item overthinking" title="Sobrepensar: pensar más de 30s">
          <Brain size={11} className="legend-icon" />
          <span className="legend-text">Duda:</span>
          <span className="legend-num">{overthinking} ({pctOverthinking}%)</span>
        </div>
        <div className="legend-item tactical" title="Tácticos: errores de cálculo no relacionados al reloj">
          <Sparkles size={11} className="legend-icon" />
          <span className="legend-text">Tácticos:</span>
          <span className="legend-num">{tactical} ({pctTactical}%)</span>
        </div>
        </div>
      )}

      {/* Mensaje motivacional / éxito si es partida impecable */}
      {total === 0 && (
        <div className="time-perfect-game-badge">
          <CheckCircle2 size={12} className="perfect-check-icon animate-pulse" />
          <span className="perfect-text">¡Precisión impecable! No cometiste ningún error en esta partida.</span>
        </div>
      )}
    </div>
  );
};
