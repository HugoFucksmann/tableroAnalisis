import { useGameStore } from '../store/useGameStore';
import { backendService } from './backendService';

class AnalysisBridge {
    #abortController = null;
    isRunning = false;

    constructor() {
        backendService.addHandler((msg) => {
            if (msg.type === 'cancelled') {
                const state = useGameStore.getState();
                if (state.setCanceling) state.setCanceling(false);
                
                if (!this.isRunning) {
                    if (state.setAnalyzing) state.setAnalyzing(false);
                    if (state.isReviewRequested && state.setAnalysisReady) {
                        state.setAnalysisReady(true);
                    }
                }
            }
        });
    }

    cancel(isUserAction = true) {
        const state = useGameStore.getState();
        if (isUserAction && state.setCanceling) state.setCanceling(true);
        backendService.cancel();

        this.isRunning = false;
        if (this.#abortController) {
            this.#abortController.abort();
            this.#abortController = null;
        }
    }

    async analyzeGame(history, currentIndex, callbacks = {}) {
        const { onMoveResult, onProgress, onStatus, onComplete, onOpeningDetected, gameId = Date.now(), startFen: forcedStartFen } = callbacks;

        if (!backendService.isConnected) {
            onProgress?.(0, 'Backend not connected');
            return;
        }

        const storeState = useGameStore.getState();
        const engineConfig = { ...storeState.engineConfig, lichessToken: storeState.lichessToken };
        const startFen = forcedStartFen || storeState.startFen;

        this.cancel(false);
        if (!history || history.length === 0) return;

        this.#abortController = new AbortController();
        this.isRunning = true;
        onStatus?.(true);

        const removeHandler = backendService.addHandler((msg) => {
            switch (msg.type) {
                case 'status': onStatus?.(msg.running); break;
                case 'progress': onProgress?.(msg.pct, msg.label); break;
                case 'move_result': onMoveResult?.(msg); break;
                case 'opening_detected': onOpeningDetected?.(msg); break;
                case 'complete':
                    onComplete?.(msg.accuracy);
                    this.isRunning = false;
                    onStatus?.(false);
                    removeHandler();
                    break;
                case 'error':
                    this.isRunning = false;
                    onStatus?.(false);
                    removeHandler();
                    break;
            }
        });

        this.#abortController.signal.addEventListener('abort', () => removeHandler());
        backendService.analyzeGame(history, currentIndex, gameId, engineConfig, startFen);
    }

    async analyzePosition(fen, moveIndex, callbacks = {}) {
        const { onResult, onStatus } = callbacks;
        const state = useGameStore.getState();
        const engineConfig = state.engineConfig ?? {};

        if (state.appMode === 'puzzle' || !backendService.isConnected) return;

        this.cancel(false);
        onStatus?.(true);
        this.isRunning = true;

        const removeHandler = backendService.addHandler((msg) => {
            if (msg.type === 'position_progress' || msg.type === 'position_result') {
                onResult?.(msg);
            }
            if (msg.type === 'error') {
                onStatus?.(false);
                this.isRunning = false;
            }
        });

        this.#abortController = new AbortController();
        this.#abortController.signal.addEventListener('abort', () => removeHandler());

        backendService.analyzePosition(fen, moveIndex, {
            ...engineConfig,
            depth: engineConfig.liveDepth ?? engineConfig.depth ?? 18,
            multiPv: engineConfig.liveMultiPv ?? engineConfig.multiPv ?? 1
        });
    }

    clearCache(gameId) {
        backendService.clearCache(gameId);
    }
}

export const analysisBridge = new AnalysisBridge();
