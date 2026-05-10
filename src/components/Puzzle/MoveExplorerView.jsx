import React, { useEffect, useCallback, useRef, useState } from 'react';
import { useGameStore } from '../../store/useGameStore';
import { useShallow } from 'zustand/react/shallow';
import { backendService } from '../../services/backendService';
import {
  BarChart2, User, Users, ChevronLeft, ChevronRight,
  ChevronsLeft, ChevronsRight, Loader2, Award
} from 'lucide-react';
import './MoveExplorerView.css';

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
    lichessToken
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
    lichessToken: state.lichessToken
  })));

  const [loading, setLoading] = useState(false);
  const [isStale, setIsStale] = useState(false);
  const [loadingMasters, setLoadingMasters] = useState(false);
  const lastScrollTime = useRef(0);
  const loadingTimerRef = useRef(null);

  // ─── Helpers ────────────────────────────────────────────────────────────────

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
      setMastersData(
        (data.moves || []).map(m => {
          const total = m.white + m.draws + m.black || 1; // evitar división por 0
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
  }, [fen, setMastersData, lichessToken]);

  // ─── Effect principal: dispara fetches y escucha respuesta WS ───────────────

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

  // ─── Navegación con rueda del ratón ─────────────────────────────────────────

  const handleWheel = (e) => {
    const now = performance.now();
    if (now - lastScrollTime.current < 80) return;

    if (e.deltaY > 0) {
      if (currentMoveIndex < history.length - 1) {
        goToMove(currentMoveIndex + 1);
        lastScrollTime.current = now;
      }
    } else if (e.deltaY < 0) {
      if (currentMoveIndex >= 0) {
        goToMove(currentMoveIndex - 1);
        lastScrollTime.current = now;
      }
    }
  };

  const handleMoveClick = (san) => {
    makeMove(san);
  };

  // ─── Renderizado de sección de movimientos ───────────────────────────────────

  const renderMoveSection = (moves, title, icon, isMaster = false, isLoading = false) => (
    <section className="explorer-section">
      <div className="section-header">
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {icon} {title}
        </span>
        {isLoading
          ? <Loader2 className="gi-spin" size={10} />
          : <span className="count-badge">{moves?.length || 0} jugadas</span>
        }
      </div>
      <div className="moves-list">
        {moves?.length > 0 ? (
          moves.slice(0, 10).map((move) => (
            <div
              key={move.san}
              className="move-row"
              onClick={() => handleMoveClick(move.san)}
              onMouseEnter={() => setHoveredExplorerMove(move.san)}
              onMouseLeave={() => setHoveredExplorerMove(null)}
            >
              <div className="move-san">{move.san}</div>

              <div className="move-stats-main">
                {/* BUG #3: move-wr-label, eval-text, eval-pos, eval-neg ahora
                    tienen estilos definidos en el CSS */}
                <div className="move-wr-label">
                  <span className="wr-text">
                    {isMaster
                      ? `W:${move.white}% D:${move.draws}% B:${move.black}%`
                      : `Win Rate: ${move.winRate}%`
                    }
                  </span>
                  {!isMaster && move.avgEval != null && (
                    <span className={`eval-text ${parseFloat(move.avgEval) > 0 ? 'eval-pos' : 'eval-neg'}`}>
                      {parseFloat(move.avgEval) > 0 ? '+' : ''}{move.avgEval}
                    </span>
                  )}
                </div>
                <div className="win-rate-bar">
                  <div className="bar-seg w" style={{ width: `${isMaster ? move.white : move.winRate}%` }} />
                  <div className="bar-seg d" style={{ width: `${isMaster ? move.draws : move.drawRate}%` }} />
                  <div className="bar-seg l" style={{ width: `${isMaster ? move.black : move.lossRate}%` }} />
                </div>
              </div>

              <div className="move-count-area">
                <span className="count-val">
                  {move.count >= 1000 ? `${(move.count / 1000).toFixed(1)}k` : move.count}
                </span>
                <span className="count-lbl">{isMaster ? 'Games' : 'Partidas'}</span>
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

  // ─── Derivar datos según perspectiva activa ──────────────────────────────────

  const perspectiveData = playerColor === 'white'
    ? explorerData?.whitePerspective
    : explorerData?.blackPerspective;

  const userMoves = perspectiveData?.userMoves || [];
  const opponentMoves = perspectiveData?.opponentMoves || [];

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="move-explorer-view" onWheel={handleWheel}>
      <header className="explorer-header">
        <div className="header-top">
          <div className="explorer-title">
            <BarChart2 size={16} className="text-accent" />
            Explorador de Movimientos
          </div>

          <div className="header-actions">
            {/* BUG #1 CORREGIDO: cada botón establece su propio color
                en lugar de alternar ciegamente */}
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
            <button className="explorer-close-btn" onClick={onBack}>
              <ChevronLeft size={13} style={{ marginRight: '4px' }} />
              Cerrar
            </button>
          </div>
        </div>

        <div className="opening-info">
          <div className="eco-badge">{gameHeaders?.ECO || '---'}</div>
          <div className="opening-name" title={gameHeaders?.Opening || 'Posición personalizada'}>
            {gameHeaders?.Opening || 'Sin apertura definida'}
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
        {/* BUG #3 CORREGIDO: .explorer-grids ahora tiene estilos en el CSS */}
        <div className="explorer-grids">
          {renderMoveSection(
            userMoves,
            `Mis Jugadas (${playerColor === 'white' ? 'W' : 'B'})`,
            <User size={12} />,
            false,
            loading
          )}
          {renderMoveSection(
            opponentMoves,
            'Jugadas Rival',
            <Users size={12} />,
            false,
            loading
          )}
          {renderMoveSection(
            mastersData,
            'Maestros (Lichess)',
            <Award size={12} />,
            true,
            loadingMasters
          )}
        </div>
      </div>
    </div>
  );
};