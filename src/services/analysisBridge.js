import { useGameStore } from '../store/useGameStore';
import { backendService } from './backendService';

function _normalizeTimeControl(raw) {
    if (!raw || raw === '-' || raw === '?') return null;
    let baseSec = 0;

    if (raw.includes(':')) {
        const parts = raw.split(':').map(Number);
        if (parts.length === 3) {
            baseSec = parts[0] * 3600 + parts[1] * 60 + parts[2];
        } else if (parts.length === 2) {
            baseSec = parts[0] * 60 + parts[1];
        }
    } else {
        baseSec = parseInt(raw.split('+')[0], 10);
    }

    if (isNaN(baseSec) || baseSec === 0) return null;
    const mins = baseSec / 60;
    if (mins <= 1) return '1m';
    if (mins <= 3) return '3m';
    if (mins <= 5) return '5m';
    if (mins <= 10) return '10m';
    if (mins <= 15) return '15m';
    if (mins <= 30) return '30m';
    return null;
}

class AnalysisBridge {
    #abortController = null;
    #globalHandlerRemover = null;
    isRunning = false;

    constructor() {
        this.#globalHandlerRemover = backendService.addHandler((msg) => {
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

    // Método añadido para prevenir memory leaks en caso de reiniciar la clase
    destroy() {
        if (this.#globalHandlerRemover) {
            this.#globalHandlerRemover();
            this.#globalHandlerRemover = null;
        }
        this.cancel(false);
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
        const storeState = useGameStore.getState();
        const {
            onMoveResult, onProgress, onStatus, onComplete, onOpeningDetected,
            gameId = storeState.gameId || Date.now(),
            startFen: forcedStartFen
        } = callbacks;

        if (!backendService.isConnected) {
            onProgress?.(0, 'Backend not connected');
            return;
        }

        const engineConfig = { ...storeState.engineConfig, lichessToken: storeState.lichessToken };
        const startFen = forcedStartFen || storeState.startFen;

        this.cancel(false);
        if (!history || history.length === 0) return;

        this.#abortController = new AbortController();
        this.isRunning = true;
        onStatus?.(true);

        const cleanup = () => {
            removeHandler();
            this.#abortController?.signal.removeEventListener('abort', cleanup);
        };

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
                    cleanup();
                    break;
                case 'error':
                    this.isRunning = false;
                    onStatus?.(false);
                    cleanup();
                    break;
            }
        });

        this.#abortController.signal.addEventListener('abort', cleanup);

        const pgnHeaders = callbacks.pgnHeaders || storeState.gameHeaders || {};
        const playerColor = callbacks.playerColor || storeState.playerColor || 'white';
        const result = pgnHeaders.Result || '*';

        let win = null;
        if (result === '1-0') win = playerColor === 'white' ? 1 : -1;
        else if (result === '0-1') win = playerColor === 'white' ? -1 : 1;
        else if (result === '1/2-1/2') win = 0;

        const rawTc = pgnHeaders.TimeControl || storeState.clocks?.white || '';
        const timeControl = _normalizeTimeControl(rawTc);

        backendService.analyzeGame(history, currentIndex, gameId, engineConfig, startFen, {
            playerColor,
            win,
            timeControl,
        });
    }

    async analyzePosition(fen, moveIndex, callbacks = {}) {
        const { onResult, onStatus } = callbacks;
        const state = useGameStore.getState();
        const engineConfig = state.engineConfig ?? {};

        if ((state.appMode === 'puzzle' && !state.explorerMode) || !backendService.isConnected) return;

        this.cancel(false);
        onStatus?.(true);
        this.isRunning = true;

        this.#abortController = new AbortController();

        const cleanup = () => {
            removeHandler();
            this.#abortController?.signal.removeEventListener('abort', cleanup);
        };

        const removeHandler = backendService.addHandler((msg) => {
            if (msg.type === 'position_progress' || msg.type === 'position_result') {
                onResult?.(msg);
            }
            if (msg.type === 'error') {
                onStatus?.(false);
                this.isRunning = false;
                cleanup();
            }
        });

        this.#abortController.signal.addEventListener('abort', cleanup);

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