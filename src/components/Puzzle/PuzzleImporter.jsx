import React, { useState, useEffect } from 'react';
import { backendService } from '../../services/backendService';
import { useGameStore } from '../../store/useGameStore';
import { fetchLichessGames, fetchChesscomGames } from '../../services/gameApi';
import { Search, Loader, AlertCircle, ChevronLeft, Check, Target } from 'lucide-react';
import { Chess } from 'chess.js';
import './Puzzle.css';

export const PuzzleImporter = ({ onBack }) => {
  const [platform, setPlatform] = useState('lichess');
  const [username, setUsername] = useState(useGameStore.getState().searchUsername || '');
  const [games, setGames] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState('');
  const [extractionStatus, setExtractionStatus] = useState(null);

  useEffect(() => {
    const removeHandler = backendService.addHandler((msg) => {
      if (msg.type === 'puzzle_extraction_started') {
        setExtractionStatus({ current: 0, total: msg.totalGames, extracted: 0 });
      } else if (msg.type === 'puzzle_game_done') {
        setExtractionStatus(prev => ({
          ...prev,
          current: msg.gameIndex + 1,
          extracted: msg.totalExtracted
        }));
      } else if (msg.type === 'puzzle_extraction_complete') {
        alert(`¡Extracción completada! Se han añadido ${msg.totalExtracted} puzzles.`);
        setExtractionStatus(null);
        setSelectedIds(new Set());
      } else if (msg.type === 'extraction_cancelled') {
        alert(`Extracción cancelada. Puzzles extraídos: ${msg.totalExtracted}`);
        setExtractionStatus(null);
        setSelectedIds(new Set());
      } else if (msg.type === 'error') {
        alert(`Error en la extracción: ${msg.message}`);
        setExtractionStatus(null);
      }
    });
    return () => removeHandler();
  }, []);

  const handleSearch = async () => {
    if (!username.trim()) return;
    setIsFetching(true);
    setError('');
    try {
      let result;
      if (platform === 'lichess') {
        result = await fetchLichessGames(username.trim(), 20);
      } else {
        result = await fetchChesscomGames(username.trim(), 20);
      }
      setGames(result.games);
      if (result.games.length === 0) setError('No se encontraron partidas.');
    } catch (err) {
      setError(err.message);
    } finally {
      setIsFetching(false);
    }
  };

  const toggleSelect = (id) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleStartExtraction = () => {
    const selectedGames = games
      .filter(g => selectedIds.has(g.id))
      .map(g => ({ pgn: g.pgn, gameId: g.id }));

    if (selectedGames.length === 0) return;

    backendService.extractPuzzles(selectedGames, useGameStore.getState().engineConfig);
  };

  return (
    <div className="puzzle-importer">
      <div className="puzzle-header">
        <button className="back-btn" onClick={onBack}><ChevronLeft size={16} /></button>
        <h3>Extraer Puzzles</h3>
      </div>

      {!extractionStatus ? (
        <>
          <div className="pi-platform-tabs">
            <button 
              className={platform === 'lichess' ? 'active' : ''} 
              onClick={() => setPlatform('lichess')}
            >Lichess</button>
            <button 
              className={platform === 'chesscom' ? 'active' : ''} 
              onClick={() => setPlatform('chesscom')}
            >Chess.com</button>
          </div>

          <div className="pi-search-bar">
            <input 
              type="text" 
              value={username} 
              onChange={e => setUsername(e.target.value)}
              placeholder="Nombre de usuario..."
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
            />
            <button onClick={handleSearch} disabled={isFetching} title="Buscar Partidas">
              {isFetching ? <Loader size={14} className="spin" /> : <Search size={14} />}
            </button>
            <button 
              className="pi-extract-icon-btn"
              onClick={handleStartExtraction} 
              disabled={selectedIds.size === 0}
              title={`Extraer de ${selectedIds.size} partidas seleccionadas`}
            >
              <Target size={14} />
            </button>
          </div>

          {error && <div className="pi-error"><AlertCircle size={14} /> {error}</div>}

          <div className="pi-game-list premium-scroll">
            {games.map(game => (
              <div 
                key={game.id} 
                className={`pi-game-card ${selectedIds.has(game.id) ? 'selected' : ''}`}
                onClick={() => toggleSelect(game.id)}
              >
                <div className="pi-card-info">
                  <span className="pi-players">{game.white} vs {game.black}</span>
                  <span className="pi-date">{game.date}</span>
                </div>
                <div className="pi-card-check">
                  {selectedIds.has(game.id) ? <Check size={14} /> : <div className="dot" />}
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="pi-progress-view">
          <div className="pi-progress-circle">
            <Loader size={40} className="spin" />
            <div className="pi-progress-text">
              <span className="current">{extractionStatus.current}</span>
              <span className="sep">/</span>
              <span className="total">{extractionStatus.total}</span>
            </div>
          </div>
          <p>Analizando partidas...</p>
          <div className="pi-stats">
            <span>Puzzles encontrados: <strong>{extractionStatus.extracted}</strong></span>
          </div>
          <button 
            className="pi-cancel-btn" 
            onClick={() => {
              setExtractionStatus(prev => ({ ...prev, canceling: true }));
              backendService.cancelExtraction();
            }}
            disabled={extractionStatus.canceling}
          >
            {extractionStatus.canceling ? 'Cancelando...' : 'Cancelar'}
          </button>
        </div>
      )}
    </div>
  );
};
