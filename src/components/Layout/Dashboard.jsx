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
import { Key, Settings, Cpu, Download } from 'lucide-react';
import { useGameStore } from '../../store/useGameStore';
import { useShallow } from 'zustand/react/shallow';
import { generateAnnotatedPgn, downloadPgn } from '../../utils/pgnExport';
import { EngineConfigModal } from '../Import/EngineConfigModal';
import './Dashboard.css';

// FIX: Hook personalizado extraído para limpiar el Dashboard
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
    isImportCollapsed, setIsImportCollapsed,
    isExplorerCollapsed, setIsExplorerCollapsed,
    isHistoryCollapsed, setIsHistoryCollapsed
  };
};

export const Dashboard = () => {
  const {
    isImportCollapsed, setIsImportCollapsed,
    isExplorerCollapsed, setIsExplorerCollapsed,
    isHistoryCollapsed, setIsHistoryCollapsed
  } = usePanelManagement();

  const [showEngineConfig, setShowEngineConfig] = useState(false);

  const {
    openingName, ecoCode, showTokenInput, setShowTokenInput,
    lichessToken, history, moveEvaluations, evaluationHistory,
    engineConfig, gameHeaders, isAnalyzeFromPgn, startFullAnalysis,
    pgnCommentsByIndex, analysisReady,
  } = useGameStore(useShallow(state => ({
    openingName: state.openingName,
    ecoCode: state.ecoCode,
    showTokenInput: state.showTokenInput,
    setShowTokenInput: state.setShowTokenInput,
    lichessToken: state.lichessToken,
    history: state.history,
    moveEvaluations: state.moveEvaluations,
    evaluationHistory: state.evaluationHistory,
    engineConfig: state.engineConfig,
    gameHeaders: state.gameHeaders,
    isAnalyzeFromPgn: state.isAnalyzeFromPgn,
    startFullAnalysis: state.startFullAnalysis,
    pgnCommentsByIndex: state.pgnCommentsByIndex,
    analysisReady: state.analysisReady,
  })));

  const handleDownloadPgn = () => {
    const pgn = generateAnnotatedPgn(history, moveEvaluations, evaluationHistory, engineConfig, gameHeaders, pgnCommentsByIndex);
    downloadPgn(pgn, 'analisis_partida.pgn');
  };

  useEffect(() => {
    return () => stockfishService.destroy();
  }, []);

  const explorerTitle = (openingName && openingName !== 'Initial Position') ? openingName : 'Explorador';

  return (
    <div className="dashboard-container">
      <AnalysisLoadingModal />

      <main className="dashboard-content">
        <section className="board-section glass-panel">
          <div className="board-wrapper">
            <Board />
          </div>
        </section>

        <aside className="side-panels">
          {/* Controls + Graph */}
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
              <div className="panel-title-group">
                <h3>Importar</h3>
              </div>
              <div className="panel-actions">
                {(!analysisReady || isAnalyzeFromPgn) && (
                  <button
                    className="panel-action-btn"
                    title="Analizar Partida con Stockfish"
                    onClick={(e) => { e.stopPropagation(); startFullAnalysis(); }}
                  >
                    <Cpu size={14} />
                  </button>
                )}
                {analysisReady && (
                  <button
                    className="panel-action-btn"
                    title="Descargar PGN"
                    onClick={(e) => { e.stopPropagation(); handleDownloadPgn(); }}
                  >
                    <Download size={14} />
                  </button>
                )}
                <button
                  className="panel-action-btn"
                  title="Configurar motor de análisis"
                  onClick={(e) => { e.stopPropagation(); setShowEngineConfig(true); }}
                >
                  <Settings size={14} />
                </button>
                <span className="collapse-toggle">{isImportCollapsed ? '+' : '−'}</span>
              </div>
            </div>
            {!isImportCollapsed && <GameImport onGameSelect={() => setIsImportCollapsed(true)} />}
          </div>
        </aside>
      </main>

      {showEngineConfig && <EngineConfigModal onClose={() => setShowEngineConfig(false)} />}
    </div>
  );
};