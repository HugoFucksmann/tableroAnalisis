import React from 'react';
import { Board } from '../Board/Board';
import { AnalysisLoadingModal } from '../Analysis/AnalysisLoadingModal';
import { Settings } from 'lucide-react';
import { useGameStore } from '../../store/useGameStore';
import { useShallow } from 'zustand/react/shallow';
import { EngineConfigModal } from '../Import/EngineConfigModal';
import { ModeSelector } from './ModeSelector';
import { PuzzleDashboard } from '../Puzzle/PuzzleDashboard';
import { StatsDashboard } from '../Stats/StatsDashboard';
import { MoveExplorerView } from '../Puzzle/MoveExplorer/MoveExplorerView';
import { StatsDetailView } from '../Stats/StatsDetailView';
import { AnalysisPanels } from '../Analysis/AnalysisPanels';
import { usePanelManagement, useSidebarResize } from '../../hooks/useDashboardLayout';
import { useBackendSync } from '../../hooks/useBackendSync';
import { useBotGame } from '../../hooks/useBotGame';
import { useState } from 'react';
import './Dashboard.css';

export const Dashboard = () => {
  const {
    isMobile,
    isImportCollapsed, setIsImportCollapsed,
    isExplorerCollapsed, setIsExplorerCollapsed,
    isHistoryCollapsed, setIsHistoryCollapsed
  } = usePanelManagement();

  const { width: sidePanelWidth, isResizing, startResizing } = useSidebarResize(isMobile);
  const [showEngineConfig, setShowEngineConfig] = useState(false);

  // Sincronización de eventos de red y análisis con el backend
  useBackendSync();
  // Gestión de jugadas automáticas del bot de ajedrez
  useBotGame();

  const {
    appMode, selectedStatCategory
  } = useGameStore(useShallow(state => ({
    appMode: state.appMode,
    selectedStatCategory: state.selectedStatCategory
  })));

  return (
    <div className="dashboard-container">
      <AnalysisLoadingModal />

      <main
        className="dashboard-content"
        style={{
          gridTemplateColumns: isMobile ? '1fr' : `1fr auto ${sidePanelWidth}px`,
          '--side-panel-width': `${sidePanelWidth}px`
        }}
      >
        <section className="board-section glass-panel">
          {appMode === 'stats' && selectedStatCategory ? (
            <StatsDetailView />
          ) : (
            <div className="board-wrapper">
              <Board />
            </div>
          )}
        </section>

        {!isMobile && (
          <div
            role="separator"
            aria-label="Panel resizer"
            className={`resizer-handle ${isResizing ? 'active' : ''}`}
            onMouseDown={startResizing}
          />
        )}

        <aside className="side-panels">
          <div className="top-global-bar">
            <div className="mode-selector-wrapper">
              <ModeSelector />
            </div>

            <div className="global-action-buttons">
              <button
                className="global-action-btn"
                title="Configurar motor de análisis"
                onClick={() => setShowEngineConfig(true)}
              >
                <Settings size={15} />
              </button>
            </div>
          </div>

          {appMode === 'analysis' && (
            <AnalysisPanels
              isHistoryCollapsed={isHistoryCollapsed}
              setIsHistoryCollapsed={setIsHistoryCollapsed}
              isExplorerCollapsed={isExplorerCollapsed}
              setIsExplorerCollapsed={setIsExplorerCollapsed}
              isImportCollapsed={isImportCollapsed}
              setIsImportCollapsed={setIsImportCollapsed}
            />
          )}

          {appMode === 'puzzle' && <PuzzleDashboard />}
          {appMode === 'stats' && <StatsDashboard />}
          {appMode === 'explorer' && <MoveExplorerView onBack={() => useGameStore.getState().setAppMode('analysis')} />}
        </aside>
      </main>

      {showEngineConfig && <EngineConfigModal onClose={() => setShowEngineConfig(false)} />}
    </div>
  );
};