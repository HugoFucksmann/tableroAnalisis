import React, { useEffect, useCallback, useRef, useState } from 'react';
import { useGameStore } from '../../../store/useGameStore';
import { useShallow } from 'zustand/react/shallow';
import { backendService } from '../../../services/backendService';
import { analysisBridge } from '../../../services/analysisBridge';
import { lichessExplorerService } from '../../../services/lichessExplorerService';

import { ExplorerHeader } from './ExplorerHeader';
import { ExplorerNav } from './ExplorerNav';
import { MoveInsightCard } from './MoveInsightCard';
import { MoveSection } from './MoveSection';

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
    setHoveredExplorerMove,
    mastersData,
    setMastersData,
    playerColor,
    setPlayerColor,
    setBoardOrientation,
    searchUsername,
    setPlayers,
    lichessToken,
    setOpeningName,
    setEcoCode,
    openingName,
    ecoCode,
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
    setHoveredExplorerMove: state.setHoveredExplorerMove,
    mastersData: state.mastersData,
    setMastersData: state.setMastersData,
    playerColor: state.playerColor,
    setPlayerColor: state.setPlayerColor,
    setBoardOrientation: state.setBoardOrientation,
    searchUsername: state.searchUsername,
    setPlayers: state.setPlayers,
    lichessToken: state.lichessToken,
    setOpeningName: state.setOpeningName,
    setEcoCode: state.setEcoCode,
    openingName: state.openingName,
    ecoCode: state.ecoCode,
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
  const containerRef = useRef(null);

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
  }, [fen, currentMoveIndex, explorerData, history]);

  const updatePlayerNames = useCallback((color) => {
    const name = searchUsername || 'Mi Usuario';
    if (color === 'white') {
      setPlayers(name, 'Oponente');
    } else {
      setPlayers('Oponente', name);
    }
  }, [searchUsername, setPlayers]);

  const handleSetColor = useCallback((color) => {
    if (playerColor === color) return;
    setPlayerColor(color);
    setBoardOrientation(color);
    updatePlayerNames(color);
  }, [playerColor, setPlayerColor, setBoardOrientation, updatePlayerNames]);

  useEffect(() => {
    updatePlayerNames(playerColor);
  }, [updatePlayerNames, playerColor]);

  const fetchExplorerData = useCallback(async () => {
    if (loadingTimerRef.current) clearTimeout(loadingTimerRef.current);
    setLoading(true);
    setIsStale(true);

    // Esperar a que el backend esté conectado si no lo está (max 5s)
    await new Promise(resolve => {
      let attempts = 0;
      const check = setInterval(() => {
        if (backendService.isConnected || attempts >= 50) {
          clearInterval(check);
          resolve();
        }
        attempts++;
      }, 100);
    });

    loadingTimerRef.current = setTimeout(() => {
      setLoading(false);
      setIsStale(false);
    }, 10000);

    const cleanFen = fen.trim().split(' ').slice(0, 4).join(' ');
    const requestId = Math.random().toString(36).substring(7);
    backendService.getMoveExplorer(cleanFen, requestId);
  }, [fen]);

  const fetchMastersData = useCallback(async () => {
    const cleanFen = fen.trim().split(' ').slice(0, 4).join(' ');
    setLoadingMasters(true);
    try {
      const data = await lichessExplorerService.fetchMastersData(fen, lichessToken);


      if (data.opening) {
        setOpeningName(data.opening.name);
        setEcoCode(data.opening.eco);
      }

      setMastersData((data.moves || []).map(m => {
        const total = m.white + m.draws + m.black || 1;
        return {
          san: m.san,
          count: total,
          white: Math.round((m.white / total) * 100),
          draws: Math.round((m.draws / total) * 100),
          black: Math.round((m.black / total) * 100),
        };
      }));
    } catch (error) {
      console.error('Error fetching masters data:', error);
      setMastersData([]);
    } finally {
      setLoadingMasters(false);
    }
  }, [fen, setMastersData, lichessToken, setOpeningName, setEcoCode]);

  useEffect(() => {
    return () => {
      analysisBridge.cancel();
    };
  }, []);

  useEffect(() => {
    const currentCleanFen = fen.trim().split(' ').slice(0, 4).join(' ');
    fetchExplorerData();
    fetchMastersData();

    const removeHandler = backendService.addHandler((msg) => {
      if (msg.type === 'move_explorer_data') {
        const msgCleanFen = msg.fen?.trim().split(' ').slice(0, 4).join(' ');
        if (msgCleanFen === currentCleanFen) {
          if (loadingTimerRef.current) clearTimeout(loadingTimerRef.current);
          setExplorerData(msg);
          setLoading(false);
          setIsStale(false);
        }
      }
    });

    return () => {
      if (loadingTimerRef.current) clearTimeout(loadingTimerRef.current);
      removeHandler();
      setHoveredExplorerMove(null);
    };
  }, [fen, fetchExplorerData, fetchMastersData, setExplorerData, setHoveredExplorerMove]);

  const handleMoveClick = (san) => {
    makeMove(san);
  };

  const isWhiteTurn = fen.split(' ')[1] === 'w';
  const isUserTurn = (playerColor === 'white' && isWhiteTurn) || (playerColor === 'black' && !isWhiteTurn);
  const perspectiveData = playerColor === 'white' ? explorerData?.whitePerspective : explorerData?.blackPerspective;
  const userMoves = perspectiveData?.userMoves || [];
  const opponentMoves = perspectiveData?.opponentMoves || [];

  const handleWheel = useCallback((e) => {
    if (e.target.closest('.premium-scroll')) return;
    e.preventDefault();
    const now = Date.now();
    if (now - lastScrollTime.current < 200) return;

    if (e.deltaY > 0) {
      if (currentMoveIndex < history.length - 1) {
        goToMove(currentMoveIndex + 1);
        lastScrollTime.current = now;
      } else {
        const perspective = isWhiteTurn ? explorerData?.whitePerspective : explorerData?.blackPerspective;
        const allMoves = [...(perspective?.userMoves || []), ...(perspective?.opponentMoves || [])];
        if (allMoves.length > 0) {
          makeMove(allMoves[0].san);
          lastScrollTime.current = now;
        }
      }
    } else if (e.deltaY < 0) {
      if (currentMoveIndex > -1) {
        goToMove(currentMoveIndex - 1);
        lastScrollTime.current = now;
      }
    }
  }, [currentMoveIndex, history, goToMove, makeMove, explorerData, isWhiteTurn]);

  const handleWheelRef = useRef(handleWheel);
  useEffect(() => {
    handleWheelRef.current = handleWheel;
  }, [handleWheel]);

  // Register wheel listener as non-passive so preventDefault() works.
  // React's onWheel prop registers passive listeners since React 17,
  // which silently ignores preventDefault() and logs a browser warning.
  // We use handleWheelRef to avoid tearing down the listener on every move.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const listener = (e) => {
      if (handleWheelRef.current) {
        handleWheelRef.current(e);
      }
    };
    el.addEventListener('wheel', listener, { passive: false });
    return () => el.removeEventListener('wheel', listener);
  }, []);

  return (
    <div ref={containerRef} className="move-explorer-view">
      <ExplorerHeader
        ecoCode={ecoCode}
        openingName={openingName}
        currentMoveIndex={currentMoveIndex}
        playerColor={playerColor}
        handleSetColor={handleSetColor}
      />

      <ExplorerNav
        currentMoveIndex={currentMoveIndex}
        historyLength={history.length}
        goToMove={goToMove}
      />

      <div className={`explorer-content premium-scroll ${isStale ? 'stale-overlay' : ''}`}>
        <MoveInsightCard stats={lastMoveStats} />

        <div className="explorer-grids">
          <MoveSection
            moves={isUserTurn ? userMoves : opponentMoves}
            title={isUserTurn ? `Mis Jugadas (${playerColor === 'white' ? 'W' : 'B'})` : 'Jugadas Rival'}
            isLoading={loading}
            onMoveClick={handleMoveClick}
            setHoveredExplorerMove={setHoveredExplorerMove}
          />


          <MoveSection
            moves={mastersData}
            title="Maestros (Lichess)"
            isMaster={true}
            isLoading={loadingMasters}
            onMoveClick={handleMoveClick}
            setHoveredExplorerMove={setHoveredExplorerMove}
          />
        </div>
      </div>
    </div>
  );
};
