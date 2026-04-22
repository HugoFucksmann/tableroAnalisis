import React from 'react';
import { useGameStore } from '../../store/useGameStore';
import './EvaluationGraph.css';

const WIDTH = 400;
const HEIGHT = 80;
const PADDING = 6;

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
  const { evaluationHistory, currentMoveIndex, history, goToMove, gameScore, isAnalyzing } =
    useGameStore();

  const total = history.length;
  const midY = getY(0);

  // Memoizamos los cálculos pesados del gráfico
  const { sorted, areaPath, linePoints } = React.useMemo(() => {
    // 1. Ordenar por moveIndex para que el path sea correcto
    const sortedData = [...evaluationHistory].sort((a, b) => a.moveIndex - b.moveIndex);
    
    // 2. Construir puntos de la línea
    const linePts = sortedData.map(d => `${getX(d.moveIndex, total)},${getY(d.score)}`);

    // 3. Construir path del área rellena
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

  const currentEval = React.useMemo(() => 
    evaluationHistory.find(e => e.moveIndex === currentMoveIndex),
    [evaluationHistory, currentMoveIndex]
  );

  // Click en el SVG → navegar al movimiento correspondiente
  const handleSvgClick = (e) => {
    if (total <= 1) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const xRatio = (e.clientX - rect.left) / rect.width;
    const index = Math.round(xRatio * (total - 1));
    goToMove(Math.max(0, Math.min(total - 1, index)));
  };

  // El return condicional DEBE ir después de todos los hooks
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
        <span className="graph-title">Evaluación</span>
        {currentEval && (
          <span className={`graph-current-eval ${currentEval.score >= 0 ? 'positive' : 'negative'}`}>
            {currentEval.score >= 0 ? '+' : ''}{currentEval.score.toFixed(2)}
          </span>
        )}
        {isAnalyzing && <span className="graph-analyzing-dot" title="Analizando..." />}
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
          {/* Clip superior (ventaja blancas) */}
          <clipPath id="clipAbove">
            <rect x="0" y="0" width={WIDTH} height={midY} />
          </clipPath>
          {/* Clip inferior (ventaja negras) */}
          <clipPath id="clipBelow">
            <rect x="0" y={midY} width={WIDTH} height={HEIGHT - midY} />
          </clipPath>
        </defs>

        {/* Área ventaja blancas */}
        <path d={areaPath} fill="url(#evalGradientWhite)" clipPath="url(#clipAbove)" />
        {/* Área ventaja negras */}
        <path d={areaPath} fill="url(#evalGradientBlack)" clipPath="url(#clipBelow)" />

        {/* Baseline (0.0) */}
        <line x1={PADDING} y1={midY} x2={WIDTH - PADDING} y2={midY} className="baseline" />

        {/* Línea de evaluación */}
        {sorted.length > 1 && (
          <polyline points={linePoints.join(' ')} className="eval-line" />
        )}

        {/* Marcador del movimiento actual */}
        {currentMoveIndex >= 0 && (
          <line
            x1={getX(currentMoveIndex, total)}
            y1={PADDING}
            x2={getX(currentMoveIndex, total)}
            y2={HEIGHT - PADDING}
            className="current-marker"
          />
        )}

        {/* Punto activo */}
        {currentEval && (
          <circle
            cx={getX(currentEval.moveIndex, total)}
            cy={getY(currentEval.score)}
            r="3.5"
            className="eval-dot active"
          />
        )}
      </svg>

      {/* Precisión final */}
      {gameScore && !isAnalyzing && (
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
      )}
    </div>
  );
};