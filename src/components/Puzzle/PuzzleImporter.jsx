import React, { useReducer, useEffect } from 'react';
import { backendService } from '../../services/backendService';
import { useGameStore } from '../../store/useGameStore';
import { useShallow } from 'zustand/react/shallow';
import { fetchLichessGames, fetchChesscomGames } from '../../services/gameApi';
import { Search, Loader, AlertCircle, ArrowLeft, Check, Target, CheckSquare, Square, User, CalendarDays } from 'lucide-react';
import './Puzzle.css';

const initialLocalState = { isFetching: false, error: '', localUsername: '', localPlatform: 'lichess', extractionStatus: null };

function importerReducer(state, action) {
  switch (action.type) {
    case 'SET_USERNAME': return { ...state, localUsername: action.payload };
    case 'SET_PLATFORM': return { ...state, localPlatform: action.payload };
    case 'FETCH_START': return { ...state, isFetching: true, error: '' };
    case 'FETCH_SUCCESS': return { ...state, isFetching: false };
    case 'FETCH_ERROR': return { ...state, isFetching: false, error: action.payload };
    case 'EXTRACTION_STARTED': return { ...state, extractionStatus: { current: 0, total: action.totalGames, extracted: 0 } };
    case 'EXTRACTION_PROGRESS': return { ...state, extractionStatus: { ...state.extractionStatus, current: action.gameIndex + 1, extracted: action.totalExtracted } };
    case 'EXTRACTION_DONE': return { ...state, extractionStatus: null };
    case 'EXTRACTION_CANCELING': return { ...state, extractionStatus: { ...state.extractionStatus, canceling: true } };
    case 'SET_ERROR': return { ...state, error: action.payload };
    default: return state;
  }
}

export const PuzzleImporter = ({ onBack }) => {
  const {
    username, platform, games, lichessToken, selectedGameIds,
    setSearchUsername, setSearchPlatform, setImportedGames, setPagination, resetGames,
    toggleGameSelection, selectAllGames, clearSelection, engineConfig
  } = useGameStore(useShallow(state => ({
    username: state.searchUsername, platform: state.searchPlatform, games: state.importedGames,
    lichessToken: state.lichessToken, selectedGameIds: state.selectedGameIds,
    setSearchUsername: state.setSearchUsername, setSearchPlatform: state.setSearchPlatform,
    setImportedGames: state.setImportedGames, setPagination: state.setPagination, resetGames: state.resetGames,
    toggleGameSelection: state.toggleGameSelection, selectAllGames: state.selectAllGames, clearSelection: state.clearSelection,
    engineConfig: state.engineConfig
  })));

  const [local, dispatch] = useReducer(importerReducer, { ...initialLocalState, localUsername: username, localPlatform: platform });
  const { isFetching, error, localUsername, localPlatform, extractionStatus } = local;

  useEffect(() => {
    const removeHandler = backendService.addHandler((msg) => {
      if (msg.type === 'puzzle_extraction_started') dispatch({ type: 'EXTRACTION_STARTED', totalGames: msg.totalGames });
      else if (msg.type === 'puzzle_game_done') dispatch({ type: 'EXTRACTION_PROGRESS', gameIndex: msg.gameIndex, totalExtracted: msg.totalExtracted });
      else if (msg.type === 'puzzle_extraction_complete' || msg.type === 'extraction_cancelled' || msg.type === 'error') {
        alert(msg.type === 'error' ? `Error: ${msg.message}` : `Proceso terminado. Puzzles extraídos: ${msg.totalExtracted}`);
        dispatch({ type: 'EXTRACTION_DONE' });
        clearSelection();
        if (msg.type !== 'error') onBack();
      }
    });
    return () => removeHandler();
  }, [clearSelection, onBack]);

  const handleSearch = async () => {
    if (!localUsername.trim()) return;
    dispatch({ type: 'FETCH_START' });
    resetGames();
    setSearchUsername(localUsername);
    setSearchPlatform(localPlatform);
    try {
      const fetcher = localPlatform === 'lichess' ? fetchLichessGames(localUsername.trim(), 20, null, lichessToken) : fetchChesscomGames(localUsername.trim(), 20, null);
      const result = await fetcher;
      setImportedGames(result.games);
      setPagination({ lastTimestamp: result.lastTimestamp ?? null, chesscomPagination: result.pagination ?? null, hasMoreGames: result.hasMore });
      if (result.games.length === 0) dispatch({ type: 'SET_ERROR', payload: 'No se encontraron partidas.' });
      else dispatch({ type: 'FETCH_SUCCESS' });
    } catch (err) { dispatch({ type: 'FETCH_ERROR', payload: err.message }); }
  };

  const handleStartExtraction = () => {
    const selectedSet = new Set(selectedGameIds);
    const selectedGames = games.reduce((acc, g) => {
      if (selectedSet.has(g.id)) acc.push({ pgn: g.pgn, gameId: g.id });
      return acc;
    }, []);
    if (selectedGames.length > 0) backendService.extractPuzzles(selectedGames, engineConfig);
  };

  const allSelected = games.length > 0 && selectedGameIds.length === games.length;

  return (
    <div className="puzzle-container glass-panel">
      <div className="puzzle-header">
        <button className="back-btn" onClick={onBack}>
          <ArrowLeft size={16} /> Volver
        </button>
        <h2>Extraer Puzzles</h2>
      </div>

      {!extractionStatus ? (
        <div className="importer-content">
          <div className="pi-top-controls">

            {/* ROW OPTIMIZADA: TABS + BUSCADOR */}
            <div className="pi-search-row">
              <div className="pi-tabs">
                <button className={localPlatform === 'lichess' ? 'active' : ''} onClick={() => dispatch({ type: 'SET_PLATFORM', payload: 'lichess' })}>
                  Lichess
                </button>
                <button className={localPlatform === 'chesscom' ? 'active' : ''} onClick={() => dispatch({ type: 'SET_PLATFORM', payload: 'chesscom' })}>
                  Chess.com
                </button>
              </div>

              <div className="pi-search-box">
                <div className="pi-input-wrapper">
                  <User size={16} className="pi-input-icon" />
                  <input
                    type="text"
                    value={localUsername}
                    onChange={e => dispatch({ type: 'SET_USERNAME', payload: e.target.value })}
                    placeholder="Nombre de usuario…"
                    onKeyDown={e => e.key === 'Enter' && handleSearch()}
                  />
                </div>
                <button className="ph-btn secondary" onClick={handleSearch} disabled={isFetching}>
                  {isFetching ? <Loader size={16} className="spin" /> : <Search size={16} />}
                </button>
                <button
                  className="ph-btn primary"
                  onClick={handleStartExtraction}
                  disabled={selectedGameIds.length === 0}
                  title="Extraer de partidas seleccionadas"
                >
                  <Target size={16} />
                  <span>Extraer</span>
                </button>
              </div>
            </div>

            {error && (
              <div className="pi-error-box glass-panel">
                <AlertCircle size={16} /> {error}
              </div>
            )}
          </div>

          {games.length > 0 && (
            <div className="pi-list-container">
              <div className="pi-list-header">
                <span className="pi-count">{games.length} partidas encontradas</span>
                <button className="pi-select-all" onClick={() => allSelected ? clearSelection() : selectAllGames()}>
                  {allSelected ? <CheckSquare size={16} /> : <Square size={16} />}
                  {allSelected ? 'Desmarcar todas' : 'Seleccionar todas'}
                </button>
              </div>

              <div className="pi-grid premium-scroll">
                {games.map(game => {
                  const isSelected = selectedGameIds.includes(game.id);
                  return (
                    <div
                      key={game.id}
                      className={`pi-card glass-panel ${isSelected ? 'selected' : ''}`}
                      role="button"
                      tabIndex={0}
                      onClick={() => toggleGameSelection(game.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          toggleGameSelection(game.id);
                        }
                      }}
                    >
                      <div className="pi-card-content">
                        <span className="pi-players">{game.white} <span className="pi-vs">vs</span> {game.black}</span>
                        <div className="pi-date">
                          <CalendarDays size={12} /> {game.date}
                        </div>
                      </div>
                      <div className={`pi-checkbox ${isSelected ? 'checked' : ''}`}>
                        {isSelected && <Check size={14} />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="pi-progress-view">
          <Loader size={48} className="spin pi-progress-spinner" />
          <h3 className="pi-progress-title">Analizando Partidas</h3>
          <p className="pi-progress-text">{extractionStatus.current} de {extractionStatus.total}</p>
          <div className="pi-progress-stats glass-panel">
            Puzzles encontrados: <span>{extractionStatus.extracted}</span>
          </div>
          <button
            className="ph-btn danger"
            onClick={() => { dispatch({ type: 'EXTRACTION_CANCELING' }); backendService.cancelExtraction(); }}
            disabled={extractionStatus.canceling}
          >
            {extractionStatus.canceling ? 'Cancelando…' : 'Cancelar extracción'}
          </button>
        </div>
      )}
    </div>
  );
};