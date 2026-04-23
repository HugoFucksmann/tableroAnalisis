import React, { useState, useEffect } from 'react';
import { Board } from '../Board/Board';
import { EvaluationBar } from '../Analysis/EvaluationBar';
import { MoveList } from '../History/MoveList';
import { GameImport } from '../Import/GameImport';
import { OpeningExplorer } from '../Analysis/OpeningExplorer';
import { BoardControls } from '../Board/BoardControls';
import { EvaluationGraph } from '../Analysis/EvaluationGraph';
import { AnalysisLoadingModal } from '../Analysis/AnalysisLoadingModal';
import './Dashboard.css';

const isMobileViewport = () =>
  typeof window !== 'undefined' && window.innerWidth <= 1100;

export const Dashboard = () => {
  // Panel states
  const [isImportCollapsed, setIsImportCollapsed] = useState(isMobileViewport());
  const [isExplorerCollapsed, setIsExplorerCollapsed] = useState(isMobileViewport());
  const [isHistoryCollapsed, setIsHistoryCollapsed] = useState(false);

  return (
    <div className="dashboard-container">
      <AnalysisLoadingModal />

      <main className="dashboard-content">
        {/* ── Left: Board Section ───────────────────────────────────── */}
        <section className="board-section glass-panel">
          <div className="eval-bar-wrapper-dashboard">
            <EvaluationBar />
          </div>
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
              <h3>Explorador</h3>
              <span className="collapse-toggle">{isExplorerCollapsed ? '+' : '−'}</span>
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