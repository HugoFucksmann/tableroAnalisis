import { useEffect, useRef } from 'react';
import { useGameStore } from '../store/useGameStore';
import { analysisBridge } from '../services/analysisBridge';

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
        if (!botActive) return;

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
            }, {
                onResult: (result) => {
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
