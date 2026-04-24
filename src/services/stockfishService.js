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
        this.resolvers = [];
        this._initPromise = null;
        this._resolveIdle = null;
        this._idlePromise = Promise.resolve();
        this.ready = false;
        this.isSearching = false;
        this._config = { ...DEFAULT_ENGINE_CONFIG };
    }

    init(config = {}) {
        if (this._initPromise) return this._initPromise;

        this._config = { ...DEFAULT_ENGINE_CONFIG, ...config };

        this._initPromise = new Promise((resolve, reject) => {
            try {
                this.worker = new Worker(ENGINE_PATH, { type: 'classic' });
            } catch (e) {
                this._initPromise = null;
                reject(new Error(`No se pudo cargar Stockfish: ${e.message}`));
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

                if (line === 'readyok') {
                    this.ready = true;
                    resolve();
                }

                if (this.resolvers.length > 0) {
                    this.resolvers[0](line);
                }
            };

            this.worker.onerror = (e) => {
                console.error('Stockfish worker error:', e);
                this.destroy();
                reject(e);
            };

            this.worker.postMessage('uci');
        });

        return this._initPromise;
    }

    async analyzePosition(fen, depth, signal, onProgress, multiPv) {
        await this._idlePromise;

        const effectiveMultiPv = multiPv ?? this._config.multiPv;

        // ---------------------------------------------------------------
        // NORMALIZACIÓN DE MARCO (crítico)
        //
        // Stockfish UCI emite "score cp X" RELATIVO al jugador que mueve:
        //   X > 0 → bueno para quien mueve   (no necesariamente Blancas)
        //   X < 0 → malo para quien mueve
        //
        // Todo el código downstream (ChessMath, EvaluationEngine, AnalysisQueue)
        // asume el marco ABSOLUTO de Blancas (positivo = Blancas mejor).
        //
        // Solución: determinar el turno una vez desde el FEN y aplicar
        // isBlackTurn ? -raw : raw a cada score/mate antes de almacenarlos.
        // ---------------------------------------------------------------
        const isBlackTurn = fen.includes(' b ');

        return new Promise((resolve, reject) => {
            if (!this.ready) {
                reject(new Error('Stockfish no esta listo'));
                return;
            }

            let isFinished = false;

            const cleanup = () => {
                if (!isFinished) {
                    isFinished = true;
                    this.isSearching = false;
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

                    // Normalizar al marco absoluto de Blancas antes de guardar.
                    // Todos los consumidores downstream asumen que cp > 0 = Blancas mejor.
                    if (cpMatch) {
                        const relCp = parseInt(cpMatch[1]);
                        lines[mvIdx].score = isBlackTurn ? -relCp : relCp;  // ← esto corrige el 0%
                    }
                    if (mateMatch) {
                        const relMate = parseInt(mateMatch[1]);
                        lines[mvIdx].mate = isBlackTurn ? -relMate : relMate;
                        lines[mvIdx].score = 0;
                    }

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
            this.worker.postMessage(`setoption name MultiPV value ${effectiveMultiPv}`);
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