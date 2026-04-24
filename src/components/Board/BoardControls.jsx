import React, { useState } from 'react';
import {
  ChevronsLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
  RefreshCcw,
  RotateCcw,
  AlertTriangle,
} from 'lucide-react';
import { useGameStore } from '../../store/useGameStore';
import { useShallow } from 'zustand/react/shallow';
import './BoardControls.css';



export const BoardControls = () => {
  const {
    resetGame, goToMove,
    currentMoveIndex, history,
    boardOrientation, setBoardOrientation,
    analysisReady,
  } = useGameStore(useShallow(state => ({
    resetGame: state.resetGame,
    goToMove: state.goToMove,
    currentMoveIndex: state.currentMoveIndex,
    history: state.history,
    boardOrientation: state.boardOrientation,
    setBoardOrientation: state.setBoardOrientation,
    analysisReady: state.analysisReady,
  })));

  const handleToggleOrientation = () => {
    setBoardOrientation(boardOrientation === 'white' ? 'black' : 'white');
  };

  const isAtStart = currentMoveIndex === -1;
  const isAtEnd = currentMoveIndex === history.length - 1;



  return (
    <div className="board-controls-container glass-panel">
      {/* ── Row 1: standard navigation ─────────────────────────────── */}
      <div className="navigation-group">
        <button className="control-btn" title="Inicio" disabled={isAtStart} onClick={() => goToMove(-1)}>
          <ChevronsLeft size={20} />
        </button>
        <button className="control-btn" title="Atrás" disabled={isAtStart} onClick={() => goToMove(currentMoveIndex - 1)}>
          <ChevronLeft size={20} />
        </button>
        <button className="control-btn" title="Adelante" disabled={isAtEnd} onClick={() => goToMove(currentMoveIndex + 1)}>
          <ChevronRight size={20} />
        </button>
        <button className="control-btn" title="Final" disabled={isAtEnd} onClick={() => goToMove(history.length - 1)}>
          <ChevronsRight size={20} />
        </button>
      </div>

      <div className="utility-group">
        <button className="control-btn secondary" title="Girar Tablero" onClick={handleToggleOrientation}>
          <RefreshCcw size={18} />
        </button>
        <button className="control-btn danger" title="Reiniciar" onClick={resetGame}>
          <RotateCcw size={18} />
        </button>
      </div>


    </div>
  );
};