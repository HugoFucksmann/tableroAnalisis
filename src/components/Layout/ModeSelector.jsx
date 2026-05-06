import React from 'react';
import { useGameStore } from '../../store/useGameStore';
import { useShallow } from 'zustand/react/shallow';
import { Search, BrainCircuit, BarChart3 } from 'lucide-react';
import './ModeSelector.css';

export const ModeSelector = () => {
  const { appMode, setAppMode } = useGameStore(useShallow(state => ({
    appMode: state.appMode,
    setAppMode: state.setAppMode,
  })));

  return (
    <div className="mode-selector-container glass-panel">
      <div className="mode-selector-track">
        <div 
          className={`mode-selector-highlight ${appMode}`} 
          style={{ 
            width: '33.33%',
            transform: `translateX(${
              appMode === 'analysis' ? '0%' : 
              appMode === 'puzzle' ? '100%' : '200%'
            })` 
          }}
        />
        
        <button 
          className={`mode-btn ${appMode === 'analysis' ? 'active' : ''}`}
          onClick={() => setAppMode('analysis')}
        >
          <Search size={16} />
          <span>Análisis</span>
        </button>
        
        <button 
          className={`mode-btn ${appMode === 'puzzle' ? 'active' : ''}`}
          onClick={() => setAppMode('puzzle')}
        >
          <BrainCircuit size={16} />
          <span>Puzzles</span>
        </button>

        <button 
          className={`mode-btn ${appMode === 'stats' ? 'active' : ''}`}
          onClick={() => setAppMode('stats')}
        >
          <BarChart3 size={16} />
          <span>Estadísticas</span>
        </button>
      </div>
    </div>
  );
};
