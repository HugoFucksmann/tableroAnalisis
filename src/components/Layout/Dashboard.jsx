import React from 'react';
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
  typeof window !== 'undefined' && window.innerWidth <= 768;

export const Dashboard = () => {
  // Both panels start collapsed on mobile to keep the board front-and-center
  const [isImportCollapsed, setIsImportCollapsed] = React.useState(isMobileViewport);
  const [isExplorerCollapsed, setIsExplorerCollapsed] = React.useState(isMobileViewport);

  return (
    <div className="dashboard-container">
      {/* Blocking analysis modal — hides itself when done */}
      <AnalysisLoadingModal />

      <main className="dashboard-content">
        {/* ── Left: Board ───────────────────────────────────── */}
        <section className="board-section glass-panel">
          <div className="eval-bar-wrapper-dashboard">
            <EvaluationBar />
          </div>
          <div className="board-wrapper">
            <Board />
          </div>
        </section>

        {/* ── Right: Side panels ────────────────────────────── */}
        {/* On mobile these stack below the board (single-column grid).
            CSS `order` puts controls first, then moves, explorer, import. */}
        <aside className="side-panels">

          {/* Explorer — collapsible, starts closed on mobile */}
          <div className={`panel-container glass-panel explorer-panel ${isExplorerCollapsed ? 'collapsed' : ''}`}>
            <div
              className="panel-header"
              onClick={() => setIsExplorerCollapsed((v) => !v)}
            >
              <h3>Opening Explorer (Lichess DB)</h3>
              <span className="collapse-toggle">{isExplorerCollapsed ? '+' : '−'}</span>
            </div>
            {!isExplorerCollapsed && <OpeningExplorer />}
          </div>

          {/* Move history — always visible, height capped on mobile via CSS */}
          <div className="panel-container glass-panel move-history-panel">
            <div className="panel-header">
              <h3>Historial de Partida</h3>
            </div>
            <MoveList />
          </div>

          {/* Eval graph + navigation controls
              CSS order: 1 on mobile → directly under board */}
          <div className="bottom-controls-section">
            <EvaluationGraph />
            <BoardControls />
          </div>

          {/* Import — collapsible, starts closed on mobile */}
          <div className={`panel-container glass-panel import-panel ${isImportCollapsed ? 'collapsed' : ''}`}>
            <div
              className="panel-header"
              onClick={() => setIsImportCollapsed((v) => !v)}
            >
              <h3>Importar Partidas</h3>
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