import React, { useState, useEffect } from 'react';
import { backendService } from '../../services/backendService';
import { ChevronLeft, Trash2, Calendar, Target, Hash } from 'lucide-react';
import './Puzzle.css';

export const PuzzleLibrary = ({ onBack }) => {
  const [puzzles, setPuzzles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let removeHandler = null;
    let retryInterval = null;

    const loadPuzzles = () => {
      setIsLoading(true);
      removeHandler = backendService.addHandler((msg) => {
        if (msg.type === 'puzzle_list') {
          setPuzzles(msg.puzzles.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
          setIsLoading(false);
          if (retryInterval) clearInterval(retryInterval);
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
          setPuzzles(prev => prev.filter(p => p.id !== id));
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
          setPuzzles([]);
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
          <div className="pl-loading">Cargando biblioteca...</div>
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
                  <span className="pl-date">
                    <Calendar size={10} />
                    {new Date(p.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="pl-item-meta">
                  <span>Partida: {p.gameId.slice(-6)}</span>
                  <span>Solucionado: {p.solvedCount || 0}</span>
                </div>
                <div className="pl-item-badges">
                  {p.isOnlyMove && <span className="pl-badge only-move" title={`Gap Crítico: ${p.criticalityGap}`}>Only Move</span>}
                  {p.tensionIndex > 4 && <span className="pl-badge tension" title={`${p.attackedSquares} casillas bajo ataque`}>Alta Tensión ({p.tensionIndex})</span>}
                  {p.blunderSeverity > 0.5 && <span className="pl-badge severe">Severo ({p.blunderSeverity.toFixed(2)})</span>}
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
