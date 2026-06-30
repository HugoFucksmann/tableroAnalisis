import { useEffect, useRef } from 'react';
import { useGameStore } from '../store/useGameStore';
import { analysisBridge } from '../services/analysisBridge';

const getWhiteWinProb = (score, mate, isBlackTurn) => {
    if (mate !== null && mate !== undefined) {
        return (mate > 0) === !isBlackTurn ? 1.0 : 0.0;
    }
    const cpWhite = score * 100;
    return 1 / (1 + Math.exp(-0.00368208 * cpWhite));
};

export const useBotGame = () => {
    const fen = useGameStore(state => state.fen);
    const currentMoveIndex = useGameStore(state => state.currentMoveIndex);
    const history = useGameStore(state => state.history);
    const botActive = useGameStore(state => state.botActive);
    const botDifficulty = useGameStore(state => state.botDifficulty);
    const botActualColor = useGameStore(state => state.botActualColor);
    const botMemory = useGameStore(state => state.botMemory);
    const makeMove = useGameStore(state => state.makeMove);

    const isBotThinking = useRef(false);

    useEffect(() => {
        if (!botActive) {
            isBotThinking.current = false;
            return;
        }

        // Determine whose turn it is
        const isWhiteTurn = !fen.includes(' b ');
        const isBotTurn = (isWhiteTurn && botActualColor === 'white') || (!isWhiteTurn && botActualColor === 'black');

        // We only trigger the bot if it is the bot's turn AND we are at the end of the history
        const isAtEnd = currentMoveIndex === history.length - 1;

        if (isBotTurn && isAtEnd && !isBotThinking.current) {
            isBotThinking.current = true;

            // Map difficulty to ELO
            let elo = 1400;
            if (botDifficulty === 'beginner') elo = 1000;
            else if (botDifficulty === 'intermediate') elo = 1400;
            else if (botDifficulty === 'advanced') elo = 1800;
            else if (botDifficulty === 'master') elo = 2200;

            // Call backend analyzePosition to get the best moves with Elo settings
            analysisBridge.analyzePosition(fen, currentMoveIndex, {
                limitStrength: true,
                elo: elo,
                depth: 12,
                multiPv: 4, // Get top 4 moves to allow discarded alternatives
                onStatus: (status) => {
                    useGameStore.getState().setAnalyzing(status);
                    if (!status) {
                        isBotThinking.current = false;
                    }
                },
                onResult: (result) => {
                    // Update score/mate for the evaluation bar on both progress and final result
                    if (result.score !== undefined) {
                        useGameStore.setState((state) => {
                            const normalized = { score: result.score, mate: result.mate };
                            const updates = {
                                evaluationHistory: {
                                    ...state.evaluationHistory,
                                    [result.moveIndex]: { moveIndex: result.moveIndex, ...normalized }
                                }
                            };
                            if (result.moveIndex === state.currentMoveIndex) {
                                updates.evaluation = normalized;
                            }

                            // Classify the user's move (only on final position_result)
                            if (result.type === 'position_result') {
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
                            return updates;
                        });
                    }

                    if (result.type !== 'position_result') return;

                    isBotThinking.current = false;

                    const discarded = botMemory[fen] || [];
                    const lines = result.lines || [];

                    let selectedMove = null;

                    // Check result.bestMove first
                    if (result.bestMove && !discarded.includes(result.bestMove)) {
                        selectedMove = result.bestMove;
                    } else {
                        // Check lines
                        for (const line of lines) {
                            const move = line.move || (line.pv ? line.pv.split(' ')[0] : null);
                            if (move && !discarded.includes(move)) {
                                selectedMove = move;
                                break;
                            }
                        }
                    }

                    // Fallback: if all top moves are discarded, use bestMove or first line
                    if (!selectedMove) {
                        selectedMove = result.bestMove || (lines[0] ? (lines[0].move || lines[0].pv.split(' ')[0]) : null);
                    }

                    if (selectedMove) {
                        setTimeout(() => {
                            makeMove(selectedMove);
                        }, 600); // 600ms delay for human-like response time
                    }
                }
            });
        }
    }, [fen, currentMoveIndex, history.length, botActive, botDifficulty, botActualColor, botMemory, makeMove]);
};
