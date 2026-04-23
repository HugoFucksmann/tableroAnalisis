const ENGINES = {
    lite: '/stockfish/stockfish-18-lite.js',
    full: '/stockfish/stockfish-18.js'
};

export const DEPTH_CURRENT = 18;
export const DEPTH_BACKGROUND = 15;
export const MULTIPV_COUNT = 1;

function getOptimalThreads() {
    const cores = navigator.hardwareConcurrency ?? 2;
    // Cappeamos a 4 hilos máximo. Depth 18 no necesita 15 hilos y ahorra muchísima RAM.
    return Math.min(4, Math.max(1, cores - 1));
}

class StockfishService {
    constructor() {
        this.worker = null;
        this.resolvers = [];
        this._initPromise = null;
        this._resolveIdle = null;
        this.engineType = 'lite';
        this._threads = 1;
        this._idlePromise = Promise.resolve();
        this.ready = false;
        this.isSearching = false;
    }

    setEngineType(type) {
        if (this.engineType === type) return;
        this.engineType = type;
        this.destroy();
    }

    init() {
        if (this._initPromise) return this._initPromise;

        const path = ENGINES[this.engineType] || ENGINES.lite;
        this._threads = getOptimalThreads();

        this._initPromise = new Promise((resolve, reject) => {
            try {
                this.worker = new Worker(path, { type: 'classic' });
            } catch (e) {
                this._initPromise = null;
                reject(new Error(`No se pudo cargar Stockfish: ${e.message}`));
                return;
            }

            this.worker.onmessage = (e) => {
                const line = e.data;

                if (line === 'uciok') {
                    this.worker.postMessage(`setoption name Threads value ${this._threads}`);
                    // 32MB de Hash es suficiente para análisis en web y ahorra memoria.
                    this.worker.postMessage('setoption name Hash value 32');
                    this.worker.postMessage(`setoption name MultiPV value ${MULTIPV_COUNT}`);
                    this.worker.postMessage('isready');
                }

                if (line === 'readyok') {
                    this.ready = true;
                    resolve();
                }

                if (this.resolvers.length > 0) {
                    // Llamamos a todos los resolvers pendientes hasta que uno procese la línea.
                    // En la práctica, casi siempre será el primero.
                    this.resolvers[0](line);
                }
            };

            this.worker.onerror = (e) => {
                console.error('Stockfish worker error:', e);
                this.destroy(); // Limpieza total en caso de error crítico
                reject(e);
            };

            this.worker.postMessage('uci');
        });

        return this._initPromise;
    }

    async analyzePosition(fen, depth, signal, onProgress, multiPv = MULTIPV_COUNT) {
        await this._idlePromise;

        return new Promise((resolve, reject) => {
            if (!this.ready) {
                reject(new Error('Stockfish no está listo'));
                return;
            }

            let isFinished = false;

            const cleanup = () => {
                if (!isFinished) {
                    isFinished = true;
                    this.isSearching = false;
                    // Eliminar este handler específico de la lista de resolvers
                    this.resolvers = this.resolvers.filter(r => r !== messageHandler);
                    
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
                this.worker?.postMessage('stop');
                cleanup();
                reject(new DOMException('Aborted', 'AbortError'));
            };

            signal?.addEventListener('abort', onAbort);

            const messageHandler = (line) => {
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

                    if (onProgress && mvIdx === 1) {
                        onProgress({ score: lines[1].score, mate: lines[1].mate, bestMove: lines[1].move });
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

            this.resolvers.push(messageHandler);
            this.worker.postMessage(`setoption name MultiPV value ${multiPv}`);
            this.worker.postMessage('ucinewgame');
            this.worker.postMessage('isready');
            this.worker.postMessage(`position fen ${fen}`);
            this.worker.postMessage(`go depth ${depth}`);
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
        this.resolvers = [];
        this.isSearching = false;
        if (this._resolveIdle) {
            this._resolveIdle();
            this._resolveIdle = null;
        }
        this._idlePromise = Promise.resolve();
    }
}


export const stockfishService = new StockfishService();