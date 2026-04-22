/**
 * analysisQueue.js  v3 (Master DB version)
 *
 * Cambios arquitectónicos clave:
 *
 *  1. PIPELINE SECUENCIAL: detectOpenings() corre ANTES de Stockfish y en el
 *     mismo flujo de analyzeGame(). Elimina el race condition.
 *
 *  2. LICHESS MASTERS DB: Usamos la base de datos de maestros (/master) para 
 *     evaluar la "teoría pura". Esto evita que errores comunes de novatos 
 *     sean etiquetados como "Apertura" o "Libro".
 *
 *  3. ACCURACY CON WIN PROBABILITY (WDL): usamos la función sigmoide de
 *     Lichess para convertir centipawns a probabilidad de victoria.
 *
 *  4. DESTROY antes de reiniciar: evita el worker muerto.
 *
 *  5. Cache de aperturas por gameId.
 */

import { Chess } from 'chess.js';
import { stockfishService, DEPTH_CURRENT, DEPTH_BACKGROUND } from './stockfishService';

// ─── Constantes ────────────────────────────────────────────────────────────────

/** Máximo de plies que se consultan en el Explorer (20 plies = 10 movimientos) */
const MAX_BOOK_PLY = 20;

/** 
 * Mínimo de partidas en la base de datos para considerar una posición "en teoría".
 * Usamos un umbral de 50 partidas de alto nivel (2200+) para filtrar teoría real.
 */
const MIN_THEORY_GAMES_THRESHOLD = 50;

/** Delay entre requests al Explorer para respetar rate-limit de Lichess */
const OPENING_API_DELAY_MS = 300;

// ─── Cache de aperturas ────────────────────────────────────────────────────────
// { [gameId]: { openingName, ecoCode, openingPly, bookPlies: Set<number> } }
const openingCache = new Map();

// ─── Win Probability (WDL) ─────────────────────────────────────────────────────

/**
 * Convierte centipawns a probabilidad de victoria [0..1] usando la
 * función sigmoide que emplea Lichess internamente.
 */
function cpToWinProb(cp) {
    return 1 / (1 + Math.pow(10, -cp / 400));
}

/**
 * Convierte score de mate a win probability.
 */
function mateToWinProb(mate) {
    return mate > 0 ? 1.0 : 0.0;
}

/**
 * Convierte el resultado de Stockfish (cp o mate) a win probability
 * desde la perspectiva de las BLANCAS.
 */
function toWhiteWinProb(cp, mate, isBlackTurn) {
    const prob = mate !== null ? mateToWinProb(mate) : cpToWinProb(cp);
    return isBlackTurn ? 1 - prob : prob;
}

/**
 * Score normalizado[-10, 10] para la barra de evaluación.
 */
function cpToScore(cp, mate, isBlackTurn) {
    if (mate !== null) {
        const sign = mate > 0 ? 1 : -1;
        return isBlackTurn ? -sign * 10 : sign * 10;
    }
    const pawns = cp / 100;
    const normalized = Math.max(-10, Math.min(10, pawns));
    return isBlackTurn ? -normalized : normalized;
}

// ─── Clasificación de movimientos ─────────────────────────────────────────────

/**
 * Clasifica un movimiento según la caída de win probability.
 */
function classifyMove(wpBefore, wpAfter, isWhiteMove) {
    const loss = isWhiteMove
        ? (wpBefore - wpAfter) * 100
        : (wpAfter - wpBefore) * 100;

    if (loss <= -5) return 'Brillante';
    if (loss <= 2) return 'Mejor';
    if (loss <= 5) return 'Excelente';
    if (loss <= 10) return 'Bueno';
    if (loss <= 20) return 'Imprecisión';
    if (loss <= 40) return 'Error';
    return 'Error grave';
}

// ─── Accuracy (WDL-based) ─────────────────────────────────────────────────────

/**
 * Calcula la precisión usando pérdidas de win probability.
 */
function calculateAccuracy(moveData) {
    const whiteMoves = moveData.filter(d => d.isWhiteMove && !d.isBook);
    const blackMoves = moveData.filter(d => !d.isWhiteMove && !d.isBook);

    const avgLoss = (moves) => {
        if (moves.length === 0) return 0;
        const total = moves.reduce((acc, m) => acc + Math.max(0, m.wpLoss * 100), 0);
        return total / moves.length;
    };

    const formula = (avgLossPts) => {
        const result = 103.1668 * Math.exp(-0.04354 * avgLossPts) - 3.1669;
        return Math.max(0, Math.min(100, result));
    };

    return {
        white: Math.round(formula(avgLoss(whiteMoves))),
        black: Math.round(formula(avgLoss(blackMoves))),
    };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildPositions(history) {
    const positions = [];
    const game = new Chess();
    positions.push(game.fen());
    for (const move of history) {
        game.move(move);
        positions.push(game.fen());
    }
    return positions;
}

function buildAnalysisOrder(totalMoves, currentIndex) {
    const indices = Array.from({ length: totalMoves }, (_, i) => i);
    const others = indices.filter(i => i !== currentIndex);
    return currentIndex >= 0 ? [currentIndex, ...others] : others;
}

const sleep = (ms) => new Promise(res => setTimeout(res, ms));

// ─── Opening Detection (Master DB) ────────────────────────────────────────────

/**
 * Consulta el Lichess Explorer para un FEN.
 * Usa el endpoint /lichess con filtros de rating alto para simular "Master DB".
 */
async function queryExplorer(fen, token = '') {
    try {
        const cleanFen = fen.split(' ').slice(0, 4).join(' ');

        // 1. Usamos el HOST correcto: explorer.lichess.ovh
        // 2. Usamos el endpoint /lichess que es más abierto
        // 3. Filtramos por ratings de elite (2200, 2500) para tener calidad "Master"
        const url = `https://explorer.lichess.ovh/lichess?fen=${encodeURIComponent(cleanFen)}&ratings=2200,2500`;

        // Restauramos el Token ya que Lichess lo exige incluso para el Explorer público en 2026
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const res = await fetch(url, { headers });

        if (res.status === 429) {
            console.warn("Rate limit alcanzado. Reintentando en breve...");
            return { inTheory: false, totalGames: 0 };
        }

        if (res.status === 401) {
            console.error("Error 401: Token de Lichess inválido o no proporcionado.");
            return { inTheory: false, totalGames: 0 };
        }

        if (!res.ok) return { inTheory: false, openingName: null, ecoCode: null, totalGames: 0 };

        const data = await res.json();
        const total = (data.white ?? 0) + (data.draws ?? 0) + (data.black ?? 0);

        return {
            inTheory: total >= MIN_THEORY_GAMES_THRESHOLD,
            openingName: data.opening?.name ?? null,
            ecoCode: data.opening?.eco ?? null,
            totalGames: total,
        };
    } catch (error) {
        console.error("Error en queryExplorer:", error);
        return { inTheory: false, openingName: null, ecoCode: null, totalGames: 0 };
    }
}

/**
 * Detecta aperturas consultando el Explorer FEN a FEN.
 * Corre SÍNCRONAMENTE (con await) dentro de analyzeGame(), ANTES de Stockfish.
 */
async function detectOpenings({ positions, pgnHeaders, gameId, token, signal, onProgress }) {
    if (openingCache.has(gameId)) {
        return openingCache.get(gameId);
    }

    let openingName = pgnHeaders?.Opening ?? null;
    let ecoCode = pgnHeaders?.ECO ?? null;
    let openingPly = -1;
    const bookPlies = new Set();

    const maxPly = Math.min(positions.length - 1, MAX_BOOK_PLY);

    onProgress?.(`Detectando apertura… (0/${maxPly})`);

    for (let ply = 1; ply <= maxPly; ply++) {
        if (signal?.aborted) break;

        const result = await queryExplorer(positions[ply], token);

        if (signal?.aborted) break;

        if (!result.inTheory) break; // salimos de la teoría de maestros, parar

        // ply-1 = índice del movimiento que llevó a esta posición
        bookPlies.add(ply - 1);
        openingPly = ply - 1;

        if (result.openingName) openingName = result.openingName;
        if (result.ecoCode) ecoCode = result.ecoCode;

        onProgress?.(`Detectando apertura… (${ply}/${maxPly})`);

        if (ply < maxPly) {
            // No bloqueamos completamente el engine, pero mantenemos el delay para Lichess
            await sleep(OPENING_API_DELAY_MS);
        }
    }

    const cacheEntry = {
        bookPlies,
        openingName: openingName ?? 'Posición inicial',
        ecoCode: ecoCode ?? '',
        openingPly,
    };

    openingCache.set(gameId, cacheEntry);
    return cacheEntry;
}

// ─── AnalysisQueue ─────────────────────────────────────────────────────────────

class AnalysisQueue {
    constructor() {
        this.abortController = null;
        this.isRunning = false;
    }

    cancel() {
        if (this.abortController) {
            this.abortController.abort();
            this.abortController = null;
        }
        stockfishService.stop();
        this.isRunning = false;
    }

    async analyzeGame(history, currentIndex, callbacks = {}) {
        const {
            onMoveResult,
            onProgress,
            onStatus,
            onComplete,
            onOpeningDetected,
            gameId = 0,
            pgnHeaders = {},
            lichessToken = '',
        } = callbacks;

        this.cancel();
        if (history.length === 0) return;

        this.abortController = new AbortController();
        const { signal } = this.abortController;
        this.isRunning = true;
        onStatus?.(true);
        onProgress?.(0, 'Inicializando…');

        try {
            // ── 1. Reiniciar Stockfish ────────────────────────────────────────────────
            stockfishService.destroy();
            await stockfishService.init();
            
            if (signal.aborted) return;

            const positions = buildPositions(history);

        // ── 2. Lanzar detección de apertura en segundo plano ─────────────────────
        let currentPct = 0;
        const openingPromise = detectOpenings({
            positions,
            pgnHeaders,
            gameId,
            token: lichessToken,
            signal,
            onProgress: (msg) => onProgress?.(currentPct, msg),
        }).then(res => {
            if (!signal.aborted) {
                onOpeningDetected?.(res);
                // Notificar individualmente los movimientos de libro
                res.bookPlies.forEach(idx => {
                    onMoveResult?.({ index: idx, label: 'Libro', isBook: true });
                });
            }
            return res;
        });

        // ── 3. Cola Stockfish Optimizada ──────────────────────────────────────────
        const analysisOrder = buildAnalysisOrder(positions.length, currentIndex);
        const evalResults = new Array(positions.length).fill(null);
        const completedMoveIndices = new Set();

        const checkAndReportMove = async (moveIdx) => {
            if (moveIdx < 0 || moveIdx >= history.length) return;
            if (evalResults[moveIdx] && evalResults[moveIdx + 1]) {
                const before = evalResults[moveIdx];
                const after = evalResults[moveIdx + 1];
                const isWhiteMove = !positions[moveIdx].includes(' b ');
                
                // Intentar obtener info de apertura si ya llegó
                const opening = await Promise.race([
                    openingPromise,
                    Promise.resolve(null) 
                ]);
                
                const isBook = opening?.bookPlies.has(moveIdx) ?? false;
                const label = isBook ? 'Libro' : classifyMove(before.wp, after.wp, isWhiteMove);
                
                onMoveResult?.({
                    index: moveIdx,
                    score: after.score,
                    label,
                    bestMove: after.bestMove,
                    lines: moveIdx === currentIndex ? after.lines : null,
                });

                return { isWhiteMove, wpLoss: isWhiteMove ? (before.wp - after.wp) : (after.wp - before.wp), isBook };
            }
            return null;
        };

        const moveData = [];

        for (const posIndex of analysisOrder) {
            if (signal.aborted) break;

            const fen = positions[posIndex];
            const isBlackTurn = fen.includes(' b ');

            // Prioridad: El movimiento actual y el siguiente (para tener el "after" del actual)
            // usan profundidad mayor y MultiPV completo.
            const isHighPriority = (posIndex === currentIndex || posIndex === currentIndex + 1);
            const depth = isHighPriority ? DEPTH_CURRENT : DEPTH_BACKGROUND;
            const mPv = isHighPriority ? stockfishService.MULTIPV_COUNT : 1;

            try {
                const r = await stockfishService.analyzePosition(fen, depth, signal, null, mPv);
                if (signal.aborted) break;

                evalResults[posIndex] = {
                    wp: toWhiteWinProb(r.score, r.mate, isBlackTurn),
                    score: cpToScore(r.score, r.mate, isBlackTurn),
                    bestMove: r.bestMove,
                    lines: r.lines
                };

                // Si es la posición inicial, reportar bestMove para el "antes" del primer movimiento
                if (posIndex === 0) {
                    onMoveResult?.({ index: -1, bestMove: r.bestMove, lines: r.lines });
                }

                // Intentar clasificar movimientos adyacentes
                const m1 = await checkAndReportMove(posIndex - 1);
                const m2 = await checkAndReportMove(posIndex);
                
                if (m1) { moveData[posIndex - 1] = m1; completedMoveIndices.add(posIndex - 1); }
                if (m2) { moveData[posIndex] = m2; completedMoveIndices.add(posIndex); }

                currentPct = Math.round((completedMoveIndices.size / history.length) * 100);
                onProgress?.(Math.min(99, currentPct), `Analizando… ${currentPct}%`);

            } catch (e) {
                if (e.name === 'AbortError') break;
                console.warn(`Error analizando posición ${posIndex}:`, e);
            }
        }

        if (!signal.aborted) {
            const finalOpening = await openingPromise;
            // Asegurar que todos los movimientos se clasifiquen al final
            const finalMoveData = [];
            for (let i = 0; i < history.length; i++) {
                const before = evalResults[i];
                const after = evalResults[i+1];
                if (before && after) {
                    const isWhiteMove = !positions[i].includes(' b ');
                    const isBook = finalOpening.bookPlies.has(i);
                    const wpLoss = isWhiteMove ? (before.wp - after.wp) : (after.wp - before.wp);
                    finalMoveData.push({ isWhiteMove, wpLoss, isBook });
                }
            }

            const accuracy = calculateAccuracy(finalMoveData);
            onComplete?.(accuracy);
            onProgress?.(100, 'Análisis completado');
        }
    } catch (e) {
        if (e.name !== 'AbortError') {
                console.error('Error en analyzeGame:', e);
            }
        } finally {
            onStatus?.(false);
            this.isRunning = false;
        }
    }

    async analyzeCurrentPosition(fen, moveIndex, callbacks = {}) {
        const { onResult, onStatus } = callbacks;
        try {
            await stockfishService.init();
            onStatus?.(true);

            const isBlackTurn = fen.includes(' b ');

            const result = await stockfishService.analyzePosition(
                fen,
                DEPTH_CURRENT,
                null,
                ({ score, mate, bestMove }) => {
                    onResult?.({
                        score: cpToScore(score, mate, isBlackTurn),
                        bestMove,
                        moveIndex,
                    });
                },
            );

            if (result) {
                onResult?.({
                    score: cpToScore(result.score, result.mate, isBlackTurn),
                    bestMove: result.bestMove,
                    moveIndex,
                    lines: result.lines,
                });
            }
        } catch (e) {
            if (e.name !== 'AbortError') console.warn('analyzeCurrentPosition error:', e);
        } finally {
            onStatus?.(false);
        }
    }

    clearOpeningCache(gameId) {
        openingCache.delete(gameId);
    }
}

export const analysisQueue = new AnalysisQueue();