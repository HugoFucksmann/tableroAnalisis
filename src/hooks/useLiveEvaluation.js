import { useEffect, useState } from 'react';
import { useGameStore } from '../store/useGameStore';
import { analysisBridge } from '../services/analysisBridge';
import { backendService } from '../services/backendService';

export const useLiveEvaluation = () => {
    // Extraemos solo el estado puro
    const fen = useGameStore(state => state.fen);
    const currentMoveIndex = useGameStore(state => state.currentMoveIndex);
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
            onStatus: state.setAnalyzing,
            onResult: (result) => {
                if (!isActive) return;

                // BUG ALTO SOLUCIONADO: Se extraen los setters de getState() aquí 
                // para evitar ponerlos en el array de deps de useEffect y evitar renders innecesarios.
                const currentState = useGameStore.getState();

                if (result.score !== undefined) {
                    currentState.setEvaluation({ score: result.score, mate: result.mate }, result.moveIndex);
                }
                if (result.bestMove) {
                    currentState.setBestMoveForIndex(result.moveIndex, result.bestMove);
                }
                if (result.lines?.length) {
                    currentState.setAlternativeLinesForIndex(result.moveIndex, result.lines);
                }
            },
        });

        return () => {
            isActive = false;
            analysisBridge.cancel();
        };
        // Array limpio, sin setters de estado
    }, [fen, currentMoveIndex, appMode, isConnected]);
};