import React from 'react';
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

    evaluationHistory,
    isAnalyzing,

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
    engineConfig,
    alternativeLines,
  } = useGameStore(useShallow(state => ({
    fen: state.fen,
    game: state.game,
    history: state.history,
    currentMoveIndex: state.currentMoveIndex,
    gameId: state.gameId,
    evaluationHistory: state.evaluationHistory,
    isAnalyzing: state.isAnalyzing,
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
    engineConfig: state.engineConfig,
    alternativeLines: state.alternativeLines,
  })));

  const lastGameId = React.useRef(null);
  const lastAnalyzedFen = React.useRef(null);

  // ── Análisis completo de la partida ────────────────────────────────────────
  React.useEffect(() => {
    if (!gameId || gameId === lastGameId.current) return;
    if (history.length === 0) return;
    if (isAnalyzeFromPgn) return;
    if (!wantsFullAnalysis) return;

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
        setTimeout(() => {
          setGameScore(accuracy);
        }, 300);
      },
    });

    return () => {
      analysisQueue.cancel();
    };
  }, [gameId]);

  // ── Sincronizar barra al navegar o cuando llega análisis del movimiento actual
  // Usa setEvaluationDirect para solo escribir `evaluation` sin tocar
  // evaluationHistory, evitando el loop infinito.
  React.useEffect(() => {
    if (currentMoveIndex < -1) return;
    const cached = evaluationHistory?.find(e => e.moveIndex === currentMoveIndex);
    if (cached) {
      setEvaluationDirect({ score: cached.score, mate: cached.mate ?? null });
    }
  }, [currentMoveIndex, evaluationHistory]);

  // ── Live analysis para movimientos sin evaluación o líneas incompletas ──────
  React.useEffect(() => {
    const hasEval = evaluationHistory?.some(e => e.moveIndex === currentMoveIndex);
    const cachedLinesCount = alternativeLines?.[currentMoveIndex]?.length || 0;
    const targetMultiPv = engineConfig?.liveMultiPv || 3;
    const needsLiveAnalysis = !hasEval || cachedLinesCount < targetMultiPv;

    const sameFen = lastAnalyzedFen.current === fen;

    if (!needsLiveAnalysis || isAnalyzing || analysisQueue.isRunning || currentMoveIndex < -1 || sameFen) return;

    lastAnalyzedFen.current = fen;
    analysisQueue.analyzeCurrentPosition(fen, currentMoveIndex, {
      onStatus: (v) => setAnalyzing(v),
      onResult: (result) => {
        if (result.score !== undefined) setEvaluation({ score: result.score, mate: result.mate }, result.moveIndex);
        if (result.bestMove) setBestMoveForIndex(result.moveIndex, result.bestMove);
        if (result.lines?.length) setAlternativeLinesForIndex(result.moveIndex, result.lines);
      },
    });
  }, [fen, currentMoveIndex, evaluationHistory, isAnalyzing]);

  // ── Relojes desde comentarios PGN ─────────────────────────────────────────
  const clocks = React.useMemo(() => {
    if (history.length === 0 || !pgnCommentsByIndex) return { white: null, black: null };

    let white = null;
    let black = null;
    for (let i = 0; i <= currentMoveIndex; i++) {
      const comment = pgnCommentsByIndex[i];
      if (!comment) continue;
      const match = comment.match(/\[%clk\s+([^\]]+)\]/);
      if (match) {
        if (history[i]?.color === 'w') white = match[1];
        else black = match[1];
      }
    }
    return { white, black };
  }, [currentMoveIndex, history, pgnCommentsByIndex]);

  React.useEffect(() => {
    setClocks(clocks.white, clocks.black);
  }, [clocks, setClocks]);
};