/**
 * stockfishService.js
 *
 * Singleton que gestiona la comunicación UCI con Stockfish corriendo
 * como Web Worker (WASM). Usa el archivo stockfish-16-single.js del
 * paquete `stockfish` (npm i stockfish), que no requiere headers CORS.
 *
 * SETUP REQUERIDO:
 *   1. npm i stockfish
 *   2. Copiar node_modules/stockfish/src/stockfish.js
 *             y node_modules/stockfish/src/stockfish.wasm
 *      a public/stockfish/
 *
 * El archivo en public/ es servido estático por Vite en /stockfish/...
 */

const STOCKFISH_PATH = '/stockfish/stockfish.js';

// Profundidades de análisis
export const DEPTH_CURRENT = 18; // posición actualmente visible (más precisa)
export const DEPTH_BACKGROUND = 15; // resto de la partida (más rápida)

class StockfishService {
    constructor() {
        this.worker = null;
        this.ready = false;
        this.resolvers = []; // cola de promesas pendientes
        this._initPromise = null;
    }

    /** Inicializa el worker y espera la secuencia UCI completa. */
    init() {
        if (this._initPromise) return this._initPromise;

        this._initPromise = new Promise((resolve, reject) => {
            try {
                this.worker = new Worker(STOCKFISH_PATH);
            } catch (e) {
                reject(new Error(`No se pudo cargar Stockfish: ${e.message}`));
                return;
            }

            let uciOk = false;

            this.worker.onmessage = (e) => {
                const line = e.data;
                // console.log('SF:', line); // Debug

                if (line === 'uciok') {
                    uciOk = true;
                    this.worker.postMessage('setoption name Threads value 1');
                    this.worker.postMessage('setoption name Hash value 16');
                    this.worker.postMessage('isready');
                }

                if (line === 'readyok') {
                    this.ready = true;
                    resolve();
                }

                // Distribuir a los resolvers si estamos analizando
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

            // Iniciar secuencia
            this.worker.postMessage('uci');
        });

        return this._initPromise;
    }

    /**
     * Analiza una posición FEN a la profundidad dada.
     * Devuelve { score, bestMove, pv } donde score está en centipawns
     * desde la perspectiva del jugador que mueve.
     *
     * @param {string} fen
     * @param {number} depth
     * @param {AbortSignal} signal - para cancelar análisis en curso
     * @param {function} onProgress - callback para actualizaciones en tiempo real (opcional)
     * @returns {Promise<{score: number, mate: number|null, bestMove: string, pv: string}>}
     */
    analyzePosition(fen, depth, signal, onProgress) {
        return new Promise((resolve, reject) => {
            if (!this.ready) {
                reject(new Error('Stockfish no está listo'));
                return;
            }

            if (signal?.aborted) {
                reject(new DOMException('Aborted', 'AbortError'));
                return;
            }

            let lastScore = 0;
            let lastMate = null;
            let lastBestMove = '';
            let lastPv = '';

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
                // Parsear líneas "info depth N ... score cp X" o "score mate X"
                if (line.startsWith('info') && line.includes('score')) {
                    const cpMatch = line.match(/score cp (-?\d+)/);
                    const mateMatch = line.match(/score mate (-?\d+)/);
                    const pvMatch = line.match(/ pv (.+)/);
                    const bmMatch = line.match(/currmove ([a-h][1-8][a-h][1-8][qrbn]?)/);

                    if (cpMatch) lastScore = parseInt(cpMatch[1]);
                    if (mateMatch) lastMate = parseInt(mateMatch[1]);
                    if (pvMatch) lastPv = pvMatch[1].trim();
                    if (bmMatch) lastBestMove = bmMatch[1];
                    
                    if (onProgress && (cpMatch || mateMatch)) {
                        onProgress({ score: lastScore, mate: lastMate, bestMove: lastBestMove });
                    }
                }

                // "bestmove" marca el fin del análisis
                if (line.startsWith('bestmove')) {
                    const bm = line.split(' ')[1];
                    if (bm && bm !== '(none)') lastBestMove = bm;
                    cleanup();
                    resolve({
                        score: lastScore,
                        mate: lastMate,
                        bestMove: lastBestMove,
                        pv: lastPv,
                    });
                }
            };

            this.resolvers.push(messageHandler);

            this.worker.postMessage('ucinewgame');
            this.worker.postMessage('isready'); // Asegurar estado limpio
            this.worker.postMessage(`position fen ${fen}`);
            this.worker.postMessage(`go depth ${depth}`);
        });
    }

    /** Detiene cualquier búsqueda en curso. */
    stop() {
        if (this.worker) this.worker.postMessage('stop');
    }

    /** Destruye el worker completamente. */
    destroy() {
        if (this.worker) {
            this.worker.postMessage('quit');
            this.worker.terminate();
            this.worker = null;
            this.ready = false;
            this._initPromise = null;
        }
    }
}

// Singleton — una sola instancia en toda la app
export const stockfishService = new StockfishService();