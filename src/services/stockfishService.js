/**
 * stockfishService.js  v3
 *
 * Fixes:
 *  - destroy() limpia _initPromise → sin worker muerto al cargar segunda partida
 *  - MultiPV=3 líneas alternativas por posición
 *  - Threads automáticos (hardwareConcurrency - 1, mínimo 1)
 *  - analyzePosition devuelve { score, mate, bestMove, pv, lines[] }
 */

const STOCKFISH_PATH = '/stockfish/stockfish.js';

export const DEPTH_CURRENT = 18;
export const DEPTH_BACKGROUND = 15;
export const MULTIPV_COUNT = 3;

function getOptimalThreads() {
    const cores = navigator.hardwareConcurrency ?? 2;
    return Math.max(1, cores - 1);
}

class StockfishService {
    constructor() {
        this.worker = null;
        this.ready = false;
        this.resolvers = [];
        this._initPromise = null;
        this._threads = getOptimalThreads();
    }

    init() {
        if (this._initPromise) return this._initPromise;

        this._initPromise = new Promise((resolve, reject) => {
            try {
                this.worker = new Worker(STOCKFISH_PATH);
            } catch (e) {
                this._initPromise = null;
                reject(new Error(`No se pudo cargar Stockfish: ${e.message}`));
                return;
            }

            this.worker.onmessage = (e) => {
                const line = e.data;

                if (line === 'uciok') {
                    this.worker.postMessage(`setoption name Threads value ${this._threads}`);
                    this.worker.postMessage('setoption name Hash value 64');
                    this.worker.postMessage(`setoption name MultiPV value ${MULTIPV_COUNT}`);
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
                this.ready = false;
                this._initPromise = null;
                reject(e);
            };

            this.worker.postMessage('uci');
        });

        return this._initPromise;
    }

    /**
     * Analiza una posición FEN.
     *
     * @returns {Promise<{
     *   score:    number,       centipawns desde perspectiva del que mueve
     *   mate:     number|null,
     *   bestMove: string,
     *   pv:       string,
     *   lines:    Array<{ multipv, score, mate, pv, move }>
     * }>}
     */
    analyzePosition(fen, depth, signal, onProgress, multiPv = MULTIPV_COUNT) {
        return new Promise((resolve, reject) => {
            if (!this.ready) {
                reject(new Error('Stockfish no está listo'));
                return;
            }
            if (signal?.aborted) {
                reject(new DOMException('Aborted', 'AbortError'));
                return;
            }

            const lines = {};
            let lastBestMove = '';

            const cleanup = () => {
                this.resolvers.shift();
                signal?.removeEventListener('abort', onAbort);
            };

            const onAbort = () => {
                this.worker.postMessage('stop');
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
                    if (!lines[1].move) lines[1].move = lastBestMove;

                    cleanup();
                    resolve({
                        score: lines[1].score,
                        mate: lines[1].mate ?? null,
                        bestMove: lastBestMove || lines[1].move,
                        pv: lines[1].pv,
                        lines: Object.values(lines).sort((a, b) => a.multipv - b.multipv),
                    });
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

    /**
     * Destruye el worker y resetea todo el estado.
     * CRÍTICO: limpia _initPromise para que init() funcione de nuevo.
     */
    destroy() {
        if (this.worker) {
            try { this.worker.postMessage('quit'); } catch { }
            this.worker.terminate();
        }
        this.worker = null;
        this.ready = false;
        this._initPromise = null;
        this.resolvers = [];
    }
}

export const stockfishService = new StockfishService();