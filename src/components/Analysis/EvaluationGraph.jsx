import React, { useMemo } from 'react';
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

  const { sorted, areaPath, linePoints } = useMemo(() => {
    const sortedData = Object.values(evaluationHistory || {}).sort((a, b) => a.moveIndex - b.moveIndex);
    const linePts = sortedData.map(d => `${getX(d.moveIndex, total)},${getY(d.score)}`);

    let areaP = '';
    if (sortedData.length > 0) {
      const first = sortedData[0];
      const last = sortedData[sortedData.length - 1];
      areaP = [
        `M ${getX(first.moveIndex, total)} ${midY}`,
        ...sortedData.map(d => `L ${getX(d.moveIndex, total)} ${getY(d.score)}`),
        `L ${getX(last.moveIndex, total)} ${midY}`,
        'Z',
      ].join(' ');
    }

    return { sorted: sortedData, areaPath: areaP, linePoints: linePts };
  }, [evaluationHistory, total, midY]);

  const currentEval = evaluationHistory?.[currentMoveIndex];

  const MISTAKE_TYPES_SET = useMemo(() => new Set(['Error grave', 'Error', 'Imprecisión']), []);

  const mistakeMarkers = useMemo(() => {
    if (!moveEvaluations || total === 0) return [];
    return Object.entries(moveEvaluations).reduce((acc, [idxStr, type]) => {
      if (MISTAKE_TYPES_SET.has(type)) {
        const idx = parseInt(idxStr);
        const evalObj = evaluationHistory?.[idx];
        const score = evalObj?.score ?? 0;
        acc.push({ 
          idx, 
          type, 
          x: getX(idx, total), 
          y: getY(score), 
          style: MISTAKE_STYLES[type] 
        });
      }
      return acc;
    }, []);
  }, [moveEvaluations, evaluationHistory, total, MISTAKE_TYPES_SET]);

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

  const currentMistakeInfo = useMemo(() => {
    if (!analysisReady || !moveEvaluations) return null;
    const type = moveEvaluations[currentMoveIndex];
    if (!type || !['Error grave', 'Error', 'Imprecisión'].includes(type)) return null;

    const timeClass = errorTimeClasses?.[currentMoveIndex];
    let iconName = 'alert';
    let color = '#e09a30'; // default warning orange
    let label = type;

    if (type === 'Error grave') color = '#e05555';
    if (type === 'Imprecisión') color = '#c8b830';

    if (timeClass === 'time_pressure') {
      iconName = 'time_pressure';
      color = '#ef4444'; // Red
      label = `${type} - Apuros de tiempo`;
    } else if (timeClass === 'precipitation') {
      iconName = 'precipitation';
      color = '#f59e0b'; // Amber
      label = `${type} - Precipitación`;
    } else if (timeClass === 'overthinking') {
      iconName = 'overthinking';
      color = '#a855f7'; // Purple
      label = `${type} - Sobrepensar`;
    } else {
      iconName = 'tactical';
      label = `${type} - Táctico`;
    }

    return { type, timeClass, iconName, color, label };
  }, [analysisReady, moveEvaluations, errorTimeClasses, currentMoveIndex]);

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

  return (
    <div className="evaluation-graph-container">
      <div className="graph-header">
        <div className="graph-title-group">
          <span className="graph-title">Evaluación</span>
          {currentEval && (
            <span className={`graph-current-eval ${currentEval.score >= 0 ? 'positive' : 'negative'}`}>
              {currentEval.score >= 0 ? '+' : ''}{currentEval.score.toFixed(2)}
            </span>
          )}
          {isAnalyzing && <span className="graph-analyzing-dot" title="Analizando..." />}
        </div>

        {analysisReady && mistakeIndices.length > 0 && (
          <div className="graph-header-actions">
            <div className="graph-quality-overview">
              <span style={{ color: '#e05555' }} title="Errores Graves">?? {mistakeCounts.blunders}</span>
              <span style={{ color: '#e09a30' }} title="Errores">? {mistakeCounts.mistakes}</span>
              <span style={{ color: '#c8b830' }} title="Inconsistencias">?! {mistakeCounts.inaccuracies}</span>
            </div>
            
            <div className="graph-mistake-nav">
              <button
                className="graph-nav-btn"
                title="Error anterior"
                disabled={prevMistake === null}
                onClick={() => goToMove(prevMistake)}
              >
                <ChevronLeft size={18} />
              </button>
              <div 
                className="graph-mistake-count" 
                style={currentMistakeInfo ? { color: currentMistakeInfo.color } : {}}
                title={currentMistakeInfo ? currentMistakeInfo.label : 'Navegar errores'}
              >
                {renderMistakeIcon()}
                <span>{mistakeIndices.length}</span>
              </div>
              <button
                className="graph-nav-btn"
                title="Error siguiente"
                disabled={nextMistake === null}
                onClick={() => goToMove(nextMistake)}
              >
                <ChevronRight size={18} />
              </button>
            </div>
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
          <linearGradient id="evalGradientWhite" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--eval-white)" stopOpacity="0.5" />
            <stop offset="100%" stopColor="var(--eval-white)" stopOpacity="0.05" />
          </linearGradient>
          <linearGradient id="evalGradientBlack" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="var(--eval-black)" stopOpacity="0.7" />
            <stop offset="100%" stopColor="var(--eval-black)" stopOpacity="0.05" />
          </linearGradient>
          <clipPath id="clipAbove">
            <rect x="0" y="0" width={WIDTH} height={midY} />
          </clipPath>
          <clipPath id="clipBelow">
            <rect x="0" y={midY} width={WIDTH} height={HEIGHT - midY} />
          </clipPath>
        </defs>

        <path d={areaPath} fill="url(#evalGradientWhite)" clipPath="url(#clipAbove)" />
        <path d={areaPath} fill="url(#evalGradientBlack)" clipPath="url(#clipBelow)" />

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
            cy={getY(currentEval.score)}
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

      {history.length > 0 && <TimeErrorBreakdown />}
    </div>
  );
};