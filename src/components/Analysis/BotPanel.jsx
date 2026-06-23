import React from 'react';
import { useGameStore } from '../../store/useGameStore';
import { useShallow } from 'zustand/react/shallow';
import { Play, Square, RotateCcw, Award } from 'lucide-react';
import './BotPanel.css';

export const BotPanel = () => {
  const {
    botActive,
    botDifficulty,
    botColor,
    botActualColor,
    setBotActive,
    setBotDifficulty,
    setBotColor,
    setBotActualColor,
    clearBotMemory,
    takebackBotMove,
    resetGame,
    history,
    currentMoveIndex,
  } = useGameStore(useShallow(state => ({
    botActive: state.botActive,
    botDifficulty: state.botDifficulty,
    botColor: state.botColor,
    botActualColor: state.botActualColor,
    setBotActive: state.setBotActive,
    setBotDifficulty: state.setBotDifficulty,
    setBotColor: state.setBotColor,
    setBotActualColor: state.setBotActualColor,
    clearBotMemory: state.clearBotMemory,
    takebackBotMove: state.takebackBotMove,
    resetGame: state.resetGame,
    history: state.history,
    currentMoveIndex: state.currentMoveIndex,
  })));

  const handleStartGame = () => {
    // Reset current board
    resetGame();
    clearBotMemory();

    // Determine actual color
    let actualColor = botColor;
    if (botColor === 'random') {
      actualColor = Math.random() < 0.5 ? 'white' : 'black';
    }

    setBotActualColor(actualColor);
    setBotActive(true);

    // If bot plays White, it will trigger automatically in the useBotGame hook
    // We should orient the board to the player's perspective
    const playerPersp = actualColor === 'white' ? 'white' : 'black';
    useGameStore.getState().setBoardOrientation(playerPersp);
    useGameStore.getState().setPlayerColor(playerPersp);
  };

  const handleStopGame = () => {
    setBotActive(false);
    clearBotMemory();
    resetGame();
  };

  const difficultyMeta = {
    beginner: { label: 'Principiante', elo: '1000 ELO', color: '#81b64c' },
    intermediate: { label: 'Intermedio', elo: '1400 ELO', color: '#f0c15c' },
    advanced: { label: 'Avanzado', elo: '1800 ELO', color: '#e58f39' },
    master: { label: 'Maestro', elo: '2200 ELO', color: '#b33430' },
  };

  // Check if we can take back a bot move
  // It is the bot's turn (or bot just moved), meaning the last move in history is the bot's move
  const canUndo = botActive && history.length > 0 && (
    (history.length % 2 === 0 && botActualColor === 'white') ||
    (history.length % 2 === 1 && botActualColor === 'black')
  );

  return (
    <div className="bot-panel-container">
      {!botActive ? (
        <div className="bot-setup-view">
          <div className="setup-title">Configurar Oponente</div>
          
          {/* Difficulty Selector */}
          <div className="setup-section">
            <label className="section-label">Dificultad del Motor</label>
            <div className="difficulty-grid">
              {Object.entries(difficultyMeta).map(([key, meta]) => (
                <button
                  key={key}
                  className={`diff-card ${botDifficulty === key ? 'active' : ''}`}
                  onClick={() => setBotDifficulty(key)}
                  style={{ '--card-accent': meta.color }}
                >
                  <Award size={16} />
                  <div className="diff-name">{meta.label}</div>
                  <div className="diff-elo">{meta.elo}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Color Selector */}
          <div className="setup-section">
            <label className="section-label">Jugar como</label>
            <div className="color-selector-row">
              <button
                className={`color-btn white ${botColor === 'white' ? 'active' : ''}`}
                onClick={() => setBotColor('white')}
              >
                ⬜ Blancas
              </button>
              <button
                className={`color-btn random ${botColor === 'random' ? 'active' : ''}`}
                onClick={() => setBotColor('random')}
              >
                🔀 Aleatorio
              </button>
              <button
                className={`color-btn black ${botColor === 'black' ? 'active' : ''}`}
                onClick={() => setBotColor('black')}
              >
                ⬛ Negras
              </button>
            </div>
          </div>

          <button className="start-bot-btn" onClick={handleStartGame}>
            <Play size={15} fill="currentColor" /> Jugar contra Bot
          </button>
        </div>
      ) : (
        <div className="bot-active-view">
          <div className="active-status-card">
            <div className="status-header">
              <span className="live-badge">En Juego</span>
              <span className="diff-indicator" style={{ backgroundColor: difficultyMeta[botDifficulty].color }}>
                {difficultyMeta[botDifficulty].label} ({difficultyMeta[botDifficulty].elo})
              </span>
            </div>
            <div className="opponent-text">
              Juegas con <strong>{botActualColor === 'white' ? 'Blancas' : 'Negras'}</strong> contra Stockfish
            </div>
          </div>

          <div className="bot-controls-actions">
            <button
              className="action-btn takeback-btn"
              disabled={!canUndo}
              onClick={takebackBotMove}
              title="Deshacer la última jugada del bot"
            >
              <RotateCcw size={14} /> Deshacer Jugada Bot
            </button>

            <button className="action-btn stop-btn" onClick={handleStopGame}>
              <Square size={14} fill="currentColor" /> Detener Partida
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
