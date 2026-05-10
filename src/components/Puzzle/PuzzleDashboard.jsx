import React, { useState, useEffect } from 'react';
import { PuzzleImporter } from './PuzzleImporter';
import { PuzzleLibrary } from './PuzzleLibrary';
import { PuzzleSession } from './PuzzleSession';
import { MoveExplorerView } from './MoveExplorerView';
import { Download, Play, Library, Search } from 'lucide-react';
import { backendService } from '../../services/backendService';
import { useGameStore } from '../../store/useGameStore';
import './Puzzle.css';

export const PuzzleDashboard = () => {
  const [view, setView] = useState('menu'); // menu, import, train, manage, explorer
  const [puzzleCount, setPuzzleCount] = useState(null);
  const { setExplorerMode } = useGameStore();

  const handleSetView = (newView) => {
    setView(newView);
    setExplorerMode(newView === 'explorer');
  };

  useEffect(() => {
    if (view === 'menu') {
      let interval = null;
      const removeHandler = backendService.addHandler((msg) => {
        if (msg.type === 'puzzle_list') {
          setPuzzleCount(msg.puzzles.length);
          if (interval) clearInterval(interval);
        }
      });
      
      backendService.getPuzzles();
      
      interval = setInterval(() => {
        backendService.getPuzzles();
      }, 1000);

      return () => {
        removeHandler();
        clearInterval(interval);
      };
    }
  }, [view]);

  return (
    <div className="puzzle-dashboard">
      {view === 'menu' && (
        <div className="puzzle-menu">
          <button 
            className="puzzle-menu-btn train" 
            onClick={() => handleSetView('train')}
            disabled={puzzleCount === 0}
            style={{ opacity: puzzleCount === 0 ? 0.5 : 1, cursor: puzzleCount === 0 ? 'not-allowed' : 'pointer' }}
          >
            <Play size={20} />
            <div className="btn-text">
              <span className="btn-title">Entrenar {puzzleCount !== null ? `(${puzzleCount})` : ''}</span>
              <span className="btn-desc">{puzzleCount === 0 ? 'No hay puzzles guardados' : 'Resolver puzzles de tus errores'}</span>
            </div>
          </button>
          
          <button className="puzzle-menu-btn explorer" onClick={() => handleSetView('explorer')}>
            <Search size={20} />
            <div className="btn-text">
              <span className="btn-title">Explorador de Repertorio</span>
              <span className="btn-desc">Analiza tus jugadas más frecuentes</span>
            </div>
          </button>
          
          <button className="puzzle-menu-btn import" onClick={() => handleSetView('import')}>
            <Download size={20} />
            <div className="btn-text">
              <span className="btn-title">Extraer Puzzles</span>
              <span className="btn-desc">Buscar errores en nuevas partidas</span>
            </div>
          </button>
          
          <button className="puzzle-menu-btn manage" onClick={() => handleSetView('manage')}>
            <Library size={20} />
            <div className="btn-text">
              <span className="btn-title">Biblioteca</span>
              <span className="btn-desc">Gestionar puzzles guardados</span>
            </div>
          </button>
        </div>
      )}

      {view === 'import' && <PuzzleImporter onBack={() => handleSetView('menu')} />}
      {view === 'manage' && <PuzzleLibrary onBack={() => handleSetView('menu')} />}
      {view === 'train' && <PuzzleSession onBack={() => handleSetView('menu')} />}
      {view === 'explorer' && <MoveExplorerView onBack={() => handleSetView('menu')} />}
    </div>
  );
};
