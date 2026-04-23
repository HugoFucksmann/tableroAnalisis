import React from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '../../store/useGameStore';
import './EvaluationBar.css';

export const EvaluationBar = ({ orientation = 'vertical' }) => {
  const { evaluation } = useGameStore();
  const evaluationValue = evaluation ?? 0;
  
  // Normalizar la evaluación para el porcentaje (limitando a +/- 5)
  const clampedEval = Math.max(-5, Math.min(5, evaluationValue));
  const percentage = ((clampedEval + 5) / 10) * 100;

  const displayValue = evaluationValue > 0 
    ? `+${evaluationValue.toFixed(1)}` 
    : evaluationValue.toFixed(1);

  const isVertical = orientation === 'vertical';

  return (
    <div 
      className={`eval-bar-wrapper ${orientation}`}
      role="progressbar"
      aria-valuenow={evaluationValue}
      aria-valuemin="-5"
      aria-valuemax="5"
      aria-label={`Evaluación: ${displayValue}`}
    >
      <div className="eval-bar-container">
        <motion.div
          className="eval-bar-fill"
          initial={isVertical ? { height: '50%' } : { width: '50%' }}
          animate={isVertical 
            ? { height: `${100 - percentage}%` } 
            : { width: `${percentage}%` }
          }
          transition={{ type: 'spring', stiffness: 50, damping: 20 }}
        />
        <div className="eval-marker center"></div>
      </div>
      <div className="eval-value-display" title="Ventaja numérica">
        {displayValue}
      </div>
    </div>
  );
};


