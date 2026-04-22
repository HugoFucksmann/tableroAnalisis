import React from 'react';
import { useGameStore } from '../../store/useGameStore';
import { analysisQueue } from '../../services/analysisQueue';
import { MOCK_GAMES } from '../../utils/mockData';
import { Search, ExternalLink, Loader } from 'lucide-react';
import './GameImport.css';

export const GameImport = ({ onGameSelect }) => {
  const { loadPgn, history, currentMoveIndex, isAnalyzing, analysisProgress, gameScore,
    setMoveEvaluation, setEvaluation, setAnalyzing, setGameScore,
    setAnalysisProgress, setBestMove } = useGameStore();

  const [platform, setPlatform] = React.useState('lichess');
  const [loadingId, setLoadingId] = React.useState(null);

  const handleLoadGame = async (pgn, gameId) => {
    setLoadingId(gameId);

    // 1. Cargar la partida en el store (resetea estados de análisis)
    const ok = loadPgn(pgn);
    if (!ok) { setLoadingId(null); return; }

    if (onGameSelect) onGameSelect();
    setLoadingId(null);

    // 2. Leer el estado actualizado del store DESPUÉS del loadPgn
    //    (useGameStore.getState() para acceso fuera de render)
    const { history: newHistory, currentMoveIndex: newIndex } = useGameStore.getState();

    // 3. Disparar análisis completo en background
    await analysisQueue.analyzeGame(newHistory, newIndex, {
      setMoveEvaluation,
      setEvaluation,
      setAnalyzing,
      setGameScore,
      setAnalysisProgress,
      setBestMove,
    });
  };

  return (
    <div className="game-import-container">
      <div className="platform-switch">
        <button
          className={`switch-btn ${platform === 'lichess' ? 'active' : ''}`}
          onClick={() => setPlatform('lichess')}
        >
          Lichess
        </button>
        <button
          className={`switch-btn ${platform === 'chesscom' ? 'active' : ''}`}
          onClick={() => setPlatform('chesscom')}
        >
          Chess.com
        </button>
      </div>

      <div className="search-bar">
        <Search size={16} className="search-icon" />
        <input type="text" placeholder="Buscar usuario (Lichess/Chess.com)..." />
      </div>

      {/* Barra de progreso de análisis */}
      {isAnalyzing && (
        <div className="analysis-progress">
          <div className="progress-header">
            <Loader size={13} className="spin" />
            <span>Analizando con Stockfish...</span>
            <span className="progress-pct">{analysisProgress}%</span>
          </div>
          <div className="progress-bar-track">
            <div
              className="progress-bar-fill"
              style={{ width: `${analysisProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Precisión final */}
      {!isAnalyzing && gameScore && (
        <div className="game-score-display">
          <div className="accuracy-item white">
            <span className="accuracy-label">⬜ Blancas</span>
            <span className="accuracy-value">{gameScore.white}%</span>
          </div>
          <div className="accuracy-divider" />
          <div className="accuracy-item black">
            <span className="accuracy-label">⬛ Negras</span>
            <span className="accuracy-value">{gameScore.black}%</span>
          </div>
        </div>
      )}

      <div className="mock-games-list premium-scroll">
        <h4>Partidas Recientes</h4>
        {MOCK_GAMES.map((game) => (
          <div
            key={game.id}
            className={`game-card ${loadingId === game.id ? 'loading' : ''}`}
            onClick={() => handleLoadGame(game.pgn, game.id)}
          >
            <div className="game-card-info">
              <div className="players">
                <span className="player white">{game.white}</span>
                <span className="vs">vs</span>
                <span className="player black">{game.black}</span>
              </div>
              <div className="game-meta">
                <span className="result">{game.result}</span>
                <span className="date">{game.date}</span>
              </div>
            </div>
            {loadingId === game.id
              ? <Loader size={14} className="spin" />
              : <ExternalLink size={14} className="load-icon" />
            }
          </div>
        ))}
      </div>
    </div>
  );
};