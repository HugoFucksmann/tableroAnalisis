import { useEffect, useRef } from 'react';
import { useGameStore } from '../store/useGameStore';
import { backendService } from '../services/backendService';

export const useBackendSync = () => {
  const gameId = useGameStore(state => state.gameId);

  useEffect(() => {
    const cleanup = backendService.addHandler((msg) => {
      const { applyFullAnalysis, setAnalyses, setAnalysedGameIds } = useGameStore.getState();

      if (msg.type === 'connection_status' && msg.connected) {
        backendService.getAnalyses(0, 50);
        backendService.getAnalysedIds();
      }
      if (msg.type === 'full_analysis_data') {
        applyFullAnalysis(msg.data);
        const { targetPly, setTargetPly, goToMove } = useGameStore.getState();
        if (targetPly !== null) {
          goToMove(targetPly);
          setTargetPly(null);
        }
      }
      if (msg.type === 'analyses_list') {
        if (msg.offset === 0) {
          setAnalyses(msg.analyses);
        } else {
          setAnalyses(prev => {
            const existingIds = new Set(prev.map(a => a.id));
            const newItems = msg.analyses.filter(a => !existingIds.has(a.id));
            return [...prev, ...newItems];
          });
        }
      }
      // Mantiene sincronizado el conjunto ligero de insignias cada vez que llegan análisis completos
      if (msg.type === 'analysed_ids') {
        setAnalysedGameIds(msg.ids);
      }
    });

    if (backendService.isConnected) {
      backendService.getAnalyses(0, 50);
      backendService.getAnalysedIds();
    }

    return () => cleanup();
  }, []);

  const lastLoadedId = useRef(null);
  useEffect(() => {
    if (gameId && gameId !== lastLoadedId.current) {
      lastLoadedId.current = gameId;
      backendService.getFullAnalysis(gameId);
    }
  }, [gameId]);
};
