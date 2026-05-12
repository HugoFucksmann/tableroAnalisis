import React, { useEffect, useCallback, useRef, useState } from 'react';
import { useGameStore } from '../../store/useGameStore';
import { useShallow } from 'zustand/react/shallow';
import { backendService } from '../../services/backendService';
import {
  BarChart2, User, Users, ChevronLeft, ChevronRight,
  ChevronsLeft, ChevronsRight, Loader2, Award, Cpu, X
} from 'lucide-react';
import { analysisBridge } from '../../services/analysisBridge';
import { EVAL_CONFIG } from '../../constants/chessConstants.jsx';
import './MoveExplorerView.css';

// Fallback config para etiquetas especiales del extractor de errores
const SPECIAL_LABELS = {
  'Insta-move Blunder': { color: '#f44336', label: 'IB' },
  'Deep-think Blunder': { color: '#b71c1c', label: 'DB' },
  'Time Pressure Error': { color: '#ff5722', label: 'TP' }
};

export const MoveExplorerView = ({ onBack }) => {
  const {
    fen,
    explorerData,
    setExplorerData,
    makeMove,
    history,
    currentMoveIndex,
    goToMove,
    gameHeaders,
    setHoveredExplorerMove,
    mastersData,
    setMastersData,
    playerColor,
    setPlayerColor,
    setBoardOrientation,
    searchUsername,
    setPlayers,
    lichessToken,
    isAnalyzing,
    setOpeningName,
    setEcoCode,
    openingName,
    ecoCode,
    setEvaluation,
    setBestMoveForIndex,
    setAlternativeLinesForIndex,
    setAnalyzing,
    explorerAnalysisEnabled,
    setExplorerAnalysisEnabled,
    evaluationHistory,
    moveEvaluations
  } = useGameStore(useShallow(state => ({
    fen: state.fen,
    explorerData: state.explorerData,
    setExplorerData: state.setExplorerData,
    makeMove: state.makeMove,
    history: state.history,
    currentMoveIndex: state.currentMoveIndex,
    goToMove: state.goToMove,
    gameHeaders: state.gameHeaders,
    setHoveredExplorerMove: state.setHoveredExplorerMove,
    mastersData: state.mastersData,
    setMastersData: state.setMastersData,
    playerColor: state.playerColor,
    setPlayerColor: state.setPlayerColor,
    setBoardOrientation: state.setBoardOrientation,
    searchUsername: state.searchUsername,
    setPlayers: state.setPlayers,
    lichessToken: state.lichessToken,
    isAnalyzing: state.isAnalyzing,
    setOpeningName: state.setOpeningName,
    setEcoCode: state.setEcoCode,
    openingName: state.openingName,
    ecoCode: state.ecoCode,
    setEvaluation: state.setEvaluation,
    setBestMoveForIndex: state.setBestMoveForIndex,
    setAlternativeLinesForIndex: state.setAlternativeLinesForIndex,
    setAnalyzing: state.setAnalyzing,
    explorerAnalysisEnabled: state.explorerAnalysisEnabled,
    setExplorerAnalysisEnabled: state.setExplorerAnalysisEnabled,
    evaluationHistory: state.evaluationHistory,
    moveEvaluations: state.moveEvaluations
  })));

  const currentEval = evaluationHistory[currentMoveIndex];

  const [loading, setLoading] = useState(false);
  const [isStale, setIsStale] = useState(false);
  const [loadingMasters, setLoadingMasters] = useState(false);
  const [lastMoveStats, setLastMoveStats] = useState(null);
  const lastScrollTime = useRef(0);
  const loadingTimerRef = useRef(null);

  // ─── Capturar estadísticas del movimiento realizado ─────────────────────────
  useEffect(() => {
    if (history.length > 0 && currentMoveIndex >= 0) {
      const lastMove = history[currentMoveIndex];
      const perspective = lastMove.color === 'w' ? explorerData?.whitePerspective : explorerData?.blackPerspective;
      const stats = perspective?.userMoves?.find(m => m.san === lastMove.san) || 
                    perspective?.opponentMoves?.find(m => m.san === lastMove.san);
      
      if (stats) {
        setLastMoveStats({ ...stats, color: lastMove.color });
      }
    }
  }, [fen, currentMoveIndex, explorerData]);

  // ─── Helpers ────────────────────────────────────────────────────────────────

  const renderSan = (san) => {
    const pieceIcons = {
      'N': '♘', 'B': '♗', 'R': '♖', 'Q': '♕', 'K': '♔'
    };
    const firstChar = san[0];
    if (pieceIcons[firstChar]) {
      return (
        <>
          <span className="piece-icon-not">{pieceIcons[firstChar]}</span>
          {san.substring(1)}
        </>
      );
    }
    return san;
  };

  const MoveInsightCard = ({ stats }) => {
    if (!stats) return null;

    const totalGames = stats.count;
    const labels = stats.labels || {};
    
    // Obtener las 3 valoraciones más frecuentes
    const topLabels = Object.entries(labels)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    return (
      <div className="move-insight-card">
        <div className="insight-header">
          <div className="insight-san-box">
            <span className="insight-label">Análisis de la última jugada</span>
            <span className="insight-san">{renderSan(stats.san)}</span>
          </div>
          <div className="insight-summary">
            <div className="insight-stat">
              <span className="val">{totalGames}</span>
              <span className="lbl">Partidas</span>
            </div>
            <div className="insight-stat">
              <span className={`val ${parseFloat(stats.avgEval) > 0 ? 'pos' : 'neg'}`}>
                {stats.avgEval > 0 ? '+' : ''}{stats.avgEval || '0.0'}
              </span>
              <span className="lbl">Eval. Media</span>
            </div>
          </div>
        </div>

        <div className="insight-history-compact">
          {topLabels.length > 0 ? (
            <div className="top-valuations">
              {topLabels.map(([label, count]) => {
                const config = EVAL_CONFIG[label] || SPECIAL_LABELS[label];
                return (
                  <div key={label} className="valuation-pill-large" style={{ backgroundColor: config?.bg || 'rgba(255,255,255,0.05)' }}>
                    <span className="v-icon" style={{ color: config?.color }}>{config?.icon || '?'}</span>
                    <span className="v-count">{count}</span>
                    <span className="v-label">{label}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="no-errors-msg">
              <span className="v-icon" style={{ color: '#4caf50' }}>✓</span>
              Sin errores registrados en esta posición
            </div>
          )}
        </div>
      </div>
    );
  };

  const updatePlayerNames = useCallback((color) => {
    const name = searchUsername || 'Mi Usuario';
    if (color === 'white') {
      setPlayers(name, 'Oponente');
    } else {
      setPlayers('Oponente', name);
    }
  }, [searchUsername, setPlayers]);

  // BUG #1 CORREGIDO: handleSetColor establece un color específico en lugar
  // de alternar. Ambos botones ya no comparten el mismo handler ciego.
  const handleSetColor = useCallback((color) => {
    if (playerColor === color) return; // ya activo, no hacer nada
    setPlayerColor(color);
    setBoardOrientation(color);
    updatePlayerNames(color);
  }, [playerColor, setPlayerColor, setBoardOrientation, updatePlayerNames]);

  // Asegurar nombres correctos al montar
  useEffect(() => {
    updatePlayerNames(playerColor);
  }, [updatePlayerNames, playerColor]);

  // ─── Fetch de datos personales ───────────────────────────────────────────────

  const fetchExplorerData = useCallback(() => {
    // Cancelar cualquier timer anterior antes de iniciar nueva carga
    if (loadingTimerRef.current) clearTimeout(loadingTimerRef.current);

    setLoading(true);
    setIsStale(true);
    // Ya no hacemos setExplorerData(null) para evitar flickering.
    // El usuario verá los datos anteriores con un estilo "stale" hasta que lleguen los nuevos.

    const cleanFen = fen.trim().split(' ').slice(0, 4).join(' ');
    const requestId = Math.random().toString(36).substring(7);
    backendService.getMoveExplorer(cleanFen, requestId);

    // BUG #2 CORREGIDO: timeout de seguridad para que el spinner no quede
    // infinito si el backend no responde o el FEN no matchea ningún mensaje.
    loadingTimerRef.current = setTimeout(() => {
      setLoading(false);
      setIsStale(false);
    }, 10000);
  }, [fen, setExplorerData]);

  // ─── Fetch de datos de Maestros (Lichess) ────────────────────────────────────

  const fetchMastersData = useCallback(async () => {
    const cleanFen = fen.trim().split(' ').slice(0, 4).join(' ');
    setLoadingMasters(true);
    try {
      const headers = {};
      if (lichessToken) {
        headers['Authorization'] = `Bearer ${lichessToken}`;
      }

      const response = await fetch(
        `https://explorer.lichess.ovh/masters?fen=${encodeURIComponent(cleanFen)}`,
        { headers }
      );
      if (!response.ok) {
        if (response.status === 401) console.error('Lichess 401: Token inválido o expirado');
        throw new Error(`API Error: ${response.status}`);
      }
      const data = await response.json();
      
      // Identificación dinámica de aperturas
      if (data.opening) {
        setOpeningName(data.opening.name);
        setEcoCode(data.opening.eco);
      }

      setMastersData(
        (data.moves || []).map(m => {
          const total = m.white + m.draws + m.black || 1;
          return {
            san: m.san,
            count: total,
            white: Math.round((m.white / total) * 100),
            draws: Math.round((m.draws / total) * 100),
            black: Math.round((m.black / total) * 100),
          };
        })
      );
    } catch (error) {
      console.error('Error fetching masters data:', error);
      setMastersData([]);
    } finally {
      setLoadingMasters(false);
    }
  }, [fen, setMastersData, lichessToken, setOpeningName, setEcoCode]);

  const handleQuickAnalysis = useCallback(() => {
    const newValue = !explorerAnalysisEnabled;
    setExplorerAnalysisEnabled(newValue);
    
    if (!newValue) {
      analysisBridge.cancel();
    }
  }, [explorerAnalysisEnabled, setExplorerAnalysisEnabled]);

  // ─── Effect principal: dispara fetches y escucha respuesta WS ───────────────

  // Limpiar análisis al salir
  useEffect(() => {
    return () => {
      setExplorerAnalysisEnabled(false);
      analysisBridge.cancel();
    };
  }, [setExplorerAnalysisEnabled]);

  // BUG #4 CORREGIDO: el efecto captura el FEN limpio una sola vez y lo usa
  // tanto para disparar los fetches como para comparar con la respuesta del
  // backend, eliminando la doble computación y el riesgo de closure stale.
  useEffect(() => {
    const currentCleanFen = fen.trim().split(' ').slice(0, 4).join(' ');

    fetchExplorerData();
    fetchMastersData();

    const removeHandler = backendService.addHandler((msg) => {
      if (msg.type === 'move_explorer_data') {
        const msgCleanFen = msg.fen?.trim().split(' ').slice(0, 4).join(' ');
        if (msgCleanFen === currentCleanFen) {
          // Cancelar el timer de fallback porque llegaron datos reales
          if (loadingTimerRef.current) clearTimeout(loadingTimerRef.current);
          setExplorerData(msg);
          setLoading(false);
          setIsStale(false);
        }
      }
    });

    return () => {
      // Limpiar timer si el componente se desmonta o cambia el FEN
      if (loadingTimerRef.current) clearTimeout(loadingTimerRef.current);
      removeHandler();
      setHoveredExplorerMove(null);
    };
    // fetchExplorerData y fetchMastersData son estables gracias a useCallback
    // con [fen] como dependencia, por lo que este effect se re-ejecuta
    // exactamente cuando cambia fen.
  }, [fen, fetchExplorerData, fetchMastersData, setExplorerData, setHoveredExplorerMove]);



  const handleMoveClick = (san) => {
    makeMove(san);
  };

  // ─── Renderizado de sección de movimientos ───────────────────────────────────

  const renderMoveSection = (moves, title, isMaster = false, isLoading = false) => (
    <section className="explorer-section">
      <div className="section-header">
        <span>{title}</span>
        {isLoading && <Loader2 className="gi-spin" size={10} />}
      </div>
      <div className="moves-list">
        {moves?.length > 0 ? (
          moves.slice(0, 15).map((move) => (
            <div
              key={move.san}
              className="move-row"
              onClick={() => handleMoveClick(move.san)}
              onMouseEnter={() => setHoveredExplorerMove(move.san)}
              onMouseLeave={() => setHoveredExplorerMove(null)}
            >
              <div className="move-main-info">
                <div className="move-san-group">
                  <span className="move-san">{renderSan(move.san)}</span>
                </div>

                <div className="move-stats-row">
                  <div className="win-rate-bar-compact">
                    <div className="bar-seg w" style={{ width: `${isMaster ? move.white : move.winRate}%` }} />
                    <div className="bar-seg d" style={{ width: `${isMaster ? move.draws : move.drawRate}%` }} />
                    <div className="bar-seg l" style={{ width: `${isMaster ? move.black : move.lossRate}%` }} />
                  </div>
                  <span className="wr-val">
                    {isMaster ? `${move.white}%` : `${move.winRate}%`}
                  </span>
                  {!isMaster && move.avgEval != null && (
                    <span className={`eval-mini ${parseFloat(move.avgEval) > 0 ? 'pos' : 'neg'}`}>
                      {parseFloat(move.avgEval) > 0 ? '+' : ''}{move.avgEval}
                    </span>
                  )}
                </div>
              </div>

              <div className="move-right-area">
                <span className="count-number">
                  {move.count >= 1000 ? `${(move.count / 1000).toFixed(1)}k` : move.count}
                </span>
              </div>
            </div>
          ))
        ) : (
          <div className="explorer-placeholder">
            <span>{isLoading ? 'Cargando datos...' : 'No hay registros'}</span>
          </div>
        )}
      </div>
    </section>
  );

  // ─── Derivar datos según perspectiva activa y turno ─────────────────────────
  const isWhiteTurn = fen.split(' ')[1] === 'w';
  const isUserTurn = (playerColor === 'white' && isWhiteTurn) || (playerColor === 'black' && !isWhiteTurn);

  const perspectiveData = playerColor === 'white'
    ? explorerData?.whitePerspective
    : explorerData?.blackPerspective;

  const userMoves = perspectiveData?.userMoves || [];
  const opponentMoves = perspectiveData?.opponentMoves || [];

  const handleWheel = useCallback((e) => {
    // Si el mouse está sobre la lista de movimientos (premium-scroll), permitimos el scroll normal de la lista
    if (e.target.closest('.premium-scroll')) return;
    
    e.preventDefault();
    const now = Date.now();
    if (now - lastScrollTime.current < 200) return;

    if (e.deltaY > 0) {
      // Intentar ir al siguiente movimiento en la historia
      if (currentMoveIndex < history.length - 1) {
        goToMove(currentMoveIndex + 1);
        lastScrollTime.current = now;
      } 
      // Si estamos al final de la historia, jugar la línea principal del explorador
      else {
        const perspective = isWhiteTurn ? explorerData?.whitePerspective : explorerData?.blackPerspective;
        const allMoves = [...(perspective?.userMoves || []), ...(perspective?.opponentMoves || [])];
        if (allMoves.length > 0) {
          // El primer movimiento de la lista ya está ordenado por 'count' (línea principal)
          const mainMove = allMoves[0];
          makeMove(mainMove.san);
          lastScrollTime.current = now;
        }
      }
    } else if (e.deltaY < 0) {
      // Retroceder en la historia
      if (currentMoveIndex > -1) {
        goToMove(currentMoveIndex - 1);
        lastScrollTime.current = now;
      }
    }
  }, [currentMoveIndex, history, goToMove, makeMove, explorerData, isWhiteTurn]);

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="move-explorer-view" onWheel={handleWheel}>
      <header className="explorer-header">
        <div className="header-top">
          <div className="explorer-title-area">
            <div className="explorer-title">
              <BarChart2 size={16} className="text-accent" />
              Explorador
            </div>
            <div className="opening-info-compact">
              <span className="eco-badge">{ecoCode || '---'}</span>
              <span className="opening-name" title={openingName || 'Posición personalizada'}>
                {openingName || 'Sin apertura definida'}
              </span>
              {explorerAnalysisEnabled && (
                <div className="live-eval-group">
                  <div className={`live-eval-badge ${currentEval?.score > 0 ? 'pos' : 'neg'}`}>
                    {currentEval ? (
                      `${currentEval.score > 0 ? '+' : ''}${currentEval.score}`
                    ) : '...'}
                  </div>
                  {moveEvaluations[currentMoveIndex] && (
                    <div 
                      className="current-move-valuation"
                      style={{ color: EVAL_CONFIG[moveEvaluations[currentMoveIndex].label]?.color || '#fff' }}
                      title={moveEvaluations[currentMoveIndex].label}
                    >
                      {EVAL_CONFIG[moveEvaluations[currentMoveIndex].label]?.icon || '?'}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="header-actions">
            <div className="perspective-toggle">
              <button
                className={`toggle-btn ${playerColor === 'white' ? 'active' : ''}`}
                onClick={() => handleSetColor('white')}
                title="Ver como Blancas"
              >
                W
              </button>
              <button
                className={`toggle-btn ${playerColor === 'black' ? 'active' : ''}`}
                onClick={() => handleSetColor('black')}
                title="Ver como Negras"
              >
                B
              </button>
            </div>
            <button 
              className={`explorer-action-btn ${explorerAnalysisEnabled ? 'analyzing' : ''}`}
              onClick={handleQuickAnalysis}
              title={explorerAnalysisEnabled ? "Desactivar análisis en vivo" : "Activar análisis en vivo"}
            >
              <Cpu size={14} />
            </button>
          </div>
        </div>
      </header>

      <nav className="explorer-nav">
        <button
          className="nav-btn"
          onClick={() => goToMove(-1)}
          disabled={currentMoveIndex === -1}
          title="Inicio"
        >
          <ChevronsLeft size={14} />
        </button>
        <button
          className="nav-btn"
          onClick={() => goToMove(currentMoveIndex - 1)}
          disabled={currentMoveIndex === -1}
          title="Anterior"
        >
          <ChevronLeft size={14} />
        </button>
        <button
          className="nav-btn"
          onClick={() => goToMove(currentMoveIndex + 1)}
          disabled={currentMoveIndex >= history.length - 1}
          title="Siguiente"
        >
          <ChevronRight size={14} />
        </button>
        <button
          className="nav-btn"
          onClick={() => goToMove(history.length - 1)}
          disabled={currentMoveIndex >= history.length - 1}
          title="Final"
        >
          <ChevronsRight size={14} />
        </button>

        <div className="move-count-info">
          Jugada: <strong>{currentMoveIndex + 1}</strong> / {history.length}
        </div>
      </nav>

      <div className={`explorer-content premium-scroll ${isStale ? 'stale-overlay' : ''}`}>
        <MoveInsightCard stats={lastMoveStats} />
        
        {/* BUG #3 CORREGIDO: .explorer-grids ahora tiene estilos en el CSS */}
        <div className="explorer-grids">
          {isUserTurn ? (
            renderMoveSection(
              userMoves,
              `Mis Jugadas (${playerColor === 'white' ? 'W' : 'B'})`,
              false,
              loading
            )
          ) : (
            renderMoveSection(
              opponentMoves,
              'Jugadas Rival',
              false,
              loading
            )
          )}
          
          <div className="explorer-divider-soft" />

          {renderMoveSection(
            mastersData,
            'Maestros (Lichess)',
            true,
            loadingMasters
          )}
        </div>
      </div>
    </div>
  );
};