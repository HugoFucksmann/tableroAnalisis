import React from 'react';
import { useGameStore } from '../../store/useGameStore';
import { useShallow } from 'zustand/react/shallow';
import { Search, BrainCircuit } from 'lucide-react';
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
          style={{ transform: `translateX(${appMode === 'analysis' ? '0' : '100'}%)` }}
        />
        
        <button 
          className={`mode-btn ${appMode === 'analysis' ? 'active' : ''}`}
          onClick={() => setAppMode('analysis')}
        >
          <Search size={14} />
          <span>Análisis</span>
        </button>
        
        <button 
          className={`mode-btn ${appMode === 'puzzle' ? 'active' : ''}`}
          onClick={() => setAppMode('puzzle')}
        >
          <BrainCircuit size={14} />
          <span>Puzzles</span>
        </button>
      </div>
    </div>
  );
};
