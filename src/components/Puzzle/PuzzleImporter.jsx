import React, { useReducer, useEffect } from 'react';
import { backendService } from '../../services/backendService';
import { useGameStore } from '../../store/useGameStore';
import { useShallow } from 'zustand/react/shallow';
import { fetchLichessGames, fetchChesscomGames } from '../../services/gameApi';
import { Search, Loader, AlertCircle, ChevronLeft, Check, Target, CheckSquare, Square } from 'lucide-react';
import './Puzzle.css';

/**
 * PuzzleImporter — consume el estado compartido del librarySlice.
 * Si el usuario ya buscó partidas en GameImport, aparecen aquí sin re-fetch.
 */

// ✅ FIX (use-reducer): los 5 useState locales originales se unifican en un
// reducer. Estado relacionado que cambia junto va junto — evita renders
// intermedios con estado inconsistente (ej: isFetching=false pero error aún vacío).
const initialLocalState = {
  isFetching: false,
  error: '',
  localUsername: '',     // se inicializa desde username del store en el componente
  localPlatform: 'lichess',
  extractionStatus: null,
};

function importerReducer(state, action) {
  switch (action.type) {
    case 'INIT':
      return { ...state, localUsername: action.username, localPlatform: action.platform };
    case 'SET_USERNAME':
      return { ...state, localUsername: action.payload };
    case 'SET_PLATFORM':
      return { ...state, localPlatform: action.payload };
    case 'FETCH_START':
      return { ...state, isFetching: true, error: '' };
    case 'FETCH_SUCCESS':
      return { ...state, isFetching: false };
    case 'FETCH_ERROR':
      return { ...state, isFetching: false, error: action.payload };
    case 'EXTRACTION_STARTED':
      return { ...state, extractionStatus: { current: 0, total: action.totalGames, extracted: 0 } };
    case 'EXTRACTION_PROGRESS':
      return {
        ...state,
        extractionStatus: {
          ...state.extractionStatus,
          current: action.gameIndex + 1,
          extracted: action.totalExtracted,
        },
      };
    case 'EXTRACTION_DONE':
      return { ...state, extractionStatus: null };
    case 'EXTRACTION_CANCELING':
      return { ...state, extractionStatus: { ...state.extractionStatus, canceling: true } };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    default:
      return state;
  }
}

export const PuzzleImporter = ({ onBack }) => {
  const {
    username, platform, games,
    lichessToken, selectedGameIds,
    setSearchUsername, setSearchPlatform,
    setImportedGames, setPagination, resetGames,
    toggleGameSelection, selectAllGames, clearSelection,
  } = useGameStore(useShallow(state => ({
    username: state.searchUsername,
    platform: state.searchPlatform,
    games: state.importedGames,
    lichessToken: state.lichessToken,
    selectedGameIds: state.selectedGameIds,
    setSearchUsername: state.setSearchUsername,
    setSearchPlatform: state.setSearchPlatform,
    setImportedGames: state.setImportedGames,
    setPagination: state.setPagination,
    resetGames: state.resetGames,
    toggleGameSelection: state.toggleGameSelection,
    selectAllGames: state.selectAllGames,
    clearSelection: state.clearSelection,
  })));

  const [local, dispatch] = useReducer(importerReducer, {
    ...initialLocalState,
    localUsername: username,
    localPlatform: platform,
  });

  const { isFetching, error, localUsername, localPlatform, extractionStatus } = local;

  // ── Backend handler ───────────────────────────────────────────────
  useEffect(() => {
    const removeHandler = backendService.addHandler((msg) => {
      if (msg.type === 'puzzle_extraction_started') {
        dispatch({ type: 'EXTRACTION_STARTED', totalGames: msg.totalGames });
      } else if (msg.type === 'puzzle_game_done') {
        dispatch({ type: 'EXTRACTION_PROGRESS', gameIndex: msg.gameIndex, totalExtracted: msg.totalExtracted });
      } else if (msg.type === 'puzzle_extraction_complete') {
        alert(`¡Extracción completada! Se añadieron ${msg.totalExtracted} puzzles.`);
        dispatch({ type: 'EXTRACTION_DONE' });
        clearSelection();
      } else if (msg.type === 'extraction_cancelled') {
        alert(`Extracción cancelada. Puzzles extraídos: ${msg.totalExtracted}`);
        dispatch({ type: 'EXTRACTION_DONE' });
        clearSelection();
      } else if (msg.type === 'error') {
        alert(`Error: ${msg.message}`);
        dispatch({ type: 'EXTRACTION_DONE' });
      }
    });
    return () => removeHandler();
  }, [clearSelection]);

  // ── Search ────────────────────────────────────────────────────────
  const handleSearch = async () => {
    if (!localUsername.trim()) return;
    dispatch({ type: 'FETCH_START' });
    resetGames();
    setSearchUsername(localUsername);
    setSearchPlatform(localPlatform);
    try {
      const fetcher = localPlatform === 'lichess'
        ? fetchLichessGames(localUsername.trim(), 20, null, lichessToken)
        : fetchChesscomGames(localUsername.trim(), 20, null);
      const result = await fetcher;
      setImportedGames(result.games);
      setPagination({
        lastTimestamp: result.lastTimestamp ?? null,
        chesscomPagination: result.pagination ?? null,
        hasMoreGames: result.hasMore,
      });
      if (result.games.length === 0) dispatch({ type: 'SET_ERROR', payload: 'No se encontraron partidas.' });
      else dispatch({ type: 'FETCH_SUCCESS' });
    } catch (err) {
      dispatch({ type: 'FETCH_ERROR', payload: err.message });
    }
  };

  // ── Extraction ────────────────────────────────────────────────────
  const handleStartExtraction = () => {
    const selectedSet = new Set(selectedGameIds);
    const selectedGames = games.reduce((acc, g) => {
      if (selectedSet.has(g.id)) {
        acc.push({ pgn: g.pgn, gameId: g.id });
      }
      return acc;
    }, []);
    if (selectedGames.length === 0) return;
    backendService.extractPuzzles(selectedGames, useGameStore.getState().engineConfig);
  };

  const allSelected = games.length > 0 && selectedGameIds.length === games.length;

  // ── Render ────────────────────────────────────────────────────────
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
              className={localPlatform === 'lichess' ? 'active' : ''}
              onClick={() => dispatch({ type: 'SET_PLATFORM', payload: 'lichess' })}
            >
              Lichess
            </button>
            <button
              className={localPlatform === 'chesscom' ? 'active' : ''}
              onClick={() => dispatch({ type: 'SET_PLATFORM', payload: 'chesscom' })}
            >
              Chess.com
            </button>
          </div>

          <div className="pi-search-bar">
            <input
              type="text"
              value={localUsername}
              onChange={e => dispatch({ type: 'SET_USERNAME', payload: e.target.value })}
              placeholder="Nombre de usuario…"
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
            />
            <button onClick={handleSearch} disabled={isFetching} title="Buscar Partidas">
              {isFetching ? <Loader size={14} className="spin" /> : <Search size={14} />}
            </button>
            <button
              className="pi-extract-icon-btn"
              onClick={handleStartExtraction}
              disabled={selectedGameIds.length === 0}
              title={`Extraer de ${selectedGameIds.length} seleccionadas`}
            >
              <Target size={14} />
            </button>
          </div>

          {error && <div className="pi-error"><AlertCircle size={14} /> {error}</div>}

          {games.length > 0 && (
            <div className="pi-list-header">
              <span className="pi-game-count">{games.length} partidas</span>
              <button
                className="pi-select-all-btn"
                onClick={() => allSelected ? clearSelection() : selectAllGames()}
              >
                {allSelected ? <CheckSquare size={13} /> : <Square size={13} />}
                {allSelected ? 'Ninguna' : 'Todas'}
              </button>
            </div>
          )}

          <div className="pi-game-list premium-scroll">
            {games.map(game => {
              const isSelected = selectedGameIds.includes(game.id);
              return (
                <div
                  key={game.id}
                  className={`pi-game-card ${isSelected ? 'selected' : ''}`}
                  onClick={() => toggleGameSelection(game.id)}
                >
                  <div className="pi-card-info">
                    <span className="pi-players">{game.white} vs {game.black}</span>
                    <span className="pi-date">{game.date}</span>
                  </div>
                  <div className="pi-card-check">
                    {isSelected ? <Check size={14} /> : <div className="dot" />}
                  </div>
                </div>
              );
            })}
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
          <p>Analizando partidas…</p>
          <div className="pi-stats">
            <span>Puzzles encontrados: <strong>{extractionStatus.extracted}</strong></span>
          </div>
          <button
            className="pi-cancel-btn"
            onClick={() => {
              dispatch({ type: 'EXTRACTION_CANCELING' });
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