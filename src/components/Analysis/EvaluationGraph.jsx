import React, { useMemo, useState } from 'react';
import { useGameStore } from '../../store/useGameStore';
import { useShallow } from 'zustand/react/shallow';
import { ChevronLeft, ChevronRight, AlertTriangle, Clock, Zap, Brain, Sparkles } from 'lucide-react';
import { TimeErrorBreakdown } from './TimeErrorBreakdown';
import './EvaluationGraph.css';

const TIME_CLASS_LABELS = {
  time_pressure: 'Apuros de tiempo (<40s)',
  precipitation: 'Precipitación (<3s)',
  overthinking: 'Sobrepensar (>30s)',
};

const WIDTH = 400;
const HEIGHT = 80;
const PADDING = 6;

const MISTAKE_STYLES = {
  'Error grave': { color: '#e05555', symbol: '??' },
  'Error': { color: '#e09a30', symbol: '?' },
  'Imprecisión': { color: '#c8b830', symbol: '?!' },
};

function clampScore(s) {
  return Math.max(-5, Math.min(5, s ?? 0));
}

function getY(score) {
  return HEIGHT - ((clampScore(score) + 5) / 10) * (HEIGHT - 2 * PADDING) - PADDING;
}

function getX(index, total) {
  if (total <= 1) return PADDING;
  return (index / (total - 1)) * (WIDTH - 2 * PADDING) + PADDING;
}

export const EvaluationGraph = () => {
  const [onlyMyMistakes, setOnlyMyMistakes] = useState(false);
  const { evaluationHistory, currentMoveIndex, history, goToMove, accuracy, accuracyByPhase, isAnalyzing, moveEvaluations, errorTimeClasses, analysisReady, playerColor } =
    useGameStore(useShallow(state => ({
      evaluationHistory: state.evaluationHistory,
      currentMoveIndex: state.currentMoveIndex,
      history: state.history,
      goToMove: state.goToMove,
      accuracy: state.accuracy,
      accuracyByPhase: state.accuracyByPhase,
      isAnalyzing: state.isAnalyzing,
      moveEvaluations: state.moveEvaluations,
      errorTimeClasses: state.errorTimeClasses,
      analysisReady: state.analysisReady,
      playerColor: state.playerColor,
    })));

  const total = history.length;
  const midY = getY(0);

  const displayScore = useMemo(() => {
    const currentEval = evaluationHistory?.[currentMoveIndex];
    if (!currentEval) return 0;
    return playerColor === 'black' ? -currentEval.score : currentEval.score;
  }, [evaluationHistory, currentMoveIndex, playerColor]);

  const { sorted, areaPath, linePoints } = useMemo(() => {
    const sortedData = Object.values(evaluationHistory || {}).sort((a, b) => a.moveIndex - b.moveIndex);
    const linePts = sortedData.map(d => {
      const adjustedVal = playerColor === 'black' ? -d.score : d.score;
      return `${getX(d.moveIndex, total)},${getY(adjustedVal)}`;
    });

    let areaP = '';
    if (sortedData.length > 0) {
      const first = sortedData[0];
      const last = sortedData[sortedData.length - 1];
      areaP = [
        `M ${getX(first.moveIndex, total)} ${midY}`,
        ...sortedData.map(d => {
          const adjustedVal = playerColor === 'black' ? -d.score : d.score;
          return `L ${getX(d.moveIndex, total)} ${getY(adjustedVal)}`;
        }),
        `L ${getX(last.moveIndex, total)} ${midY}`,
        'Z',
      ].join(' ');
    }

    return { sorted: sortedData, areaPath: areaP, linePoints: linePts };
  }, [evaluationHistory, total, midY, playerColor]);

  const currentEval = evaluationHistory?.[currentMoveIndex];

  const MISTAKE_TYPES_SET = useMemo(() => new Set(['Error grave', 'Error', 'Imprecisión']), []);

  const mistakeMarkers = useMemo(() => {
    if (!moveEvaluations || total === 0) return [];
    return Object.entries(moveEvaluations).reduce((acc, [idxStr, type]) => {
      if (MISTAKE_TYPES_SET.has(type)) {
        const idx = parseInt(idxStr);
        const isPlayerMove = (idx % 2 === 0) ? (playerColor === 'white') : (playerColor === 'black');
        if (onlyMyMistakes && !isPlayerMove) return acc;

        const evalObj = evaluationHistory?.[idx];
        const score = evalObj?.score ?? 0;
        const adjustedVal = playerColor === 'black' ? -score : score;
        acc.push({
          idx,
          type,
          x: getX(idx, total),
          y: getY(adjustedVal),
          style: MISTAKE_STYLES[type]
        });
      }
      return acc;
    }, []);
  }, [moveEvaluations, evaluationHistory, total, MISTAKE_TYPES_SET, playerColor, onlyMyMistakes]);

  const mistakeIndices = useMemo(() => {
    return mistakeMarkers.map(m => m.idx).sort((a, b) => a - b);
  }, [mistakeMarkers]);

  const mistakeCounts = useMemo(() => {
    if (!moveEvaluations || !playerColor) return { blunders: 0, mistakes: 0, inaccuracies: 0 };
    let b = 0, m = 0, i = 0;
    Object.entries(moveEvaluations).forEach(([idxStr, type]) => {
      const idx = parseInt(idxStr, 10);
      const isPlayerMove = (idx % 2 === 0) ? (playerColor === 'white') : (playerColor === 'black');
      if (isPlayerMove) {
        if (type === 'Error grave') b++;
        else if (type === 'Error') m++;
        else if (type === 'Imprecisión') i++;
      }
    });
    return { blunders: b, mistakes: m, inaccuracies: i };
  }, [moveEvaluations, playerColor]);

  const prevMistake = mistakeIndices.filter(i => i < currentMoveIndex).at(-1) ?? null;
  const nextMistake = mistakeIndices.find(i => i > currentMoveIndex) ?? null;

  // Solo muestra info especial si el movimiento actual ES uno de los errores marcados
  const currentMistakeInfo = useMemo(() => {
    if (!analysisReady || !moveEvaluations) return null;
    const type = moveEvaluations[currentMoveIndex];
    if (!type || !['Error grave', 'Error', 'Imprecisión'].includes(type)) return null;

    const timeClass = errorTimeClasses?.[currentMoveIndex];
    let iconName = 'alert';
    let color = '#e09a30';
    let label = type;

    if (type === 'Error grave') color = '#e05555';
    if (type === 'Imprecisión') color = '#c8b830';

    if (timeClass === 'time_pressure') {
      iconName = 'time_pressure';
      color = '#ef4444';
      label = `${type} - Apuros de tiempo`;
    } else if (timeClass === 'precipitation') {
      iconName = 'precipitation';
      color = '#f59e0b';
      label = `${type} - Precipitación`;
    } else if (timeClass === 'overthinking') {
      iconName = 'overthinking';
      color = '#a855f7';
      label = `${type} - Sobrepensar`;
    } else {
      iconName = 'tactical';
      label = `${type} - Táctico`;
    }

    return { type, timeClass, iconName, color, label };
  }, [analysisReady, moveEvaluations, errorTimeClasses, currentMoveIndex]);

  // Renderiza el icono del contador de errores:
  // - Si el movimiento actual es un error marcado → icono según su tipo
  // - Si no → AlertTriangle neutro
  const renderMistakeIcon = () => {
    if (!currentMistakeInfo) {
      return <AlertTriangle size={15} />;
    }
    const { iconName, color, label } = currentMistakeInfo;
    switch (iconName) {
      case 'time_pressure':
        return <Clock size={15} style={{ color }} title={label} />;
      case 'precipitation':
        return <Zap size={15} style={{ color }} title={label} />;
      case 'overthinking':
        return <Brain size={15} style={{ color }} title={label} />;
      case 'tactical':
        return <Sparkles size={15} style={{ color }} title={label} />;
      default:
        return <AlertTriangle size={15} style={{ color }} title={label} />;
    }
  };

  const handleSvgClick = (e) => {
    if (total <= 1) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const xRatio = (e.clientX - rect.left) / rect.width;
    const index = Math.round(xRatio * (total - 1));
    goToMove(Math.max(0, Math.min(total - 1, index)));
  };

  if (total === 0) {
    return (
      <div className="evaluation-graph-container">
        <div className="graph-placeholder">
          {isAnalyzing ? 'Analizando partida...' : 'Cargá una partida para ver el gráfico'}
        </div>
      </div>
    );
  }

  const aboveColor = playerColor === 'black' ? 'var(--eval-black)' : 'var(--eval-white)';
  const aboveOpacity = playerColor === 'black' ? 0.7 : 0.5;
  const belowColor = playerColor === 'black' ? 'var(--eval-white)' : 'var(--eval-black)';
  const belowOpacity = playerColor === 'black' ? 0.5 : 0.7;

  return (
    <div className="evaluation-graph-container">
      <div className="graph-header">
        <div className="graph-title-group">
          <span className="graph-title">Evaluación</span>
          {currentEval && (
            <span className={`graph-current-eval ${displayScore >= 0 ? 'positive' : 'negative'}`}>
              {displayScore >= 0 ? '+' : ''}{displayScore.toFixed(2)}
            </span>
          )}
          {isAnalyzing && <span className="graph-analyzing-dot" title="Analizando..." />}
        </div>

        {/* Solo navegación de errores, sin quality-overview */}
        {analysisReady && mistakeIndices.length > 0 && (
          <div className="graph-mistake-nav">
            <button
              className="graph-nav-btn"
              title="Error anterior"
              disabled={prevMistake === null}
              onClick={() => goToMove(prevMistake)}
            >
              <ChevronLeft size={18} />
            </button>
            <button
              className={`graph-mistake-count-btn ${onlyMyMistakes ? 'filtered' : ''}`}
              style={currentMistakeInfo ? { color: currentMistakeInfo.color } : {}}
              onClick={() => setOnlyMyMistakes(prev => !prev)}
              title={onlyMyMistakes
                ? 'Mostrando solo tus errores. Haz clic para ver todos los errores.'
                : 'Mostrando todos los errores de la partida. Haz clic para filtrar solo los tuyos.'}
            >
              {renderMistakeIcon()}
              <span>{onlyMyMistakes ? `Mis errores: ${mistakeIndices.length}` : `Errores: ${mistakeIndices.length}`}</span>
            </button>
            <button
              className="graph-nav-btn"
              title="Error siguiente"
              disabled={nextMistake === null}
              onClick={() => goToMove(nextMistake)}
            >
              <ChevronRight size={18} />
            </button>
          </div>
        )}
      </div>

      <svg
        width="100%"
        height={HEIGHT}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        preserveAspectRatio="none"
        className="graph-svg"
        onClick={handleSvgClick}
      >
        <defs>
          <linearGradient id="evalGradientAbove" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={aboveColor} stopOpacity={aboveOpacity} />
            <stop offset="100%" stopColor={aboveColor} stopOpacity="0.05" />
          </linearGradient>
          <linearGradient id="evalGradientBelow" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor={belowColor} stopOpacity={belowOpacity} />
            <stop offset="100%" stopColor={belowColor} stopOpacity="0.05" />
          </linearGradient>
          <clipPath id="clipAbove">
            <rect x="0" y="0" width={WIDTH} height={midY} />
          </clipPath>
          <clipPath id="clipBelow">
            <rect x="0" y={midY} width={WIDTH} height={HEIGHT - midY} />
          </clipPath>
        </defs>

        <path d={areaPath} fill="url(#evalGradientAbove)" clipPath="url(#clipAbove)" />
        <path d={areaPath} fill="url(#evalGradientBelow)" clipPath="url(#clipBelow)" />

        <line x1={PADDING} y1={midY} x2={WIDTH - PADDING} y2={midY} className="baseline" />

        {sorted.length > 1 && (
          <polyline points={linePoints.join(' ')} className="eval-line" />
        )}

        {mistakeMarkers.map(({ idx, x, y, style, type }) => {
          const isCurrent = idx === currentMoveIndex;
          const timeClass = errorTimeClasses?.[idx];
          const timeLabel = timeClass ? ` - ${TIME_CLASS_LABELS[timeClass] || timeClass}` : '';
          return (
            <g
              key={`mistake-${idx}`}
              className="mistake-marker-group"
              onClick={(e) => { e.stopPropagation(); goToMove(idx); }}
            >
              <title>{`${type} (${style.symbol})${timeLabel}`}</title>
              <line
                x1={x} y1={HEIGHT - PADDING}
                x2={x} y2={HEIGHT - PADDING - 5}
                stroke={style.color}
                strokeWidth={isCurrent ? 2 : 1.5}
                opacity={isCurrent ? 1 : 0.7}
              />
              <polygon
                points={`${x},${y - 4} ${x + 3},${y} ${x},${y + 4} ${x - 3},${y}`}
                fill={style.color}
                opacity={isCurrent ? 1 : 0.75}
                className="mistake-diamond"
              />
            </g>
          );
        })}

        {currentMoveIndex >= 0 && (
          <line
            x1={getX(currentMoveIndex, total)}
            y1={PADDING}
            x2={getX(currentMoveIndex, total)}
            y2={HEIGHT - PADDING}
            className="current-marker"
          />
        )}

        {currentEval && (
          <circle
            cx={getX(currentEval.moveIndex, total)}
            cy={getY(displayScore)}
            r="3.5"
            className="eval-dot active"
          />
        )}
      </svg>

      {analysisReady && (
        accuracy ? (
          <div className="accuracy-row">
            <div className="accuracy-chip white">
              <span className="chip-color-dot" style={{ background: 'var(--eval-white)' }} />
              <span>{accuracy.white}%</span>
            </div>
            <span className="accuracy-label-center">precisión</span>
            <div className="accuracy-chip black">
              <span>{accuracy.black}%</span>
              <span className="chip-color-dot" style={{ background: 'var(--eval-black)' }} />
            </div>
          </div>
        ) : (
          <div className="accuracy-row accuracy-loading">
            <span className="accuracy-loading-text">Calculando precisión...</span>
          </div>
        )
      )}

      {analysisReady && accuracyByPhase && accuracyByPhase.length > 0 && (
        <div className="phase-accuracy-minimal-row">
          {accuracyByPhase.map((p) => {
            let phaseVar = 'var(--text-muted)';
            const lowerPhase = p.phase.toLowerCase();
            if (lowerPhase.includes('apertura')) phaseVar = 'var(--success-primary)';
            else if (lowerPhase.includes('medio') || lowerPhase.includes('juego')) phaseVar = 'var(--warning-primary)';
            else if (lowerPhase.includes('final')) phaseVar = 'var(--info-primary)';

            return (
              <div className="phase-accuracy-minimal-item" key={p.phase} title={`Precisión en ${p.phase}`}>
                <span className="phase-accuracy-dot" style={{ backgroundColor: phaseVar }} />
                <span className="phase-accuracy-name">{p.phase}</span>
                <span className="phase-accuracy-val">{p.accuracy}%</span>
              </div>
            );
          })}
        </div>
      )}

      {history.length > 0 && <TimeErrorBreakdown mistakeCounts={mistakeCounts} />}
    </div>
  );
};