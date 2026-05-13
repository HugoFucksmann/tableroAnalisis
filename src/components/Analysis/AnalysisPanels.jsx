import React from 'react';
import { EvaluationGraph } from './EvaluationGraph';
import { BoardControls } from '../Board/BoardControls';
import { MoveList } from '../History/MoveList';
import { OpeningExplorer } from './OpeningExplorer';
import { GameImport } from '../Import/GameImport';
import { Key, Cpu, Download } from 'lucide-react';

export const AnalysisPanels = ({
  isHistoryCollapsed,
  setIsHistoryCollapsed,
  isExplorerCollapsed,
  setIsExplorerCollapsed,
  isImportCollapsed,
  setIsImportCollapsed,
  history,
  analysisReady,
  startFullAnalysis,
  handleDownloadPgn,
  ecoCode,
  explorerTitle,
  lichessToken,
  showTokenInput,
  setShowTokenInput
}) => {
  return (
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
  );
};
