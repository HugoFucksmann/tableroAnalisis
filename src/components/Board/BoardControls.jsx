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
import './BoardControls.css';

// ── Mistake filter config ─────────────────────────────────────────────────────
const MISTAKE_LEVELS = [
  { id: 'blunder', label: '?!?', title: 'Error grave', values: ['Error grave'] },
  { id: 'mistake', label: '?!', title: 'Error', values: ['Error grave', 'Error'] },
  { id: 'inaccuracy', label: '?', title: 'Imprecisión', values: ['Error grave', 'Error', 'Imprecisión'] },
];

export const BoardControls = () => {
  const {
    resetGame, goToMove,
    currentMoveIndex, history,
    boardOrientation, setBoardOrientation,
    moveEvaluations, analysisReady,
  } = useGameStore();

  // Default filter: blunders + mistakes
  const [activeFilter, setActiveFilter] = useState('mistake');

  const handleToggleOrientation = () => {
    setBoardOrientation(boardOrientation === 'white' ? 'black' : 'white');
  };

  const isAtStart = currentMoveIndex === -1;
  const isAtEnd = currentMoveIndex === history.length - 1;

  // ── Mistake navigation ────────────────────────────────────────────────────
  const filterValues = MISTAKE_LEVELS.find(l => l.id === activeFilter)?.values ?? [];

  const mistakeIndices = React.useMemo(() => {
    if (!analysisReady) return [];
    return Object.entries(moveEvaluations)
      .filter(([, type]) => filterValues.includes(type))
      .map(([idx]) => parseInt(idx))
      .sort((a, b) => a - b);
  }, [moveEvaluations, filterValues, analysisReady]);

  const prevMistake = mistakeIndices.filter(i => i < currentMoveIndex).at(-1) ?? null;
  const nextMistake = mistakeIndices.find(i => i > currentMoveIndex) ?? null;

  const hasMistakes = mistakeIndices.length > 0;

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

      {/* ── Row 2: mistake navigator (only when analysis is ready) ──── */}
      {analysisReady && (
        <div className="mistake-nav-row">
          {/* Prev mistake */}
          <button
            className="control-btn mistake-nav-btn"
            title="Error anterior"
            disabled={prevMistake === null}
            onClick={() => goToMove(prevMistake)}
          >
            <ChevronLeft size={16} />
          </button>

          {/* Filter pills */}
          <div className="mistake-filter-group">
            <AlertTriangle size={13} className="mistake-icon" />
            {MISTAKE_LEVELS.map(level => (
              <button
                key={level.id}
                className={`filter-pill ${activeFilter === level.id ? 'active' : ''}`}
                title={level.title}
                onClick={() => setActiveFilter(level.id)}
              >
                {level.label}
                {activeFilter === level.id && hasMistakes && (
                  <span className="mistake-count">{mistakeIndices.length}</span>
                )}
              </button>
            ))}
          </div>

          {/* Next mistake */}
          <button
            className="control-btn mistake-nav-btn"
            title="Error siguiente"
            disabled={nextMistake === null}
            onClick={() => goToMove(nextMistake)}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
};