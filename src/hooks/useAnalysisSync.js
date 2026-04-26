import { useEffect, useRef, useMemo } from 'react';
import { useGameStore } from '../store/useGameStore';
import { useShallow } from 'zustand/react/shallow';
import { analysisQueue } from '../services/analysisQueue';

export const useAnalysisSync = () => {
  const {
    fen,
    game,
    history,
    currentMoveIndex,
    gameId,
    setAnalyzing,
    setAnalysisProgress,
    setAnalysisReady,
    setEvaluation,
    setEvaluationDirect,
    setMoveEvaluation,
    setBestMoveForIndex,
    setAlternativeLinesForIndex,
    setGameScore,
    setEcoCode,
    setOpeningPly,
    setOpeningDetected,
    setOpeningName,
    setClocks,
    lichessToken,
    isAnalyzeFromPgn,
    wantsFullAnalysis,
    pgnCommentsByIndex,
  } = useGameStore(useShallow(state => ({
    fen: state.fen,
    game: state.game,
    history: state.history,
    currentMoveIndex: state.currentMoveIndex,
    gameId: state.gameId,
    setAnalyzing: state.setAnalyzing,
    setAnalysisProgress: state.setAnalysisProgress,
    setAnalysisReady: state.setAnalysisReady,
    setEvaluation: state.setEvaluation,
    setEvaluationDirect: state.setEvaluationDirect,
    setMoveEvaluation: state.setMoveEvaluation,
    setBestMoveForIndex: state.setBestMoveForIndex,
    setAlternativeLinesForIndex: state.setAlternativeLinesForIndex,
    setGameScore: state.setGameScore,
    setEcoCode: state.setEcoCode,
    setOpeningPly: state.setOpeningPly,
    setOpeningDetected: state.setOpeningDetected,
    setOpeningName: state.setOpeningName,
    setClocks: state.setClocks,
    lichessToken: state.lichessToken,
    isAnalyzeFromPgn: state.isAnalyzeFromPgn,
    wantsFullAnalysis: state.wantsFullAnalysis,
    pgnCommentsByIndex: state.pgnCommentsByIndex,
  })));

  const lastGameId = useRef(null);
  const lastAnalyzedFen = useRef(null);

  // ── Análisis completo de la partida ────────────────────────────────────────
  useEffect(() => {
    if (!gameId || gameId === lastGameId.current) return;
    if (history.length === 0 || isAnalyzeFromPgn || !wantsFullAnalysis) return;

    lastGameId.current = gameId;
    lastAnalyzedFen.current = null;

    const pgnHeaders = game?.header?.() ?? {};

    analysisQueue.analyzeGame(history, currentMoveIndex, {
      gameId,
      pgnHeaders,
      lichessToken,
      onStatus: setAnalyzing,
      onProgress: setAnalysisProgress,
      onOpeningDetected: ({ openingName, ecoCode, openingPly, bookPlies }) => {
        bookPlies.forEach(ply => setMoveEvaluation(ply, 'Libro'));
        if (openingName) setOpeningName(openingName);
        if (ecoCode) setEcoCode(ecoCode);
        setOpeningPly(openingPly);
        setOpeningDetected(true);
      },
      onMoveResult: ({ index, score, mate, label, bestMove, lines }) => {
        if (score !== undefined) setEvaluation({ score, mate }, index);
        if (label) setMoveEvaluation(index, label);
        if (bestMove) setBestMoveForIndex(index, bestMove);
        if (lines?.length) setAlternativeLinesForIndex(index, lines);
      },
      onComplete: (accuracy) => {
        setAnalysisReady(true);
        setAnalyzing(false);
        setGameScore(accuracy);
      },
    });

    return () => analysisQueue.cancel();
  }, [gameId, history, isAnalyzeFromPgn, wantsFullAnalysis]);

  // ── Sincronización al navegar por el historial ──────────────────────────────
  useEffect(() => {
    if (currentMoveIndex < -1) return;
    // Leemos el store actual sin suscribirnos a todos los cambios de evaluación
    const cached = useGameStore.getState().evaluationHistory[currentMoveIndex];
    if (cached) {
      setEvaluationDirect({ score: cached.score, mate: cached.mate ?? null });
    }
  }, [currentMoveIndex, setEvaluationDirect]);

  // ── Análisis en vivo (Live Engine) ──────────────────────────────────────────
  useEffect(() => {
    const state = useGameStore.getState();
    const hasEval = !!state.evaluationHistory[currentMoveIndex];
    const cachedLinesCount = state.alternativeLines?.[currentMoveIndex]?.length || 0;
    const targetMultiPv = state.engineConfig?.liveMultiPv || 3;
    const needsLiveAnalysis = !hasEval || cachedLinesCount < targetMultiPv;

    if (!needsLiveAnalysis || state.isAnalyzing || analysisQueue.isRunning || currentMoveIndex < -1 || lastAnalyzedFen.current === fen) return;

    lastAnalyzedFen.current = fen;
    analysisQueue.analyzeCurrentPosition(fen, currentMoveIndex, {
      onStatus: setAnalyzing,
      onResult: (result) => {
        if (result.score !== undefined) setEvaluation({ score: result.score, mate: result.mate }, result.moveIndex);
        if (result.bestMove) setBestMoveForIndex(result.moveIndex, result.bestMove);
        if (result.lines?.length) setAlternativeLinesForIndex(result.moveIndex, result.lines);
      },
    });
  }, [fen, currentMoveIndex, setEvaluation, setBestMoveForIndex, setAlternativeLinesForIndex, setAnalyzing]);

  // ── Optimización O(1) de Relojes con Caché ─────────────────────────────────
  const allClocks = useMemo(() => {
    if (history.length === 0 || !pgnCommentsByIndex) return { initial: {}, moves: [] };

    const movesClocks = new Array(history.length);
    let initialWhite = null, initialBlack = null;

    for (let i = 0; i < history.length; i++) {
      const c = pgnCommentsByIndex[i];
      if (c) {
        const match = c.match(/\[%clk\s+([^\]]+)\]/);
        if (match) {
          if (history[i]?.color === 'w' && !initialWhite) initialWhite = match[1];
          if (history[i]?.color === 'b' && !initialBlack) initialBlack = match[1];
        }
      }
    }

    let lastWhite = initialWhite, lastBlack = initialBlack;
    for (let i = 0; i < history.length; i++) {
      const comment = pgnCommentsByIndex[i];
      if (comment) {
        const match = comment.match(/\[%clk\s+([^\]]+)\]/);
        if (match) {
          if (history[i]?.color === 'w') lastWhite = match[1];
          else lastBlack = match[1];
        }
      }
      movesClocks[i] = { white: lastWhite, black: lastBlack };
    }

    return { initial: { white: initialWhite, black: initialBlack }, moves: movesClocks };
  }, [history, pgnCommentsByIndex]);

  useEffect(() => {
    if (!allClocks.moves || allClocks.moves.length === 0) return;
    const current = currentMoveIndex >= 0 ? allClocks.moves[currentMoveIndex] : allClocks.initial;
    setClocks(current?.white || null, current?.black || null);
  }, [currentMoveIndex, allClocks, setClocks]);
};