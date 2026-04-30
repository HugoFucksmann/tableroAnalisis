const ENGINE_PATH = '/stockfish/stockfish-18-lite.js';

export const DEFAULT_ENGINE_CONFIG = {
    depth: 18,
    multiPv: 1,
    threads: 2,
    hash: 32,
};

class StockfishService {
    constructor() {
        this.worker = null;
        this._initPromise = null;
        this._resolveIdle = null;
        this._idlePromise = Promise.resolve();
        this.ready = false;
        this.isSearching = false;
        this._config = { ...DEFAULT_ENGINE_CONFIG };
        this._currentReject = null;
        this._activeHandler = null;
    }

    init(config = {}) {
        if (this._initPromise) return this._initPromise;

        this._config = { ...DEFAULT_ENGINE_CONFIG, ...config };

        this._initPromise = new Promise((resolve, reject) => {
            const isIsolated = typeof self !== 'undefined' && self.crossOriginIsolated;

            if (!isIsolated && this._config.threads > 1) {
                console.warn('⚠️ Contexto no aislado (Cross-Origin Isolated). Forzando 1 hilo.');
                this._config.threads = 1;
            }

            try {
                this.worker = new Worker(ENGINE_PATH, { type: 'classic' });
            } catch (e) {
                this._initPromise = null;
                reject(new Error(`No se pudo crear el Worker: ${e.message}`));
                return;
            }

            this.worker.onmessage = (e) => {
                const line = e.data;

                if (line === 'uciok') {
                    this.worker.postMessage(`setoption name Threads value ${this._config.threads}`);
                    this.worker.postMessage(`setoption name Hash value ${this._config.hash}`);
                    this.worker.postMessage(`setoption name MultiPV value ${this._config.multiPv}`);
                    this.worker.postMessage('isready');
                }

                if (line === 'readyok' && !this.ready) {
                    this.ready = true;
                    resolve();
                }

                if (this._activeHandler) {
                    this._activeHandler(line);
                }
            };

            this.worker.onerror = (e) => {
                console.error('Stockfish worker error:', e);
                this.destroy();
                if (e.message?.includes('WebAssembly.Memory')) {
                    reject(new Error('Error de memoria WASM: Asegúrate de tener las cabeceras COOP/COEP correctamente configuradas.'));
                } else {
                    reject(e);
                }
            };

            this.worker.postMessage('uci');
        });

        return this._initPromise;
    }

    newGame() {
        if (this.worker && this.ready) {
            this.worker.postMessage('ucinewgame');
        }
    }

    async analyzePosition(fen, depth, signal, onProgress, multiPv) {
        if (!fen || typeof fen !== 'string' || fen.trim().split(/\s+/).length < 4) {
            return Promise.reject(new Error('FEN inválido'));
        }

        const t0 = performance.now();
        await this._idlePromise;
        const tIdle = performance.now() - t0;

        const effectiveMultiPv = multiPv ?? this._config.multiPv;

        const tStart = performance.now();

        return new Promise((resolve, reject) => {
            if (!this.ready) {
                reject(new Error('Stockfish no está listo'));
                return;
            }

            let isFinished = false;
            this._currentReject = reject;

            const cleanup = () => {
                if (!isFinished) {
                    isFinished = true;
                    this.isSearching = false;
                    this._activeHandler = null;

                    const tTotal = performance.now() - tStart;
                    const memInfo = performance.memory ? ` | JS Heap: ${Math.round(performance.memory.usedJSHeapSize / 1024 / 1024)}MB` : '';
                    console.log(`[Engine] Analizado en ${Math.round(tTotal)}ms | Espera _idlePromise: ${Math.round(tIdle)}ms${memInfo}`);

                    if (this._currentReject === reject) {
                        this._currentReject = null;
                    }

                    if (this._resolveIdle) {
                        this._resolveIdle();
                        this._resolveIdle = null;
                    }
                    signal?.removeEventListener('abort', onAbort);
                }
            };

            if (signal?.aborted) {
                cleanup();
                reject(new DOMException('Aborted', 'AbortError'));
                return;
            }

            this.isSearching = true;
            this._idlePromise = new Promise(r => { this._resolveIdle = r; });

            const lines = {};
            let lastBestMove = '';

            const onAbort = () => {
                if (!isFinished) {
                    this.worker?.postMessage('stop');
                    cleanup();
                    reject(new DOMException('Aborted', 'AbortError'));
                }
            };

            signal?.addEventListener('abort', onAbort);

            const messageHandler = (line) => {
                if (isFinished) return;

                if (line.startsWith('info') && line.includes('score')) {
                    const multipvMatch = line.match(/multipv (\d+)/);
                    const cpMatch = line.match(/score cp (-?\d+)/);
                    const mateMatch = line.match(/score mate (-?\d+)/);
                    const pvMatch = line.match(/ pv (.+)/);
                    const mvIdx = multipvMatch ? parseInt(multipvMatch[1]) : 1;

                    if (!lines[mvIdx]) lines[mvIdx] = { multipv: mvIdx, score: 0, mate: null, pv: '', move: '' };

                    if (cpMatch) lines[mvIdx].score = parseInt(cpMatch[1]);
                    if (mateMatch) { lines[mvIdx].mate = parseInt(mateMatch[1]); lines[mvIdx].score = 0; }
                    if (pvMatch) {
                        const pv = pvMatch[1].trim();
                        lines[mvIdx].pv = pv;
                        lines[mvIdx].move = pv.split(' ')[0];
                    }

                    if (onProgress) {
                        onProgress({ 
                            score: lines[1]?.score ?? 0, 
                            mate: lines[1]?.mate ?? null, 
                            bestMove: lines[1]?.move ?? '',
                            lines: Object.values(lines).sort((a, b) => a.multipv - b.multipv)
                        });
                    }
                }

                if (line.startsWith('bestmove')) {
                    const bm = line.split(' ')[1];
                    if (bm && bm !== '(none)') lastBestMove = bm;
                    if (!lines[1]) lines[1] = { multipv: 1, score: 0, mate: null, pv: '', move: lastBestMove };

                    const result = {
                        score: lines[1].score,
                        mate: lines[1].mate ?? null,
                        bestMove: lastBestMove || lines[1].move,
                        pv: lines[1].pv,
                        lines: Object.values(lines).sort((a, b) => a.multipv - b.multipv),
                    };

                    cleanup();
                    resolve(result);
                }
            };

            this._activeHandler = (line) => {
                if (line === 'readyok') {
                    this.worker.postMessage(`position fen ${fen}`);
                    this.worker.postMessage(`go depth ${depth}`);
                    this._activeHandler = messageHandler;
                }
            };
            this.worker.postMessage(`setoption name MultiPV value ${effectiveMultiPv}`);
            this.worker.postMessage('isready');
        });
    }

    stop() {
        if (this.worker) this.worker.postMessage('stop');
    }

    destroy() {
        if (this.worker) {
            try { this.worker.postMessage('quit'); } catch { }
            this.worker.terminate();
        }
        this.worker = null;
        this.ready = false;
        this._initPromise = null;
        this._activeHandler = null;
        this.isSearching = false;

        if (this._resolveIdle) {
            this._resolveIdle();
            this._resolveIdle = null;
        }
        this._idlePromise = Promise.resolve();

        if (this._currentReject) {
            this._currentReject(new DOMException('Engine destroyed', 'AbortError'));
            this._currentReject = null;
        }
    }
}

export const stockfishService = new StockfishService();