import React from 'react';
import {
  ChevronsLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
  RefreshCcw,
  RotateCcw,
  Lightbulb,
} from 'lucide-react';
import { useGameStore } from '../../store/useGameStore';
import { analysisQueue } from '../../services/analysisQueue';
import './BoardControls.css';

export const BoardControls = () => {
  const {
    resetGame, goToMove,
    currentMoveIndex, history, fen,
    isAnalyzing,
    setBestMoveForIndex, setAnalyzing, setEvaluation,
  } = useGameStore();

  const isAtStart = currentMoveIndex === -1;
  const isAtEnd = currentMoveIndex === history.length - 1;

  /**
   * Análisis rápido on-demand de la posición actual.
   * Útil cuando la posición no ha sido analizada aún
   * (p. ej. movimiento manual del usuario).
   */
  const handleHint = async () => {
    if (isAnalyzing) return;
    await analysisQueue.analyzeCurrentPosition(fen, currentMoveIndex, {
      setBestMoveForIndex,
      setAnalyzing,
      setEvaluation,
    });
  };

  return (
    <div className="board-controls-container glass-panel">
      <div className="navigation-group">
        <button
          className="control-btn"
          title="Inicio"
          disabled={isAtStart}
          onClick={() => goToMove(-1)}
        >
          <ChevronsLeft size={20} />
        </button>
        <button
          className="control-btn"
          title="Atrás"
          disabled={isAtStart}
          onClick={() => goToMove(currentMoveIndex - 1)}
        >
          <ChevronLeft size={20} />
        </button>
        <button
          className="control-btn"
          title="Adelante"
          disabled={isAtEnd}
          onClick={() => goToMove(currentMoveIndex + 1)}
        >
          <ChevronRight size={20} />
        </button>
        <button
          className="control-btn"
          title="Final"
          disabled={isAtEnd}
          onClick={() => goToMove(history.length - 1)}
        >
          <ChevronsRight size={20} />
        </button>
      </div>

      <div className="utility-group">
        <button
          className={`control-btn accent ${isAnalyzing ? 'loading' : ''}`}
          title="Mejor Jugada"
          onClick={handleHint}
          disabled={isAnalyzing}
        >
          <Lightbulb size={18} />
        </button>
        <button className="control-btn secondary" title="Girar Tablero">
          <RefreshCcw size={18} />
        </button>
        <button className="control-btn danger" title="Reiniciar" onClick={resetGame}>
          <RotateCcw size={18} />
        </button>
      </div>
    </div>
  );
};