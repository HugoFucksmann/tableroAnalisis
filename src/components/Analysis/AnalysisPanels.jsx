import React from 'react';
import { EvaluationGraph } from './EvaluationGraph';
import { BoardControls } from '../Board/BoardControls';
import { MoveList } from '../History/MoveList';
import { OpeningExplorer } from './OpeningExplorer';
import { GameImport } from '../Import/GameImport';
import { BotPanel } from './BotPanel';
import { Key, Cpu, Download, Bot, Sliders } from 'lucide-react';
import { useGameStore } from '../../store/useGameStore';
import { useShallow } from 'zustand/react/shallow';
import { generateAnnotatedPgn, downloadPgn } from '../../utils/pgnExport';

export const AnalysisPanels = ({
  isHistoryCollapsed,
  setIsHistoryCollapsed,
  isExplorerCollapsed,
  setIsExplorerCollapsed,
  isImportCollapsed,
  setIsImportCollapsed
}) => {
  const {
    history,
    analysisReady,
    startFullAnalysis,
    ecoCode,
    openingName,
    lichessToken,
    showTokenInput,
    setShowTokenInput,
    analysisSubView,
    setAnalysisSubView
  } = useGameStore(useShallow(state => ({
    history: state.history,
    analysisReady: state.analysisReady,
    startFullAnalysis: state.startFullAnalysis,
    ecoCode: state.ecoCode,
    openingName: state.openingName,
    lichessToken: state.lichessToken,
    showTokenInput: state.showTokenInput,
    setShowTokenInput: state.setShowTokenInput,
    analysisSubView: state.analysisSubView,
    setAnalysisSubView: state.setAnalysisSubView
  })));

  const explorerTitle = (openingName && openingName !== 'Initial Position') ? openingName : 'Explorador';

  const handleDownloadPgn = () => {
    const { moveEvaluations, evaluationHistory, engineConfig, gameHeaders, pgnCommentsByIndex } = useGameStore.getState();
    const pgn = generateAnnotatedPgn(history, moveEvaluations, evaluationHistory, engineConfig, gameHeaders, pgnCommentsByIndex);
    downloadPgn(pgn, 'analisis_partida.pgn');
  };
  return (
    <>
      <div className="panel-container controls-panel">
        <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3>{analysisSubView === 'analysis' ? 'Análisis' : 'Bot'}</h3>
          <div className="analysis-view-toggle">
            <button
              className={`view-btn ${analysisSubView === 'analysis' ? 'active' : ''}`}
              onClick={() => setAnalysisSubView('analysis')}
              title="Panel de Análisis"
            >
              <Sliders size={14} />
            </button>
            <button
              className={`view-btn ${analysisSubView === 'bot' ? 'active' : ''}`}
              onClick={() => setAnalysisSubView('bot')}
              title="Panel del Bot"
            >
              <Bot size={14} />
            </button>
          </div>
        </div>
        <div className="controls-content">
          {analysisSubView === 'bot' ? (
            <BotPanel />
          ) : (
            <>
              <EvaluationGraph />
              <BoardControls />
            </>
          )}
        </div>
      </div>

      <div className={`panel-container move-history-panel ${isHistoryCollapsed ? 'collapsed' : ''}`}>
        <div
          className="panel-header"
          onClick={() => setIsHistoryCollapsed(!isHistoryCollapsed)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setIsHistoryCollapsed(!isHistoryCollapsed);
            }
          }}
          role="button"
          tabIndex={0}
        >
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
        <div
          className="panel-header"
          onClick={() => setIsExplorerCollapsed(!isExplorerCollapsed)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setIsExplorerCollapsed(!isExplorerCollapsed);
            }
          }}
          role="button"
          tabIndex={0}
        >
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
        <div
          className="panel-header"
          onClick={() => setIsImportCollapsed(!isImportCollapsed)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setIsImportCollapsed(!isImportCollapsed);
            }
          }}
          role="button"
          tabIndex={0}
        >
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
  );
};
