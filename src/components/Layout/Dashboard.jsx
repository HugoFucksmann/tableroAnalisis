import React from 'react';
import { Board } from '../Board/Board';
import { EvaluationBar } from '../Analysis/EvaluationBar';
import { MoveList } from '../History/MoveList';
import { GameImport } from '../Import/GameImport';
import { OpeningExplorer } from '../Analysis/OpeningExplorer';
import { BoardControls } from '../Board/BoardControls';
import { EvaluationGraph } from '../Analysis/EvaluationGraph';
import './Dashboard.css';

export const Dashboard = () => {
  const [isImportCollapsed, setIsImportCollapsed] = React.useState(false);

  return (
    <div className="dashboard-container">
      <main className="dashboard-content">
        {/* Left Side: Board and Evaluation */}
        <section className="board-section glass-panel">
          <div className="eval-bar-wrapper-dashboard">
            <EvaluationBar />
          </div>
          <div className="board-wrapper">
            <Board />
          </div>
        </section>
        
        {/* Right Side: Information Panels */}
        <aside className="side-panels">
          <div className="panel-container glass-panel explorer-panel">
            <div className="panel-header">
              <h3>Opening Explorer (Lichess DB)</h3>
            </div>
            <OpeningExplorer />
          </div>

          <div className="panel-container glass-panel move-history-panel">
            <div className="panel-header">
              <h3>Historial de Partida</h3>
            </div>
            <MoveList />
          </div>

          <div className="bottom-controls-section">
            <EvaluationGraph />
            <BoardControls />
          </div>

          <div className={`panel-container glass-panel import-panel ${isImportCollapsed ? 'collapsed' : ''}`}>
            <div className="panel-header" onClick={() => setIsImportCollapsed(!isImportCollapsed)}>
              <h3>Importar Partidas</h3>
              <span className="collapse-toggle">{isImportCollapsed ? '+' : '-'}</span>
            </div>
            {!isImportCollapsed && <GameImport onGameSelect={() => setIsImportCollapsed(true)} />}
          </div>
        </aside>
      </main>
    </div>
  );
};
