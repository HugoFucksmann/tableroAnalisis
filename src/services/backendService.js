/**
 * BackendService
 * ────────────────
 * Cliente WebSocket para conectar con el motor nativo de Node.js.
 */
class BackendService {
    constructor() {
        this.ws = null;
        this.url = 'ws://localhost:9001';
        this.isConnected = false;
        this.handlers = new Set();
        this._reconnectTimer = null;
        this.shouldBeConnected = false; // Control explícito del usuario
    }

    connect() {
        this.shouldBeConnected = true;
        if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
            return;
        }

        console.log('[BackendService] Conectando al motor remoto...');
        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
            console.log('[BackendService] ✅ Conectado al backend nativo');
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
                console.error('[BackendService] Error parseando mensaje:', e);
            }
        };

        this.ws.onclose = () => {
            console.warn('[BackendService] ❌ Conexión cerrada');
            this.isConnected = false;
            this.ws = null;

            // Solo reconecta si el usuario sigue queriendo usar el modo 'remote'
            if (this.shouldBeConnected && !this._reconnectTimer) {
                console.log('[BackendService] Intentando reconectar en 5s...');
                this._reconnectTimer = setInterval(() => this.connect(), 5000);
            }
        };

        this.ws.onerror = (err) => {
            console.error('[BackendService] Error de WebSocket:', err);
        };
    }

    disconnect() {
        this.shouldBeConnected = false;
        if (this._reconnectTimer) {
            clearInterval(this._reconnectTimer);
            this._reconnectTimer = null;
        }
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.isConnected = false;
        console.log('[BackendService] Desconectado manualmente (Cambiado a Local)');
    }

    send(type, payload) {
        if (!this.isConnected) return false;
        this.ws.send(JSON.stringify({ type, ...payload }));
        return true;
    }

    addHandler(handler) {
        this.handlers.add(handler);
        return () => this.handlers.delete(handler);
    }

    // ── Interfaz idéntica a AnalysisQueue ──
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

export const backendService = new BackendService();