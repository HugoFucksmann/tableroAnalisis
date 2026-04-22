import React from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '../../store/useGameStore';
import './EvaluationBar.css';

export const EvaluationBar = () => {
  const { evaluation } = useGameStore();
  
  // Normalizar la evaluación para el porcentaje (limitando a +/- 5)
  const clampedEval = Math.max(-5, Math.min(5, evaluation));
  const percentage = ((clampedEval + 5) / 10) * 100;

  return (
    <div className="eval-bar-wrapper">
      <div className="eval-bar-container">
        <motion.div 
          className="eval-bar-fill"
          initial={{ height: '50%' }}
          animate={{ height: `${100 - percentage}%` }}
          transition={{ type: 'spring', stiffness: 50, damping: 20 }}
        />
        <div className="eval-marker center"></div>
      </div>
      <div className="eval-value-display">
        {evaluation > 0 ? `+${evaluation.toFixed(1)}` : evaluation.toFixed(1)}
      </div>
    </div>
  );
};
