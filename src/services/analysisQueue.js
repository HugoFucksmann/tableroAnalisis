/**
 * analysisQueue.js
 *
 * Orquesta el análisis completo de una partida:
 *   1. Analiza primero la posición actualmente visible (profundidad alta)
 *   2. Analiza el resto en background (profundidad menor), de la posición
 *      actual hacia afuera (primero las cercanas, luego las lejanas)
 *   3. Notifica al store con cada resultado parcial para actualización en tiempo real
 *
 * Usa AbortController para cancelar cualquier análisis en curso cuando
 * se carga una nueva partida.
 */

import { Chess } from 'chess.js';
import { stockfishService, DEPTH_CURRENT, DEPTH_BACKGROUND } from './stockfishService';

/**
 * Convierte centipawns a un score normalizado en el rango [-10, +10]
 * siempre desde la perspectiva de las blancas.
 *
 * @param {number} cp        centipawns (perspectiva del jugador que mueve)
 * @param {number|null} mate número de movimientos hasta mate (null si no hay)
 * @param {boolean} isBlackTurn si es true, invertimos el signo
 * @returns {number}
 */
function cpToScore(cp, mate, isBlackTurn) {
    if (mate !== null) {
        // Mate: máximo valor, signo según quién da el mate
        const sign = mate > 0 ? 1 : -1;
        return isBlackTurn ? -sign * 10 : sign * 10;
    }
    // Convertir a pawns y limitar a ±10
    const pawns = cp / 100;
    const normalized = Math.max(-10, Math.min(10, pawns));
    return isBlackTurn ? -normalized : normalized;
}

/**
 * Clasifica la calidad de un movimiento comparando la evaluación
 * antes y después del movimiento (siempre desde perspectiva de blancas).
 *
 * @param {number} scoreBefore  score ANTES del movimiento (perspectiva blancas)
 * @param {number} scoreAfter   score DESPUÉS del movimiento (perspectiva blancas)
 * @param {boolean} isWhiteMove si es true, blancas hicieron el movimiento
 * @returns {string} etiqueta de evaluación
 */
function classifyMove(scoreBefore, scoreAfter, isWhiteMove) {
    // La pérdida siempre es negativa para quien mueve
    const loss = isWhiteMove
        ? scoreBefore - scoreAfter   // blancas quieren score alto
        : scoreAfter - scoreBefore;  // negras quieren score bajo

    if (loss <= -3.0) return 'Brillante';   // ganó mucho terreno
    if (loss <= -0.5) return 'Mejor';       // mejoró la posición
    if (loss <= 0.1) return 'Excelente';   // prácticamente igual
    if (loss <= 0.3) return 'Bueno';
    if (loss <= 0.6) return 'Imprecisión';
    if (loss <= 1.5) return 'Error';
    return 'Error grave';
}

/**
 * Calcula la precisión total de la partida (0–100) estilo Chess.com.
 * Usa la suma de pérdidas por movimiento normalizada.
 */
function calculateAccuracy(moveEvals) {
    if (moveEvals.length === 0) return { white: 100, black: 100 };

    const whiteLosses = moveEvals.filter((_, i) => i % 2 === 0).map(e => Math.max(0, e.loss));
    const blackLosses = moveEvals.filter((_, i) => i % 2 === 1).map(e => Math.max(0, e.loss));

    const avgLoss = (losses) => {
        if (losses.length === 0) return 0;
        return losses.reduce((a, b) => a + b, 0) / losses.length;
    };

    // Fórmula: accuracy = 103.1668 * e^(-0.04354 * avgLoss_in_centipawns) - 3.1669
    // Adaptada de la fórmula pública de Chess.com
    const formula = (avgLossCp) => {
        const result = 103.1668 * Math.exp(-0.04354 * avgLossCp) - 3.1669;
        return Math.max(0, Math.min(100, result));
    };

    return {
        white: Math.round(formula(avgLoss(whiteLosses) * 100)),
        black: Math.round(formula(avgLoss(blackLosses) * 100)),
    };
}

class AnalysisQueue {
    constructor() {
        this.abortController = null;
        this.isRunning = false;
    }

    /**
     * Cancela cualquier análisis en curso.
     */
    cancel() {
        if (this.abortController) {
            this.abortController.abort();
            this.abortController = null;
        }
        stockfishService.stop();
        this.isRunning = false;
    }

    /**
     * Analiza una partida completa.
     *
     * @param {object[]} history     historial verbose del store (objetos con .from .to .san)
     * @param {number} currentIndex  índice del movimiento actualmente visible
     * @param {object} storeActions  { setMoveEvaluation, setEvaluation, setAnalyzing,
     *                                 setGameScore, setAnalysisProgress, setBestMove }
     */
    async analyzeGame(history, currentIndex, storeActions) {
        this.cancel(); // Cancelar análisis anterior si existe

        if (history.length === 0) return;

        this.abortController = new AbortController();
        const { signal } = this.abortController;
        this.isRunning = true;

        const {
            setMoveEvaluation,
            setEvaluation,
            setAnalyzing,
            setGameScore,
            setAnalysisProgress,
            setBestMove,
        } = storeActions;

        try {
            await stockfishService.init();
        } catch (e) {
            console.error('No se pudo inicializar Stockfish:', e);
            setAnalyzing(false);
            return;
        }

        setAnalyzing(true);
        setAnalysisProgress(0);

        // Construir lista de FENs para cada posición (posición ANTES de cada movimiento)
        // + posición final
        const positions = buildPositions(history);
        const totalPositions = positions.length; // history.length posiciones a analizar

        // Orden de análisis: primero el movimiento actual, luego el resto por distancia
        const analysisOrder = buildAnalysisOrder(history.length, currentIndex);

        const scores = new Array(totalPositions).fill(null); // score en cada posición
        const moveData = []; // { index, loss } para calcular precisión al final

        let completed = 0;

        for (const moveIndex of analysisOrder) {
            if (signal.aborted) break;

            // Posición ANTES del movimiento (para comparar con después)
            const fenBefore = positions[moveIndex];
            const fenAfter = positions[moveIndex + 1];
            if (!fenBefore || !fenAfter) continue;

            const isBlackTurn = fenBefore.includes(' b ');
            const isWhiteMove = !isBlackTurn;

            try {
                // Analizar posición antes del movimiento
                const depth = moveIndex === currentIndex ? DEPTH_CURRENT : DEPTH_BACKGROUND;

                let resultBefore = null;
                if (scores[moveIndex] === null) {
                    resultBefore = await stockfishService.analyzePosition(fenBefore, depth, signal);
                    if (signal.aborted) break;
                    scores[moveIndex] = cpToScore(resultBefore.score, resultBefore.mate, isBlackTurn);
                }

                // Analizar posición después del movimiento
                let resultAfter = null;
                if (scores[moveIndex + 1] === null) {
                    const isNextBlack = fenAfter.includes(' b ');
                    resultAfter = await stockfishService.analyzePosition(fenAfter, depth, signal);
                    if (signal.aborted) break;
                    scores[moveIndex + 1] = cpToScore(resultAfter.score, resultAfter.mate, isNextBlack);
                }

                const scoreBefore = scores[moveIndex];
                const scoreAfter = scores[moveIndex + 1];
                const evalLabel = classifyMove(scoreBefore, scoreAfter, isWhiteMove);
                const loss = isWhiteMove
                    ? scoreBefore - scoreAfter
                    : scoreAfter - scoreBefore;

                moveData.push({ index: moveIndex, loss });

                // Actualizar store en tiempo real
                setMoveEvaluation(moveIndex, evalLabel);
                setEvaluation(scoreAfter, moveIndex);

                // Si es el movimiento actual, actualizar también bestMove y barra de evaluación
                if (moveIndex === currentIndex && resultBefore) {
                    setBestMove(resultBefore.bestMove);
                }

                completed++;
                setAnalysisProgress(Math.round((completed / history.length) * 100));

            } catch (e) {
                if (e.name === 'AbortError') break;
                console.warn(`Error analizando movimiento ${moveIndex}:`, e);
            }
        }

        if (!signal.aborted) {
            // Calcular y guardar precisión total
            const accuracy = calculateAccuracy(moveData);
            setGameScore(accuracy);
            setAnalyzing(false);
            setAnalysisProgress(100);
        }

        this.isRunning = false;
    }
}

// ── Helpers ────────────────────────────────────────────────────────────────

/**
 * Construye un array de FENs con una entrada por posición:
 * [posición inicial, después del mov 0, después del mov 1, ...]
 */
function buildPositions(history) {
    const positions = [];
    const game = new Chess();
    positions.push(game.fen()); // posición inicial

    for (const move of history) {
        game.move(move);
        positions.push(game.fen());
    }

    return positions;
}

/**
 * Devuelve los índices de movimientos ordenados para análisis:
 * primero el currentIndex, luego los demás por distancia creciente.
 */
function buildAnalysisOrder(totalMoves, currentIndex) {
    const indices = Array.from({ length: totalMoves }, (_, i) => i);
    indices.sort((a, b) => {
        const da = Math.abs(a - currentIndex);
        const db = Math.abs(b - currentIndex);
        return da - db;
    });
    return indices;
}

// Singleton
export const analysisQueue = new AnalysisQueue();