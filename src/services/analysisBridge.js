import { useGameStore } from '../store/useGameStore';
import { backendService } from './backendService';

/**
 * Convierte el campo TimeControl de PGN al formato de filtro del dashboard.
 * Formatos soportados:
 *   - "600+0"  → '10m'  (Lichess / Chess.com: segundos base + incremento)
 *   - "600"    → '10m'  (sin incremento)
 *   - "0:10:00" → '10m' (Reloj inicial PGN: horas:minutos:segundos)
 *   - "-"      → null   (sin control de tiempo)
 * Umbrales (en minutos de base):
 *   ≤ 1   → '1m'
 *   ≤ 3   → '3m'
 *   ≤ 5   → '5m'
 *   ≤ 10  → '10m'
 *   ≤ 15  → '15m'
 *   ≤ 30  → '30m'
 *   > 30  → null (correspondencia: sin filtro)
 */
function _normalizeTimeControl(raw) {
    if (!raw || raw === '-' || raw === '?') return null;
    let baseSec = 0;
    
    if (raw.includes(':')) {
        // Formato HH:MM:SS
        const parts = raw.split(':').map(Number);
        if (parts.length === 3) {
            baseSec = parts[0] * 3600 + parts[1] * 60 + parts[2];
        } else if (parts.length === 2) {
            baseSec = parts[0] * 60 + parts[1];
        }
    } else {
        // Formato segundos+incremento
        baseSec = parseInt(raw.split('+')[0], 10);
    }
    
    if (isNaN(baseSec) || baseSec === 0) return null;
    const mins = baseSec / 60;
    if (mins <= 1)  return '1m';
    if (mins <= 3)  return '3m';
    if (mins <= 5)  return '5m';
    if (mins <= 10) return '10m';
    if (mins <= 15) return '15m';
    if (mins <= 30) return '30m';
    return null;
}

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

        // Extraer metadatos si vienen de PGN Headers
        const pgnHeaders = callbacks.pgnHeaders || storeState.gameHeaders || {};
        const playerColor = callbacks.playerColor || storeState.playerColor || 'white';
        
        // Determinar si ganó el jugador
        const result = pgnHeaders.Result || '*';
        let win = true;
        if (playerColor === 'white' && result === '0-1') win = false;
        if (playerColor === 'black' && result === '1-0') win = false;
        if (result === '1/2-1/2') win = false;

        // Normalizar el TimeControl del PGN a un formato corto ('1m','3m','5m','10m','15m','30m')
        // Si no hay header TimeControl, intentar usar el tiempo inicial del reloj
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
