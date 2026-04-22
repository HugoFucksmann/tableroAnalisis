import React from 'react';
import { useGameStore } from '../../store/useGameStore';
import './EvaluationGraph.css';

export const EvaluationGraph = () => {
  const { evaluationHistory, currentMoveIndex, history } = useGameStore();

  const totalMoves = Math.max(history.length, evaluationHistory.length);
  if (totalMoves === 0) return <div className="graph-placeholder">Esperando análisis...</div>;

  const width = 300;
  const height = 80;
  const padding = 5;
  
  const getY = (score) => {
    const clamped = Math.max(-5, Math.min(5, score));
    return height - ((clamped + 5) / 10 * (height - 2 * padding) + padding);
  };

  const getX = (index) => {
    if (totalMoves <= 1) return padding;
    return (index / (totalMoves - 1)) * (width - 2 * padding) + padding;
  };

  const points = evaluationHistory.map((d) => `${getX(d.moveIndex)},${getY(d.score)}`).join(' ');

  return (
    <div className="evaluation-graph-container glass-panel">
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
        {/* Baseline */}
        <line x1="0" y1={height/2} x2={width} y2={height/2} className="baseline" />
        
        {/* Evaluation Line */}
        <polyline points={points} className="eval-line" />
        
        {/* Data Points */}
        {evaluationHistory.map((d, i) => (
          <circle 
            key={i} 
            cx={getX(d.moveIndex)} 
            cy={getY(d.score)} 
            r="2" 
            className={`eval-dot ${d.moveIndex === currentMoveIndex ? 'active' : ''}`} 
          />
        ))}
        
        {/* Current Move Marker */}
        {currentMoveIndex >= 0 && (
          <line 
            x1={getX(currentMoveIndex)} 
            y1="0" 
            x2={getX(currentMoveIndex)} 
            y2={height} 
            className="current-marker" 
          />
        )}
      </svg>
    </div>
  );
};
