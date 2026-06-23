import { useEffect, useState } from 'react';
import { useGameStore } from '../store/useGameStore';
import { analysisBridge } from '../services/analysisBridge';
import { backendService } from '../services/backendService';

const getWhiteWinProb = (score, mate, isBlackTurn) => {
    if (mate !== null && mate !== undefined) {
        return (mate > 0) === !isBlackTurn ? 1.0 : 0.0;
    }
    const cpWhite = score * 100;
    return 1 / (1 + Math.exp(-0.00368208 * cpWhite));
};

export const useLiveEvaluation = () => {
    const fen = useGameStore(state => state.fen);
    const currentMoveIndex = useGameStore(state => state.currentMoveIndex);

    const setAnalyzing = useGameStore(state => state.setAnalyzing);
    const setEvaluation = useGameStore(state => state.setEvaluation);
    const setBestMoveForIndex = useGameStore(state => state.setBestMoveForIndex);
    const setAlternativeLinesForIndex = useGameStore(state => state.setAlternativeLinesForIndex);
    const appMode = useGameStore(state => state.appMode);
    
    const [isConnected, setIsConnected] = useState(backendService.isConnected);

    useEffect(() => {
        const removeHandler = backendService.addHandler((msg) => {
            if (msg.type === 'connection_status') {
                setIsConnected(msg.connected);
            }
        });
        return removeHandler;
    }, []);

    useEffect(() => {
        const state = useGameStore.getState();

        // Evitar interrumpir un análisis de partida completa en curso
        const isFullGameAnalysisRunning = state.isReviewRequested && !state.analysisReady;

        if (currentMoveIndex < -1 || isFullGameAnalysisRunning) return;

        let isActive = true;

        analysisBridge.analyzePosition(fen, currentMoveIndex, {
            onStatus: setAnalyzing,
            onResult: (result) => {
                if (!isActive) return;
                
                useGameStore.setState((state) => {
                    const updates = {};
                    if (result.score !== undefined) {
                        const normalized = { score: result.score, mate: result.mate };
                        updates.evaluationHistory = {
                            ...state.evaluationHistory,
                            [result.moveIndex]: { moveIndex: result.moveIndex, ...normalized }
                        };
                        if (result.moveIndex === state.currentMoveIndex) {
                            updates.evaluation = normalized;
                        }

                        // Classify the move if we have the previous evaluation
                        const i = result.moveIndex;
                        if (i >= 0) {
                            const beforeEval = updates.evaluationHistory[i - 1] || state.evaluationHistory[i - 1];
                            const movePlayed = state.history[i];
                            if (beforeEval && movePlayed) {
                                const isWhiteMove = (i % 2 === 0);
                                const wpBefore = getWhiteWinProb(beforeEval.score, beforeEval.mate, !isWhiteMove);
                                const wpAfter = getWhiteWinProb(normalized.score, normalized.mate, isWhiteMove);
                                const rawWpLoss = isWhiteMove ? (wpBefore - wpAfter) : (wpAfter - wpBefore);

                                const bestMoveBefore = state.bestMoves[i - 1];
                                const playedLan = movePlayed.lan ?? (movePlayed.from + movePlayed.to + (movePlayed.promotion || ''));
                                const isEngineBest = bestMoveBefore && (playedLan === bestMoveBefore);

                                let label = 'Excelente';
                                if (isEngineBest && rawWpLoss <= -0.05) {
                                    label = 'Brillante';
                                } else if (isEngineBest) {
                                    label = 'Mejor';
                                } else {
                                    const wpLoss = Math.max(0, rawWpLoss);
                                    if (wpLoss <= 0.02) label = 'Excelente';
                                    else if (wpLoss <= 0.05) label = 'Bueno';
                                    else if (wpLoss <= 0.10) label = 'Imprecisión';
                                    else if (wpLoss <= 0.20) label = 'Error';
                                    else label = 'Error grave';
                                }

                                updates.moveEvaluations = {
                                    ...state.moveEvaluations,
                                    [i]: label
                                };
                            }
                        }
                    }
                    if (result.bestMove) {
                        updates.bestMoves = {
                            ...state.bestMoves,
                            [result.moveIndex]: result.bestMove
                        };
                    }
                    if (result.lines?.length) {
                        updates.alternativeLines = {
                            ...state.alternativeLines,
                            [result.moveIndex]: result.lines
                        };
                    }
                    return updates;
                });
            },
        });

        return () => {
            isActive = false;
            analysisBridge.cancel();
        };
    }, [fen, currentMoveIndex, setEvaluation, setBestMoveForIndex, setAlternativeLinesForIndex, setAnalyzing, appMode, isConnected]);
};
