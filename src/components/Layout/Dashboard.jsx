import React, { useState, useEffect } from 'react';
import { Board } from '../Board/Board';
import { EvaluationBar } from '../Analysis/EvaluationBar';
import { MoveList } from '../History/MoveList';
import { GameImport } from '../Import/GameImport';
import { OpeningExplorer } from '../Analysis/OpeningExplorer';
import { BoardControls } from '../Board/BoardControls';
import { EvaluationGraph } from '../Analysis/EvaluationGraph';
import { AnalysisLoadingModal } from '../Analysis/AnalysisLoadingModal';
import { Key, Settings, Cpu, Download } from 'lucide-react';
import { useGameStore } from '../../store/useGameStore';
import { useShallow } from 'zustand/react/shallow';
import { generateAnnotatedPgn, downloadPgn } from '../../utils/pgnExport';
import { EngineConfigModal } from '../Import/EngineConfigModal';
import { ModeSelector } from './ModeSelector';
import { PuzzleDashboard } from '../Puzzle/PuzzleDashboard';
import { StatsDashboard } from '../Stats/StatsDashboard';
import { MoveExplorerView } from '../Puzzle/MoveExplorerView';
import { backendService } from '../../services/backendService';
import './Dashboard.css';

const usePanelManagement = () => {
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth <= 1100 : false
  );
  const [isImportCollapsed, setIsImportCollapsed] = useState(isMobile);
  const [isExplorerCollapsed, setIsExplorerCollapsed] = useState(isMobile);
  const [isHistoryCollapsed, setIsHistoryCollapsed] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      const currentIsMobile = window.innerWidth <= 1100;
      if (currentIsMobile !== isMobile) {
        setIsMobile(currentIsMobile);
        setIsImportCollapsed(currentIsMobile);
        setIsExplorerCollapsed(currentIsMobile);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isMobile]);

  return {
    isMobile,
    isImportCollapsed, setIsImportCollapsed,
    isExplorerCollapsed, setIsExplorerCollapsed,
    isHistoryCollapsed, setIsHistoryCollapsed
  };
};

const useSidebarResize = (isMobile) => {
  const [width, setWidth] = useState(() => {
    const saved = localStorage.getItem('sidebarWidth');
    return saved ? parseInt(saved) : 400;
  });
  const [isResizing, setIsResizing] = useState(false);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizing || isMobile) return;
      // Calculamos el ancho desde la derecha
      const newWidth = window.innerWidth - e.clientX;
      if (newWidth > 320 && newWidth < 800) {
        setWidth(newWidth);
        localStorage.setItem('sidebarWidth', newWidth);
      }
    };

    const stopResizing = () => {
      setIsResizing(false);
      document.body.classList.remove('is-resizing');
    };

    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', stopResizing);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', stopResizing);
    };
  }, [isResizing, isMobile]);

  const startResizing = (e) => {
    e.preventDefault();
    setIsResizing(true);
    document.body.classList.add('is-resizing');
  };

  return { width, isResizing, startResizing };
};

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
    lichessToken, history, hasPgnEvaluations, startFullAnalysis,
    analysisReady, appMode, applyFullAnalysis, setAnalyses, gameId,
    setAppMode, setExplorerMode
  } = useGameStore(useShallow(state => ({
    openingName: state.openingName,
    ecoCode: state.ecoCode,
    showTokenInput: state.showTokenInput,
    setShowTokenInput: state.setShowTokenInput,
    lichessToken: state.lichessToken,
    history: state.history,
    hasPgnEvaluations: state.hasPgnEvaluations,
    startFullAnalysis: state.startFullAnalysis,
    analysisReady: state.analysisReady,
    appMode: state.appMode,
    applyFullAnalysis: state.applyFullAnalysis,
    setAnalyses: state.setAnalyses,
    gameId: state.gameId,
    setAppMode: state.setAppMode,
    setExplorerMode: state.setExplorerMode
  })));

  useEffect(() => {
    setExplorerMode(appMode === 'explorer');
  }, [appMode, setExplorerMode]);

  useEffect(() => {
    const cleanup = backendService.addHandler((msg) => {
      if (msg.type === 'connection_status' && msg.connected) {
        backendService.getAnalyses(0, 50);
      }
      if (msg.type === 'full_analysis_data') {
        applyFullAnalysis(msg.data);
      }
      if (msg.type === 'analyses_list') {
        if (msg.offset === 0) {
          setAnalyses(msg.analyses);
        } else {
          setAnalyses(prev => {
            const existingIds = new Set(prev.map(a => a.id));
            const newItems = msg.analyses.filter(a => !existingIds.has(a.id));
            return [...prev, ...newItems];
          });
        }
      }
    });

    // Si ya está conectado al montar, pedir la lista
    if (backendService.isConnected) {
      backendService.getAnalyses(0, 50);
    }

    return () => cleanup();
  }, [applyFullAnalysis, setAnalyses]);

  // Al cargar una partida, pedir análisis previo si existe
  const lastLoadedId = React.useRef(null);
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
          <div className="board-wrapper">
            <Board />
          </div>
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
            <>
              <div className="panel-container controls-panel">
                <div className="panel-header">
                  <h3>Análisis</h3>
                </div>
                <div className="controls-content">
                  <EvaluationGraph />
                  <BoardControls />
                </div>
              </div>

              <div className={`panel-container move-history-panel ${isHistoryCollapsed ? 'collapsed' : ''}`}>
                <div className="panel-header" onClick={() => setIsHistoryCollapsed(!isHistoryCollapsed)}>
                  <h3>Historial</h3>
                  <div className="panel-actions">
                    {!isHistoryCollapsed && (
                      <>
                        <button
                          className={`panel-action-btn ${history.length > 0 ? 'ready' : ''} ${analysisReady ? 're-analyze' : ''}`}
                          title={analysisReady ? "Volver a analizar (Sobrescribir)" : (history.length > 0 ? "Analizar Partida con Stockfish" : "Haz movimientos para analizar")}
                          onClick={(e) => { e.stopPropagation(); startFullAnalysis(); }}
                          disabled={history.length === 0}
                        >
                          <Cpu size={14} />
                        </button>

                        {analysisReady && (
                          <button
                            className="panel-action-btn"
                            onClick={(e) => { e.stopPropagation(); handleDownloadPgn(); }}
                            title="Descargar PGN Anotado"
                          >
                            <Download size={14} />
                          </button>
                        )}
                      </>
                    )}
                    <span className="collapse-toggle">{isHistoryCollapsed ? '+' : '−'}</span>
                  </div>
                </div>
                {!isHistoryCollapsed && <MoveList />}
              </div>

              <div className={`panel-container explorer-panel ${isExplorerCollapsed ? 'collapsed' : ''}`}>
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

              <div className={`panel-container import-panel ${isImportCollapsed ? 'collapsed' : ''}`}>
                <div className="panel-header" onClick={() => setIsImportCollapsed(!isImportCollapsed)}>
                  <div className="panel-title-group">
                    <h3>Importar</h3>
                  </div>
                  <div className="panel-actions">
                    <span className="collapse-toggle">{isImportCollapsed ? '+' : '−'}</span>
                  </div>
                </div>
                {!isImportCollapsed && <GameImport onGameSelect={() => setIsImportCollapsed(true)} />}
              </div>
            </>
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