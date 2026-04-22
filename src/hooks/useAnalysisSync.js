/**
 * useAnalysisSync.js  v3
 *
 * Cambios:
 *  - Un único efecto dispara analyzeGame() al cambiar gameId
 *  - Recibe onOpeningDetected y lo mapea al store
 *  - analysisReady se pone true en onComplete → Dashboard muestra el tablero
 *  - El efecto de análisis individual (posición sin evaluación) se mantiene
 *    para cuando el usuario mueve manualmente fuera del análisis guardado
 */
import React from 'react';
import { useGameStore } from '../store/useGameStore';
import { analysisQueue } from '../services/analysisQueue';

export const useAnalysisSync = () => {
  const {
    fen,
    game,
    history,
    currentMoveIndex,
    gameId,

    evaluationHistory,
    isAnalyzing,

    setAnalyzing,
    setAnalysisProgress,
    setAnalysisReady,
    setEvaluation,
    setMoveEvaluation,
    setBestMoveForIndex,
    setAlternativeLinesForIndex,
    setGameScore,

    // Apertura
    setEcoCode,
    setOpeningPly,
    setOpeningDetected,
    setOpeningName,
    setClocks,

    lichessToken,
  } = useGameStore();

  const lastGameId = React.useRef(null);
  const lastAnalyzedFen = React.useRef(null);

  // ── Efecto principal: análisis completo al cargar partida ────────────────────
  React.useEffect(() => {
    if (!gameId || gameId === lastGameId.current) return;
    if (history.length === 0) return;

    lastGameId.current = gameId;
    lastAnalyzedFen.current = null;

    const pgnHeaders = game?.header?.() ?? {};

    analysisQueue.analyzeGame(history, currentMoveIndex, {
      gameId,
      pgnHeaders,
      lichessToken,

      onStatus: (v) => setAnalyzing(v),
      onProgress: (pct, _msg) => setAnalysisProgress(pct),

      onOpeningDetected: ({ openingName, ecoCode, openingPly, bookPlies }) => {
        // Marcar todos los plies book ANTES de que Stockfish empiece
        bookPlies.forEach(ply => setMoveEvaluation(ply, 'Libro'));
        setOpeningName(openingName);
        setEcoCode(ecoCode);
        setOpeningPly(openingPly);
        setOpeningDetected(true);
      },

      onMoveResult: ({ index, score, label, bestMove, lines }) => {
        if (score !== undefined) setEvaluation(score, index);
        if (label) setMoveEvaluation(index, label);
        if (bestMove) setBestMoveForIndex(index, bestMove);
        if (lines?.length) setAlternativeLinesForIndex(index, lines);
      },

      onComplete: (accuracy) => {
        setGameScore(accuracy);
        setAnalysisReady(true);   // ← desbloquea la UI
        setAnalyzing(false);
      },
    });
  }, [gameId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Efecto secundario: posición sin evaluación al navegar ────────────────────
  // Útil cuando el usuario navega a un ply que aún no fue analizado
  // (raro si analyzeGame terminó, pero cubre el caso de movimientos manuales)
  React.useEffect(() => {
    const hasEval = evaluationHistory?.some(e => e.moveIndex === currentMoveIndex);
    const sameFen = lastAnalyzedFen.current === fen;

    if (hasEval || isAnalyzing || currentMoveIndex < -1 || sameFen) return;

    lastAnalyzedFen.current = fen;

    analysisQueue.analyzeCurrentPosition(fen, currentMoveIndex, {
      onStatus: (v) => setAnalyzing(v),
      onResult: (result) => {
        if (result.score !== undefined) setEvaluation(result.score, result.moveIndex);
        if (result.bestMove) setBestMoveForIndex(result.moveIndex, result.bestMove);
        if (result.lines?.length) setAlternativeLinesForIndex(result.moveIndex, result.lines);
      },
    });
  }, [fen, currentMoveIndex, evaluationHistory, isAnalyzing]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Efecto terciario: Sincronizar reloj desde comentarios PGN ────────────────
  React.useEffect(() => {
    if (history.length === 0) {
      setClocks(null, null);
      return;
    }
 
    let whiteTime = null;
    let blackTime = null;
 
    // Escaneamos hasta el movimiento actual para encontrar los últimos tiempos registrados
    for (let i = 0; i <= currentMoveIndex; i++) {
      const move = history[i];
      if (!move) continue;
      const clkComment = move.comments?.find(c => c.includes('[%clk'));
      if (clkComment) {
        const match = clkComment.match(/\[%clk\s+([^\]]+)\]/);
        if (match) {
          if (move.color === 'w') whiteTime = match[1];
          else blackTime = match[1];
        }
      }
    }
 
    setClocks(whiteTime, blackTime);
  }, [currentMoveIndex, history, setClocks]);
};