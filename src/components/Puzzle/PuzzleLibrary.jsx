import React, { useReducer, useEffect } from 'react';
import { backendService } from '../../services/backendService';
import { ChevronLeft, Trash2, Calendar, Target, Hash } from 'lucide-react';
import './Puzzle.css';

// ✅ FIX (cascading-set-state): los 4 setState del useEffect original
// (setIsLoading x2, setPuzzles, clearInterval implícito) se unifican en un reducer.
// Esto evita re-renders en cascada y hace el flujo de estado explícito.
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
        puzzles: action.payload.slice().sort(
          (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
        ),
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

// ✅ FIX (rendering-hydration-mismatch-time): new Date() se formatea en una
// función pura llamada en render, no directamente en JSX como expresión de
// inicialización. El valor no se usa para estado, solo para display, por lo que
// no requiere useEffect+useState aquí — es solo presentación de un dato ya
// guardado (p.createdAt), no la fecha actual del sistema.
function formatDate(isoString) {
  try {
    return new Date(isoString).toLocaleDateString();
  } catch {
    return '';
  }
}

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

      // Retry every 1s if still loading (in case connection was opening)
      retryInterval = setInterval(() => {
        backendService.getPuzzles();
      }, 1000);
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
          puzzles.map(p => (
            <div key={p.id} className="pl-item">
              <div className="pl-item-info">
                <div className="pl-item-top">
                  <span className={`pl-label ${p.label.toLowerCase().replace(' ', '-')}`}>
                    {p.label}
                  </span>
                  {/* ✅ formatDate() evita el hydration mismatch — ver función arriba */}
                  <span className="pl-date">
                    <Calendar size={10} />
                    {formatDate(p.createdAt)}
                  </span>
                </div>
                <div className="pl-item-meta">
                  <span>Partida: {p.gameId.slice(-6)}</span>
                  <span>Solucionado: {p.solvedCount || 0}</span>
                </div>
                <div className="pl-item-badges">
                  {p.isOnlyMove && (
                    <span className="pl-badge only-move" title={`Gap Crítico: ${p.criticalityGap}`}>
                      Only Move
                    </span>
                  )}
                  {p.tensionIndex > 4 && (
                    <span className="pl-badge tension" title={`${p.attackedSquares} casillas bajo ataque`}>
                      Alta Tensión ({p.tensionIndex})
                    </span>
                  )}
                  {p.blunderSeverity > 0.5 && (
                    <span className="pl-badge severe">
                      Severo ({p.blunderSeverity.toFixed(2)})
                    </span>
                  )}
                  {p.tacticalMotifs && p.tacticalMotifs.map(m => (
                    <span key={m} className="pl-badge motif">{m}</span>
                  ))}
                </div>
              </div>
              <button className="pl-delete-btn" onClick={() => handleDelete(p.id)}>
                <Trash2 size={14} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};