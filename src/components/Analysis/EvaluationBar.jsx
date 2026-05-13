import React from 'react';
import { m } from 'framer-motion';
import { useGameStore } from '../../store/useGameStore';
import './EvaluationBar.css';

const MAX_EVAL_DISPLAY = 5;

export const EvaluationBar = ({ orientation = 'vertical' }) => {
  const evaluationValue = useGameStore(state => state.evaluation?.score ?? 0);
  const mate = useGameStore(state => state.evaluation?.mate ?? null);

  const clampedEval = Math.max(-MAX_EVAL_DISPLAY, Math.min(MAX_EVAL_DISPLAY, evaluationValue));
  const percentage = ((clampedEval + MAX_EVAL_DISPLAY) / (MAX_EVAL_DISPLAY * 2)) * 100;

  const displayValue = evaluationValue > 0
    ? `+${evaluationValue.toFixed(1)}`
    : evaluationValue.toFixed(1);

  const scoreClass = evaluationValue > 0 ? 'positive' : 'negative';
  const isVertical = orientation === 'vertical';

  return (
    <div
      className={`eval-bar-wrapper ${orientation}`}
      role="progressbar"
      aria-valuenow={evaluationValue}
      aria-valuemin={-MAX_EVAL_DISPLAY}
      aria-valuemax={MAX_EVAL_DISPLAY}
      aria-label={`Evaluación: ${displayValue}`}
    >
      <div className="eval-bar-container">
        <m.div
          className="eval-bar-fill"
          initial={isVertical ? { height: '50%' } : { width: '50%' }}
          animate={isVertical
            ? { height: `${percentage}%` }
            : { width: `${percentage}%` }
          }
          transition={{ type: 'spring', stiffness: 50, damping: 20 }}
        />
        <div className="eval-marker center" />
      </div>
      <div className="eval-value-display" title="Ventaja numérica">
        <div className={`eval-score ${scoreClass}`}>{displayValue}</div>
        {Number.isInteger(mate) && (
          <div className="eval-mate">M{Math.abs(mate)}</div>
        )}
      </div>
    </div>
  );
};