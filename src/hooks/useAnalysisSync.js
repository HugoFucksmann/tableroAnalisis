import React from 'react';
import { useGameStore } from '../store/useGameStore';
import { useShallow } from 'zustand/react/shallow';
import { analysisQueue } from '../services/analysisQueue';
import { stockfishService } from '../services/stockfishService';

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
    evaluationHistory: state.evaluationHistory,
    isAnalyzing: state.isAnalyzing,
    setAnalyzing: state.setAnalyzing,
    setAnalysisProgress: state.setAnalysisProgress,
    setAnalysisReady: state.setAnalysisReady,
    setEvaluation: state.setEvaluation,
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

  const lastGameId = React.useRef(null);
  const lastAnalyzedFen = React.useRef(null);

  React.useEffect(() => {
    if (!gameId || gameId === lastGameId.current) return;
    if (history.length === 0) return;
    if (isAnalyzeFromPgn) return; // Saltear análisis automático si ya hay evaluaciones del PGN
    if (!wantsFullAnalysis) return; // Esperar a que el usuario presione el botón de Analizar

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

      onMoveResult: ({ index, score, label, bestMove, lines }) => {
        if (score !== undefined) setEvaluation(score, index);
        if (label) setMoveEvaluation(index, label);
        if (bestMove) setBestMoveForIndex(index, bestMove);
        if (lines?.length) setAlternativeLinesForIndex(index, lines);
      },

      onComplete: (accuracy) => {
        setGameScore(accuracy);
        setAnalysisReady(true);
        setAnalyzing(false);
        // El worker se libera en el finally de analyzeGame (stockfishService.destroy()).
      },
    });


    // Bug fix #2: cancelar análisis si el componente se desmonta
    // o si cambia el gameId antes de que termine.
    return () => {
      analysisQueue.cancel();
    };
  }, [gameId]);

  React.useEffect(() => {
    const hasEval = evaluationHistory?.some(e => e.moveIndex === currentMoveIndex);
    const sameFen = lastAnalyzedFen.current === fen;

    if (hasEval || isAnalyzing || analysisQueue.isRunning || currentMoveIndex < -1 || sameFen) return;

    lastAnalyzedFen.current = fen;
    analysisQueue.analyzeCurrentPosition(fen, currentMoveIndex, {
      onStatus: (v) => setAnalyzing(v),
      onResult: (result) => {
        if (result.score !== undefined) setEvaluation(result.score, result.moveIndex);
        if (result.bestMove) setBestMoveForIndex(result.moveIndex, result.bestMove);
        if (result.lines?.length) setAlternativeLinesForIndex(result.moveIndex, result.lines);
      },
    });
  }, [fen, currentMoveIndex, evaluationHistory, isAnalyzing]);


  React.useEffect(() => {
    if (history.length === 0) {
      setClocks(null, null);
      return;
    }

    let whiteTime = null;
    let blackTime = null;

    for (let i = 0; i <= currentMoveIndex; i++) {
      const move = history[i];
      if (!move) continue;
      
      const comment = pgnCommentsByIndex?.[i];
      if (comment) {
        const match = comment.match(/\[%clk\s+([^\]]+)\]/);
        if (match) {
          if (move.color === 'w') whiteTime = match[1];
          else blackTime = match[1];
        }
      }
    }

    setClocks(whiteTime, blackTime);
  }, [currentMoveIndex, history, pgnCommentsByIndex, setClocks]);
};