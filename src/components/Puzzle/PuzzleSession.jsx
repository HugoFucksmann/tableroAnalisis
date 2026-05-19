import React, { useState, useEffect } from 'react';
import { backendService } from '../../services/backendService';
import { ChevronLeft } from 'lucide-react';
import { PuzzlePlayer } from './PuzzlePlayer';
import './Puzzle.css';

export const PuzzleSession = ({ onBack }) => {
  const [state, setState] = useState({
    puzzles: [],
    currentIndex: 0,
    status: 'loading'
  });

  useEffect(() => {
    let retryInterval;
    const removeHandler = backendService.addHandler((msg) => {
      if (msg.type === 'puzzle_list') {
        if (retryInterval) {
          clearInterval(retryInterval);
          retryInterval = null;
        }
        setState(prev => {
          if (prev.puzzles.length > 0) return prev;
          return {
            ...prev,
            puzzles: msg.puzzles.toSorted(() => Math.random() - 0.5),
            status: msg.puzzles.length > 0 ? 'active' : 'empty'
          };
        });
      }
    });

    backendService.getPuzzles();
    retryInterval = setInterval(() => backendService.getPuzzles(), 1000);

    return () => {
      removeHandler();
      if (retryInterval) clearInterval(retryInterval);
    };
  }, []);

  const handleNext = () => {
    if (state.currentIndex < state.puzzles.length - 1) {
      setState(prev => ({ ...prev, currentIndex: prev.currentIndex + 1 }));
    } else {
      setState(prev => ({ ...prev, status: 'finished' }));
    }
  };

  const { status, puzzles, currentIndex } = state;

  if (status === 'loading' || status === 'empty' || status === 'finished') {
    return (
      <div className="puzzle-session">
        <div className="puzzle-header">
          <button className="back-btn" onClick={onBack}><ChevronLeft size={16} /></button>
          <h3>Entrenar</h3>
        </div>
        <div className="ps-state">
          {status === 'loading' && <p>Cargando puzzles…</p>}
          {status === 'empty' && <p>No hay puzzles guardados. Ve a «Extraer Puzzles» primero.</p>}
          {status === 'finished' && (
            <>
              <h3>¡Sesión finalizada!</h3>
              <button className="pi-start-btn" onClick={onBack} style={{ marginTop: '16px' }}>Volver al Menú</button>
            </>
          )}
        </div>
      </div>
    );
  }

  const currentPuzzle = puzzles[currentIndex];

  return (
    <PuzzlePlayer
      key={currentPuzzle.id}
      puzzle={currentPuzzle}
      currentIndex={currentIndex}
      totalPuzzles={puzzles.length}
      onNext={handleNext}
      onBack={onBack}
    />
  );
};