class BackendService {
    constructor() {
        this.ws = null;
        this.url = 'ws://localhost:9001';
        this.isConnected = false;
        this.handlers = new Set();
        this._reconnectTimer = null;
        this.shouldBeConnected = false;
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
        console.log('[BackendService] Desconectado manualmente');
    }

    send(type, payload, requestId = null) {
        if (!this.isConnected) return false;
        const msg = { type, ...payload };
        if (requestId) msg.requestId = requestId;
        this.ws.send(JSON.stringify(msg));
        return true;
    }

    async request(type, payload, resultType) {
        const requestId = Math.random().toString(36).substring(2, 15);
        
        if (!this.isConnected) {
            await new Promise(resolve => {
                let attempts = 0;
                const check = setInterval(() => {
                    attempts++;
                    if (this.isConnected || attempts > 50) {
                        clearInterval(check);
                        resolve();
                    }
                }, 100);
            });
        }

        return new Promise((resolve, reject) => {
            if (!this.isConnected) {
                reject(new Error('Servidor no conectado'));
                return;
            }

            const timeout = setTimeout(() => {
                cleanup();
                reject(new Error('Timeout esperando respuesta del servidor'));
            }, 10000);

            const cleanup = this.addHandler((msg) => {
                if (msg.type === resultType && msg.requestId === requestId) {
                    clearTimeout(timeout);
                    cleanup();
                    resolve(msg);
                } else if (msg.type === 'error' && msg.requestId === requestId) {
                    clearTimeout(timeout);
                    cleanup();
                    reject(new Error(msg.message));
                }
            });

            this.send(type, payload, requestId);
        });
    }

    addHandler(handler) {
        this.handlers.add(handler);
        return () => this.handlers.delete(handler);
    }

    analyzePosition(fen, moveIndex, config) {
        return this.send('analyze_position', { fen, moveIndex, ...config });
    }

    analyzeGame(history, currentIndex, gameId, engineConfig, startFen = null, extraInfo = {}) {
        return this.send('analyze_game', { 
            history, currentIndex, gameId, engineConfig, startFen,
            playerColor: extraInfo.playerColor,
            win: extraInfo.win,
            timeControl: extraInfo.timeControl ?? null,
        });
    }

    cancel() {
        return this.send('cancel', {});
    }

    clearCache(gameId) {
        return this.send('clear_cache', { gameId });
    }

    extractPuzzles(games, engineConfig) {
        return this.send('extract_puzzles', { games, engineConfig });
    }

    cancelExtraction() {
        return this.send('cancel_extraction', {});
    }

    getPuzzles() {
        return this.send('get_puzzles', {});
    }

    deletePuzzle(id) {
        return this.send('delete_puzzle', { id });
    }

    clearPuzzles() {
        return this.send('clear_puzzles', {});
    }

    puzzleSolved(id) {
        return this.send('puzzle_solved', { id });
    }

    getStats(filters = {}, requestId = null) {
        return this.send('get_stats', { filters }, requestId);
    }
    
    getAnalyses(offset = 0, limit = 50, requestId = null) {
        return this.send('get_analyses', { offset, limit }, requestId);
    }

    deleteAnalyses(ids, requestId = null) {
        return this.send('delete_analyses', { ids }, requestId);
    }

    getFullAnalysis(gameId, requestId = null) {
        return this.send('get_full_analysis', { gameId }, requestId);
    }
}

export const backendService = new BackendService();