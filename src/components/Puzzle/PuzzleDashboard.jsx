import React, { useState, useEffect, useRef } from 'react';
import { backendService } from '../../services/backendService';
import { Play, Download, Trash2, Loader2 } from 'lucide-react';
import { Chessboard } from 'react-chessboard';
import { PuzzlePlayer } from './PuzzlePlayer';
import { PuzzleImporter } from './PuzzleImporter';
import './Puzzle.css';

const LazyChessboard = React.memo(({ fen, orientation }) => {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsVisible(true);
        observer.disconnect();
      }
    }, { rootMargin: '400px' });

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} style={{ width: '100%', height: '100%' }}>
      {isVisible && (
        <Chessboard
          options={{
            position: fen,
            boardOrientation: orientation,
            allowDragging: false,
            animationDurationInMs: 0,
            darkSquareStyle: { backgroundColor: '#779556' },
            lightSquareStyle: { backgroundColor: '#ebecd0' }
          }}
        />
      )}
    </div>
  );
});

export const PuzzleDashboard = () => {
  const [view, setView] = useState('library');
  const [puzzles, setPuzzles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [startIndex, setStartIndex] = useState(0);

  const retryIntervalRef = useRef(null);

  // 1. Escuchar siempre los mensajes del backend
  useEffect(() => {
    const removeHandler = backendService.addHandler((msg) => {
      if (msg.type === 'puzzle_list') {
        setPuzzles(msg.puzzles.slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
        setLoading(false);
        // Si llegaron los datos, limpiamos el reintento
        if (retryIntervalRef.current) {
          clearInterval(retryIntervalRef.current);
          retryIntervalRef.current = null;
        }
      }
      if (msg.type === 'puzzle_deleted') {
        setPuzzles(prev => prev.filter(p => p.id !== msg.id));
      }
      if (msg.type === 'puzzles_cleared') {
        setPuzzles([]);
      }
    });

    return () => removeHandler();
  }, []);

  // 2. Pedir los puzzles CADA VEZ que volvamos a la pestaña de librería
  useEffect(() => {
    if (view === 'library') {
      backendService.getPuzzles();

      retryIntervalRef.current = setInterval(() => {
        backendService.getPuzzles();
      }, 1000);

      return () => {
        if (retryIntervalRef.current) {
          clearInterval(retryIntervalRef.current);
          retryIntervalRef.current = null;
        }
      };
    }
  }, [view]);

  const handleTrainAll = () => {
    if (puzzles.length === 0) return;
    setStartIndex(0);
    setView('player');
  };

  const handleTrainSingle = (index) => {
    setStartIndex(index);
    setView('player');
  };

  const handleDelete = (e, id) => {
    e.stopPropagation();
    if (window.confirm('¿Eliminar este puzzle?')) {
      backendService.deletePuzzle(id);
    }
  };

  const handleClearAll = () => {
    if (window.confirm('¿BORRAR TODA LA BIBLIOTECA? Esta acción no se puede deshacer.')) {
      backendService.clearPuzzles();
    }
  };

  if (view === 'player') {
    return <PuzzlePlayer puzzles={puzzles} initialIndex={startIndex} onBack={() => setView('library')} />;
  }

  if (view === 'importer') {
    return <PuzzleImporter onBack={() => setView('library')} />;
  }

  return (
    <div className="puzzle-container glass-panel">
      <div className="puzzle-header">
        <div className="ph-title">
          <h2>Biblioteca de Puzzles</h2>
          <span className="ph-count">{puzzles.length} guardados</span>
        </div>
        <div className="ph-actions">
          {puzzles.length > 0 && (
            <button className="ph-icon-btn danger" onClick={handleClearAll} title="Borrar todo">
              <Trash2 size={16} />
            </button>
          )}
          <button className="ph-btn secondary" onClick={() => setView('importer')}>
            <Download size={16} /> Extraer
          </button>
          <button className="ph-btn primary" onClick={handleTrainAll} disabled={puzzles.length === 0}>
            <Play size={16} /> Entrenar
          </button>
        </div>
      </div>

      {loading ? (
        <div className="puzzle-loading">
          <Loader2 className="spinner" size={32} />
          <p>Cargando biblioteca…</p>
        </div>
      ) : puzzles.length === 0 ? (
        <div className="puzzle-empty">
          <p>No hay puzzles guardados.</p>
          <button className="ph-btn primary" onClick={() => setView('importer')}>
            Extraer de mis partidas
          </button>
        </div>
      ) : (
        <div className="puzzle-grid premium-scroll">
          {puzzles.map((p, index) => {
            const orientation = p.playerColor === 'black' ? 'black' : 'white';
            const label = p.label || 'Táctica';

            return (
              <div
                key={p.id}
                className="puzzle-card"
                onClick={() => handleTrainSingle(index)}
              >
                <div className="pc-board-wrapper">
                  <LazyChessboard fen={p.fen} orientation={orientation} />
                  <button className="pc-delete-btn" onClick={(e) => handleDelete(e, p.id)}>
                    <Trash2 size={14} />
                  </button>
                </div>
                <div className="pc-info">
                  <span className="pc-label">{label}</span>
                  <span className="pc-meta">
                    {p.opponent ? `vs ${p.opponent}` : (p.gameId ? `Partida ${p.gameId.slice(-6)}` : 'Manual')}
                    {p.win !== undefined && p.win !== null ? (p.win === 1 ? ' (Victoria)' : p.win === 0 ? ' (Empate)' : ' (Derrota)') : ''}
                    {p.gameDate ? ` • ${new Date(p.gameDate).toLocaleDateString()}` : ''}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};