import React from 'react';
import { useGameStore } from '../store/useGameStore';
import { analysisQueue } from '../services/analysisQueue';

/**
 * Hook para sincronizar el análisis de Stockfish con el estado del tablero.
 * Se encarga de disparar el análisis de la posición actual cuando cambia el FEN.
 */
export const useAnalysisSync = () => {
  const {
    fen,
    currentMoveIndex,
    evaluationHistory,
    isAnalyzing,
    setBestMoveForIndex,
    setAnalyzing,
    setEvaluation,
    gameId
  } = useGameStore();

  const lastAnalyzedFen = React.useRef(null);

  // Resetear el ref cuando cambia la partida
  React.useEffect(() => {
    lastAnalyzedFen.current = null;
  }, [gameId]);

  React.useEffect(() => {
    // Si no hay historial de evaluación, forzamos el análisis ignorando el ref
    const isNewGame = evaluationHistory.length === 0;
    const hasEval = evaluationHistory?.some(e => e.moveIndex === currentMoveIndex);
    
    const shouldAnalyze = (!hasEval && !isAnalyzing && currentMoveIndex >= -1) && 
                          (isNewGame || lastAnalyzedFen.current !== fen);

    if (shouldAnalyze) {
      lastAnalyzedFen.current = fen;
      analysisQueue.analyzeCurrentPosition(fen, currentMoveIndex, {
        onStatus: (status) => setAnalyzing(status),
        onResult: (result) => {
          if (result.score !== undefined) {
            setEvaluation(result.score, result.moveIndex);
          }
          if (result.bestMove) {
            setBestMoveForIndex(result.moveIndex, result.bestMove);
          }
        }
      });
    }
  }, [
    fen, 
    currentMoveIndex, 
    evaluationHistory, 
    isAnalyzing, 
    setBestMoveForIndex, 
    setAnalyzing, 
    setEvaluation
  ]);
};
