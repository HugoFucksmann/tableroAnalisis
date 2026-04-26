import React, { useMemo } from 'react';
import { useGameStore } from '../../store/useGameStore';
import { ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react';
import './EvaluationGraph.css';

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
  const { evaluationHistory, currentMoveIndex, history, goToMove, gameScore, isAnalyzing, moveEvaluations, analysisReady } =
    useGameStore();

  const MISTAKE_TYPES = ['Error grave', 'Error', 'Imprecisión'];
  const total = history.length;
  const midY = getY(0);

  const { sorted, areaPath, linePoints } = useMemo(() => {
    // FIX: Convertir el diccionario en array antes de ordenar
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

  // FIX: Acceso O(1) al diccionario
  const currentEval = evaluationHistory?.[currentMoveIndex];

  const mistakeMarkers = useMemo(() => {
    if (!moveEvaluations || total === 0) return [];
    return Object.entries(moveEvaluations)
      .filter(([, type]) => MISTAKE_TYPES.includes(type))
      .map(([idxStr, type]) => {
        const idx = parseInt(idxStr);
        // FIX: Acceso O(1) al diccionario
        const evalObj = evaluationHistory?.[idx];
        const score = evalObj?.score ?? 0;
        return { idx, type, x: getX(idx, total), y: getY(score), style: MISTAKE_STYLES[type] };
      });
  }, [moveEvaluations, evaluationHistory, total]);

  const mistakeIndices = useMemo(() => {
    return mistakeMarkers.map(m => m.idx).sort((a, b) => a - b);
  }, [mistakeMarkers]);

  const prevMistake = mistakeIndices.filter(i => i < currentMoveIndex).at(-1) ?? null;
  const nextMistake = mistakeIndices.find(i => i > currentMoveIndex) ?? null;

  const handleSvgClick = (e) => {
    if (total <= 1) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const xRatio = (e.clientX - rect.left) / rect.width;
    const index = Math.round(xRatio * (total - 1));
    goToMove(Math.max(0, Math.min(total - 1, index)));
  };

  if (total === 0) {
    return (
      <div className="evaluation-graph-container glass-panel">
        <div className="graph-placeholder">
          {isAnalyzing ? 'Analizando partida...' : 'Cargá una partida para ver el gráfico'}
        </div>
      </div>
    );
  }

  return (
    <div className="evaluation-graph-container glass-panel">
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
          <div className="graph-mistake-nav">
            <button
              className="graph-nav-btn"
              title="Error anterior"
              disabled={prevMistake === null}
              onClick={() => goToMove(prevMistake)}
            >
              <ChevronLeft size={14} />
            </button>
            <div className="graph-mistake-count">
              <AlertTriangle size={12} />
              <span>{mistakeIndices.length}</span>
            </div>
            <button
              className="graph-nav-btn"
              title="Error siguiente"
              disabled={nextMistake === null}
              onClick={() => goToMove(nextMistake)}
            >
              <ChevronRight size={14} />
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
          <linearGradient id="evalGradientWhite" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f1f1f1" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#f1f1f1" stopOpacity="0.05" />
          </linearGradient>
          <linearGradient id="evalGradientBlack" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="#2d3436" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#2d3436" stopOpacity="0.05" />
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
          return (
            <g
              key={idx}
              className="mistake-marker-group"
              onClick={(e) => { e.stopPropagation(); goToMove(idx); }}
            >
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
        gameScore ? (
          <div className="accuracy-row">
            <div className="accuracy-chip white">
              <span className="chip-color-dot" style={{ background: '#f1f1f1' }} />
              <span>{gameScore.white}%</span>
            </div>
            <span className="accuracy-label-center">precisión</span>
            <div className="accuracy-chip black">
              <span>{gameScore.black}%</span>
              <span className="chip-color-dot" style={{ background: '#333' }} />
            </div>
          </div>
        ) : (
          <div className="accuracy-row accuracy-loading">
            <span className="accuracy-loading-text">Calculando precisión...</span>
          </div>
        )
      )}
    </div>
  );
};