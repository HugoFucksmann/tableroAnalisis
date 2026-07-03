import React, { useReducer, useEffect } from 'react';
import { backendService } from '../../services/backendService';
import { ChevronLeft, Trash2, Calendar, Hash } from 'lucide-react';
import './Puzzle.css';

const initialState = {
  puzzles: [],
  isLoading: true,
};

function libraryReducer(state, action) {
  switch (action.type) {
    case 'LOADING_START':
      return { ...state, isLoading: true };
    case 'PUZZLES_LOADED':
      return {
        puzzles: action.payload.slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
        isLoading: false,
      };
    case 'PUZZLE_DELETED':
      return { ...state, puzzles: state.puzzles.filter(p => p.id !== action.payload) };
    case 'PUZZLES_CLEARED':
      return { ...state, puzzles: [] };
    default:
      return state;
  }
}

function formatDate(isoString) {
  try { return new Date(isoString).toLocaleDateString(); } catch { return ''; }
}

const PuzzleCard = ({ puzzle, onDelete }) => {
  const label = puzzle.label || 'Táctica';
  const cssClass = label.toLowerCase().replace(/\s+/g, '-');
  const gameId = puzzle.gameId ? puzzle.gameId.slice(-6) : 'Manual';
  const solvedCount = puzzle.solvedCount || 0;
  const motifs = Array.isArray(puzzle.tacticalMotifs) ? puzzle.tacticalMotifs : [];

  return (
    <div className="pl-item">
      <div className="pl-item-info">
        <div className="pl-item-top">
          <span className={`pl-label ${cssClass}`}>{label}</span>
          <span className="pl-date">
            <Calendar size={10} />
            {formatDate(puzzle.createdAt)}
          </span>
        </div>
        <div className="pl-item-meta">
          <span>Partida: {gameId}</span>
          <span>Solucionado: {solvedCount}</span>
        </div>
        <div className="pl-item-badges">
          {puzzle.isOnlyMove && (
            <span className="pl-badge only-move" title={`Gap Crítico: ${puzzle.criticalityGap}`}>
              Only Move
            </span>
          )}
          {puzzle.tensionIndex > 4 && (
            <span className="pl-badge tension" title={`${puzzle.attackedSquares} casillas bajo ataque`}>
              Alta Tensión ({puzzle.tensionIndex})
            </span>
          )}
          {puzzle.blunderSeverity > 0.5 && (
            <span className="pl-badge severe">
              Severo ({puzzle.blunderSeverity.toFixed(2)})
            </span>
          )}
          {motifs.map(m => (
            <span key={m} className="pl-badge motif">{m}</span>
          ))}
        </div>
      </div>
      <button className="pl-delete-btn" onClick={() => onDelete(puzzle.id)}>
        <Trash2 size={14} />
      </button>
    </div>
  );
};

export const PuzzleLibrary = ({ onBack }) => {
  const [state, dispatch] = useReducer(libraryReducer, initialState);
  const { puzzles, isLoading } = state;

  useEffect(() => {
    let removeHandler = null;
    let retryInterval = null;

    const loadPuzzles = () => {
      dispatch({ type: 'LOADING_START' });
      removeHandler = backendService.addHandler((msg) => {
        if (msg.type === 'puzzle_list') {
          dispatch({ type: 'PUZZLES_LOADED', payload: msg.puzzles });
          if (retryInterval) {
            clearInterval(retryInterval);
            retryInterval = null;
          }
        }
      });
      backendService.getPuzzles();
      retryInterval = setInterval(() => backendService.getPuzzles(), 1000);
    };

    loadPuzzles();

    return () => {
      if (removeHandler) removeHandler();
      if (retryInterval) clearInterval(retryInterval);
    };
  }, []);

  const handleDelete = (id) => {
    if (window.confirm('¿Eliminar este puzzle?')) {
      const removeHandler = backendService.addHandler((msg) => {
        if (msg.type === 'puzzle_deleted' && msg.id === id) {
          dispatch({ type: 'PUZZLE_DELETED', payload: id });
          removeHandler();
        } else if (msg.type === 'error') {
          alert(`Error al eliminar puzzle: ${msg.message}`);
          removeHandler();
        }
      });
      backendService.deletePuzzle(id);
    }
  };

  const handleClearAll = () => {
    if (window.confirm('¿BORRAR TODA LA BIBLIOTECA? Esta acción no se puede deshacer.')) {
      const removeHandler = backendService.addHandler((msg) => {
        if (msg.type === 'puzzles_cleared') {
          dispatch({ type: 'PUZZLES_CLEARED' });
          removeHandler();
        } else if (msg.type === 'error') {
          alert(`Error al vaciar biblioteca: ${msg.message}`);
          removeHandler();
        }
      });
      backendService.clearPuzzles();
    }
  };

  return (
    <div className="puzzle-library">
      <div className="puzzle-header">
        <button className="back-btn" onClick={onBack}><ChevronLeft size={16} /></button>
        <h3>Biblioteca</h3>
        {puzzles.length > 0 && (
          <button className="clear-btn" onClick={handleClearAll} title="Borrar todo">
            <Trash2 size={14} />
          </button>
        )}
      </div>

      <div className="pl-stats-bar">
        <div className="pl-stat">
          <Hash size={12} />
          <span>Total: {puzzles.length}</span>
        </div>
      </div>

      <div className="pl-list premium-scroll">
        {isLoading ? (
          <div className="pl-loading">Cargando biblioteca…</div>
        ) : puzzles.length === 0 ? (
          <div className="pl-empty">No hay puzzles guardados. Ve a "Extraer Puzzles" para empezar.</div>
        ) : (
          puzzles.map(p => <PuzzleCard key={p.id} puzzle={p} onDelete={handleDelete} />)
        )}
      </div>
    </div>
  );
};