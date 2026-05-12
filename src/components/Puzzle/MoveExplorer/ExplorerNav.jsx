import React from 'react';
import { 
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight 
} from 'lucide-react';
import './ExplorerNav.css';

export const ExplorerNav = ({ currentMoveIndex, historyLength, goToMove }) => {
  return (
    <nav className="explorer-nav">
      <button
        className="nav-btn"
        onClick={() => goToMove(-1)}
        disabled={currentMoveIndex === -1}
        title="Inicio"
      >
        <ChevronsLeft size={14} />
      </button>
      <button
        className="nav-btn"
        onClick={() => goToMove(currentMoveIndex - 1)}
        disabled={currentMoveIndex === -1}
        title="Anterior"
      >
        <ChevronLeft size={14} />
      </button>
      <button
        className="nav-btn"
        onClick={() => goToMove(currentMoveIndex + 1)}
        disabled={currentMoveIndex >= historyLength - 1}
        title="Siguiente"
      >
        <ChevronRight size={14} />
      </button>
      <button
        className="nav-btn"
        onClick={() => goToMove(historyLength - 1)}
        disabled={currentMoveIndex >= historyLength - 1}
        title="Final"
      >
        <ChevronsRight size={14} />
      </button>

      <div className="move-count-info">
        Jugada: <strong>{currentMoveIndex + 1}</strong> / {historyLength}
      </div>
    </nav>
  );
};
