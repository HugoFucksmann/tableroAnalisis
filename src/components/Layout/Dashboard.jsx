import React, { useEffect, useState, useRef } from 'react';
import { Board } from '../Board/Board';
import { AnalysisLoadingModal } from '../Analysis/AnalysisLoadingModal';
import { Settings } from 'lucide-react';
import { useGameStore } from '../../store/useGameStore';
import { useShallow } from 'zustand/react/shallow';
import { generateAnnotatedPgn, downloadPgn } from '../../utils/pgnExport';
import { EngineConfigModal } from '../Import/EngineConfigModal';
import { ModeSelector } from './ModeSelector';
import { PuzzleDashboard } from '../Puzzle/PuzzleDashboard';
import { StatsDashboard } from '../Stats/StatsDashboard';
import { MoveExplorerView } from '../Puzzle/MoveExplorer/MoveExplorerView';
import { StatsDetailView } from '../Stats/StatsDetailView';
import { backendService } from '../../services/backendService';
import { AnalysisPanels } from '../Analysis/AnalysisPanels';
import { usePanelManagement, useSidebarResize } from '../../hooks/useDashboardLayout';
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

  const {
    openingName, ecoCode, showTokenInput, setShowTokenInput,
    lichessToken, history, startFullAnalysis, analysisReady,
    appMode, applyFullAnalysis, setAnalyses, gameId,
    setAppMode, selectedStatCategory
  } = useGameStore(useShallow(state => ({
    openingName: state.openingName,
    ecoCode: state.ecoCode,
    showTokenInput: state.showTokenInput,
    setShowTokenInput: state.setShowTokenInput,
    lichessToken: state.lichessToken,
    history: state.history,
    startFullAnalysis: state.startFullAnalysis,
    analysisReady: state.analysisReady,
    appMode: state.appMode,
    applyFullAnalysis: state.applyFullAnalysis,
    setAnalyses: state.setAnalyses,
    gameId: state.gameId,
    setAppMode: state.setAppMode,
    selectedStatCategory: state.selectedStatCategory
  })));

  useEffect(() => {
    const cleanup = backendService.addHandler((msg) => {
      // 1. Manejo de estado de conexión
      if (msg.type === 'connection_status' && msg.connected) {
        backendService.getAnalyses(0, 50);
      }

      // 2. Manejo de la lista de partidas (library)
      if (msg.type === 'analyses_data') {
        if (setAnalyses) setAnalyses(msg.analyses);
      }

      // BUG CRÍTICO/ALTO SOLUCIONADO: Se completó la lógica de los handlers
      // 3. Manejo de recepción de partida completa solicitada desde miniaturas/library
      if (msg.type === 'full_analysis_data') {
        if (applyFullAnalysis) {
          applyFullAnalysis(msg.data);
        }
      }
    });

    // Pedimos las partidas apenas montamos el dashboard
    backendService.getAnalyses(0, 50);

    return cleanup;
  }, [applyFullAnalysis, setAnalyses]);

  // EFECTO 2: Carga del análisis individual cuando cambia gameId (ej: click en miniatura)
  const lastLoadedId = useRef(null);
  useEffect(() => {
    if (gameId && gameId !== lastLoadedId.current) {
      lastLoadedId.current = gameId;
      backendService.getFullAnalysis(gameId);
    }
  }, [gameId]);

  const handleDownloadPgn = () => {
    const { moveEvaluations, evaluationHistory, engineConfig, gameHeaders, pgnCommentsByIndex } = useGameStore.getState();
    const pgn = generateAnnotatedPgn(history, moveEvaluations, evaluationHistory, engineConfig, gameHeaders, pgnCommentsByIndex);
    downloadPgn(pgn, 'analisis_partida.pgn');
  };

  const explorerTitle = (openingName && openingName !== 'Initial Position') ? openingName : 'Explorador';

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
              history={history}
              analysisReady={analysisReady}
              startFullAnalysis={startFullAnalysis}
              handleDownloadPgn={handleDownloadPgn}
              ecoCode={ecoCode}
              explorerTitle={explorerTitle}
              lichessToken={lichessToken}
              showTokenInput={showTokenInput}
              setShowTokenInput={setShowTokenInput}
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