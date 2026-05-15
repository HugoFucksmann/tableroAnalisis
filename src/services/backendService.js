class BackendService {
    constructor() {
        this.ws = null;
        this.url = 'ws://localhost:9001';
        this.handlers = new Set();
        this._reconnectTimer = null;
        this.shouldBeConnected = false;
        this.messageQueue = [];
    }

    get isConnected() {
        return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
    }

    connect() {
        this.shouldBeConnected = true;
        if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
            return;
        }

        console.log('[BackendService] Conectando al motor remoto...');

        const currentWs = new WebSocket(this.url);
        this.ws = currentWs;

        currentWs.onopen = () => {
            if (this.ws !== currentWs) {
                currentWs.close();
                return;
            }

            console.log('[BackendService] ✅ Conectado al backend nativo');
            this._flushQueue();
            this._notifyHandlers({ type: 'connection_status', connected: this.isConnected });

            if (this._reconnectTimer) {
                clearInterval(this._reconnectTimer);
                this._reconnectTimer = null;
            }
        };

        currentWs.onmessage = (event) => {
            try {
                const msg = JSON.parse(event.data);
                this._notifyHandlers(msg);
            } catch (e) {
                console.error('[BackendService] Error parseando mensaje JSON:', e);
            }
        };

        currentWs.onclose = () => {
            console.warn('[BackendService] ❌ Conexión cerrada');

            if (this.ws === currentWs) {
                this.ws = null;
            }

            this._notifyHandlers({ type: 'connection_status', connected: false });

            if (this.shouldBeConnected && !this._reconnectTimer) {
                console.log('[BackendService] Intentando reconectar en 5s...');
                this._reconnectTimer = setInterval(() => this.connect(), 5000);
            }
        };

        currentWs.onerror = (err) => {
            console.error('[BackendService] Error de WebSocket:', err);
        };
    }

    _notifyHandlers(msg) {
        this.handlers.forEach(h => {
            try {
                h(msg);
            } catch (err) {
                console.error('[BackendService] Error en handler al procesar mensaje:', msg.type, err);
            }
        });
    }

    _flushQueue() {
        while (this.messageQueue.length > 0 && this.ws && this.ws.readyState === WebSocket.OPEN) {
            const rawMsg = this.messageQueue.shift();
            this.ws.send(rawMsg);
        }
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
        this.messageQueue = [];
        console.log('[BackendService] Desconectado manualmente');
    }

    send(type, payload, requestId = null) {
        const msg = { type, ...payload };
        if (requestId) msg.requestId = requestId;
        const rawMsg = JSON.stringify(msg);

        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(rawMsg);
            return true;
        } else if (this.ws && this.ws.readyState === WebSocket.CONNECTING) {
            this.messageQueue.push(rawMsg);
            return true;
        } else if (this.shouldBeConnected) {
            this.messageQueue.push(rawMsg);
            return true;
        } else {
            console.warn(`[BackendService] ⚠️ Mensaje '${type}' descartado: no hay conexión activa.`);
            return false;
        }
    }

    // BUG ALTO SOLUCIONADO: Se eliminó el anti-patrón de polling con setInterval.
    // Ahora usa la cola de mensajes nativa y promesas puras.
    async request(type, payload, resultType) {
        const requestId = Math.random().toString(36).substring(2, 15);

        return new Promise((resolve, reject) => {
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

            // Si no hay conexión pero se solicitó, send() lo encolará y enviará al conectar.
            const sent = this.send(type, payload, requestId);
            if (!sent) {
                clearTimeout(timeout);
                cleanup();
                reject(new Error('No se pudo enviar la petición: servidor no conectado'));
            }
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
            win: extraInfo.win ?? null,
            timeControl: extraInfo.timeControl ?? null,
            playerWhite: extraInfo.playerWhite ?? null,
            playerBlack: extraInfo.playerBlack ?? null,
        });
    }

    getStatDetails(category, filters = {}) {
        return this.request('get_stat_details', { category, filters }, 'stat_details_data');
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

    analyzeGames(games, engineConfig) {
        return this.send('analyze_games', { games, engineConfig });
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

    getMoveExplorer(fen, requestId = null) {
        return this.send('get_move_explorer', { fen }, requestId);
    }

    getBookMoves(fen, requestId = null) {
        return this.send('get_book_moves', { fen }, requestId);
    }

    getServerConfig(requestId = null) {
        return this.send('get_server_config', {}, requestId);
    }
}

export const backendService = new BackendService();