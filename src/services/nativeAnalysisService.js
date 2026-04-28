/**
 * NativeAnalysisService
 * ──────────────────────
 * Client for the native Node.js backend.
 * Communicates via WebSockets to offload heavy analysis and opening detection.
 */

class NativeAnalysisService {
    constructor() {
        this.ws = null;
        this.url = 'ws://localhost:9001';
        this.isConnected = false;
        this.handlers = new Set();
        this._reconnectTimer = null;
    }

    connect() {
        if (this.ws) return;

        console.log('[NativeService] Connecting to backend...');
        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
            console.log('[NativeService] Connected to native backend ✅');
            this.isConnected = true;
            if (this._reconnectTimer) {
                clearInterval(this._reconnectTimer);
                this._reconnectTimer = null;
            }
        };

        this.ws.onmessage = (event) => {
            try {
                const msg = JSON.parse(event.data);
                this.handlers.forEach(h => h(msg));
            } catch (e) {
                console.error('[NativeService] Error parsing message:', e);
            }
        };

        this.ws.onclose = () => {
            console.warn('[NativeService] Connection closed ❌');
            this.isConnected = false;
            this.ws = null;
            // Attempt reconnect every 5s
            if (!this._reconnectTimer) {
                this._reconnectTimer = setInterval(() => this.connect(), 5000);
            }
        };

        this.ws.onerror = (err) => {
            console.error('[NativeService] WebSocket error:', err);
        };
    }

    send(type, payload) {
        if (!this.isConnected) {
            console.warn('[NativeService] Not connected, cannot send:', type);
            return false;
        }
        this.ws.send(JSON.stringify({ type, ...payload }));
        return true;
    }

    addHandler(handler) {
        this.handlers.add(handler);
        return () => this.handlers.delete(handler);
    }

    // ── Helper methods to match AnalysisQueue interface ──────────────────────

    analyzePosition(fen, moveIndex, config) {
        return this.send('analyze_position', { fen, moveIndex, ...config });
    }

    analyzeGame(history, currentIndex, gameId, engineConfig) {
        return this.send('analyze_game', { history, currentIndex, gameId, engineConfig });
    }

    cancel() {
        return this.send('cancel', {});
    }

    clearCache(gameId) {
        return this.send('clear_cache', { gameId });
    }
}

export const nativeAnalysisService = new NativeAnalysisService();
// Start connection attempt immediately
nativeAnalysisService.connect();
