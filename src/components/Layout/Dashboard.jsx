import React, { useState, useEffect } from 'react';
import { Board } from '../Board/Board';
import { EvaluationBar } from '../Analysis/EvaluationBar';
import { MoveList } from '../History/MoveList';
import { GameImport } from '../Import/GameImport';
import { OpeningExplorer } from '../Analysis/OpeningExplorer';
import { BoardControls } from '../Board/BoardControls';
import { EvaluationGraph } from '../Analysis/EvaluationGraph';
import { AnalysisLoadingModal } from '../Analysis/AnalysisLoadingModal';
import { stockfishService } from '../../services/stockfishService';
import { Key } from 'lucide-react';
import { useGameStore } from '../../store/useGameStore';
import { useShallow } from 'zustand/react/shallow';
import './Dashboard.css';

const isMobileViewport = () =>
  typeof window !== 'undefined' && window.innerWidth <= 1100;

export const Dashboard = () => {
  // Panel states
  const [isImportCollapsed, setIsImportCollapsed] = useState(isMobileViewport());
  const [isExplorerCollapsed, setIsExplorerCollapsed] = useState(isMobileViewport());
  const [isHistoryCollapsed, setIsHistoryCollapsed] = useState(false);

  const { 
    openingName, 
    ecoCode, 
    showTokenInput, 
    setShowTokenInput,
    lichessToken 
  } = useGameStore(useShallow(state => ({
    openingName: state.openingName,
    ecoCode: state.ecoCode,
    showTokenInput: state.showTokenInput,
    setShowTokenInput: state.setShowTokenInput,
    lichessToken: state.lichessToken,
  })));

  useEffect(() => {
    // Limpieza al desmontar el Dashboard para liberar memoria
    return () => {
      stockfishService.destroy();
    };
  }, []);

  const explorerTitle = (openingName && openingName !== 'Initial Position') ? openingName : 'Explorador';

  return (
    <div className="dashboard-container">
      <AnalysisLoadingModal />

      <main className="dashboard-content">
        {/* ── Left: Board Section ───────────────────────────────────── */}
        <section className="board-section glass-panel">
          <div className="board-wrapper">
            <Board />
          </div>
        </section>


        {/* ── Right: Side panels ────────────────────────────── */}
        <aside className="side-panels">
          
          {/* Controls + Graph — High Priority */}
          <div className="panel-container glass-panel controls-panel">
            <div className="panel-header">
              <h3>Análisis</h3>
            </div>
            <div className="controls-content">
              <EvaluationGraph />
              <BoardControls />
            </div>
          </div>

          {/* Move history */}
          <div className={`panel-container glass-panel move-history-panel ${isHistoryCollapsed ? 'collapsed' : ''}`}>
            <div className="panel-header" onClick={() => setIsHistoryCollapsed(!isHistoryCollapsed)}>
              <h3>Historial</h3>
              <span className="collapse-toggle">{isHistoryCollapsed ? '+' : '−'}</span>
            </div>
            {!isHistoryCollapsed && <MoveList />}
          </div>

          {/* Explorer */}
          <div className={`panel-container glass-panel explorer-panel ${isExplorerCollapsed ? 'collapsed' : ''}`}>
            <div className="panel-header" onClick={() => setIsExplorerCollapsed(!isExplorerCollapsed)}>
              <div className="panel-title-group">
                {ecoCode && !isExplorerCollapsed && <span className="panel-eco-badge">{ecoCode}</span>}
                <h3>{explorerTitle}</h3>
              </div>
              <div className="panel-actions">
                {!isExplorerCollapsed && (
                  <button 
                    className={`panel-action-btn ${lichessToken ? 'has-token' : ''} ${showTokenInput ? 'active' : ''}`}
                    onClick={(e) => { e.stopPropagation(); setShowTokenInput(!showTokenInput); }}
                    title="Configurar Token Lichess"
                  >
                    <Key size={14} />
                  </button>
                )}
                <span className="collapse-toggle">{isExplorerCollapsed ? '+' : '−'}</span>
              </div>
            </div>
            {!isExplorerCollapsed && <OpeningExplorer />}
          </div>

          {/* Import */}
          <div className={`panel-container glass-panel import-panel ${isImportCollapsed ? 'collapsed' : ''}`}>
            <div className="panel-header" onClick={() => setIsImportCollapsed(!isImportCollapsed)}>
              <h3>Importar</h3>
              <span className="collapse-toggle">{isImportCollapsed ? '+' : '−'}</span>
            </div>
            {!isImportCollapsed && (
              <GameImport onGameSelect={() => setIsImportCollapsed(true)} />
            )}
          </div>
        </aside>
      </main>
    </div>
  );
};