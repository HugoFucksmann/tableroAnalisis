/**
 * analysisQueue.js
 *
 * Orquesta el análisis completo de una partida:
 *   1. Analiza primero la posición actualmente visible (profundidad alta)
 *   2. Analiza el resto en background (profundidad menor), de la posición
 *      actual hacia afuera (primero las cercanas, luego las lejanas)
 *   3. Notifica al store con cada resultado parcial para actualización en tiempo real
 *
 * bestMoves se indexan por el moveIndex de la posición que MUESTRA el tablero:
 *   - currentMoveIndex = -1  → posición inicial → bestMoves[-1]
 *   - currentMoveIndex =  N  → posición tras el movimiento N → bestMoves[N]
 */

import { Chess } from 'chess.js';
import { stockfishService, DEPTH_CURRENT, DEPTH_BACKGROUND } from './stockfishService';

function cpToScore(cp, mate, isBlackTurn) {
    if (mate !== null) {
        const sign = mate > 0 ? 1 : -1;
        return isBlackTurn ? -sign * 10 : sign * 10;
    }
    const pawns = cp / 100;
    const normalized = Math.max(-10, Math.min(10, pawns));
    return isBlackTurn ? -normalized : normalized;
}

function classifyMove(scoreBefore, scoreAfter, isWhiteMove) {
    const loss = isWhiteMove
        ? scoreBefore - scoreAfter
        : scoreAfter - scoreBefore;

    if (loss <= -3.0) return 'Brillante';
    if (loss <= -0.5) return 'Mejor';
    if (loss <= 0.1) return 'Excelente';
    if (loss <= 0.3) return 'Bueno';
    if (loss <= 0.6) return 'Imprecisión';
    if (loss <= 1.5) return 'Error';
    return 'Error grave';
}

function calculateAccuracy(moveEvals) {
    if (moveEvals.length === 0) return { white: 100, black: 100 };
    const whiteLosses = moveEvals.filter((_, i) => i % 2 === 0).map(e => Math.max(0, e.loss));
    const blackLosses = moveEvals.filter((_, i) => i % 2 === 1).map(e => Math.max(0, e.loss));
    const avgLoss = (losses) =>
        losses.length === 0 ? 0 : losses.reduce((a, b) => a + b, 0) / losses.length;
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
     * @param {object[]} history     historial verbose del store
     * @param {number}   currentIndex  índice del movimiento actualmente visible
     * @param {object}   storeActions  acciones del store
     */
    async analyzeGame(history, currentIndex, storeActions) {
        this.cancel();
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
            setBestMoveForIndex,  // ← nuevo (reemplaza setBestMove)
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

        const positions = buildPositions(history);
        const totalPositions = positions.length;

        const analysisOrder = buildAnalysisOrder(history.length, currentIndex);

        // scores[i]    = evaluación numérica de positions[i] (perspectiva blancas)
        // bestMoveCache[i] = mejor movimiento UCI en positions[i]
        const scores = new Array(totalPositions).fill(null);
        const bestMoveCache = new Array(totalPositions).fill(null);

        const moveData = [];
        let completed = 0;

        for (const moveIndex of analysisOrder) {
            if (signal.aborted) break;

            const fenBefore = positions[moveIndex];
            const fenAfter = positions[moveIndex + 1];
            if (!fenBefore || !fenAfter) continue;

            const isBlackTurn = fenBefore.includes(' b ');
            const isWhiteMove = !isBlackTurn;
            const depth = moveIndex === currentIndex ? DEPTH_CURRENT : DEPTH_BACKGROUND;

            try {
                // ── Analizar posición ANTES del movimiento ──────────────────
                if (scores[moveIndex] === null) {
                    const result = await stockfishService.analyzePosition(fenBefore, depth, signal);
                    if (signal.aborted) break;
                    scores[moveIndex] = cpToScore(result.score, result.mate, isBlackTurn);
                    bestMoveCache[moveIndex] = result.bestMove;

                    // positions[0] = posición inicial → bestMoves[-1]
                    if (moveIndex === 0) {
                        setBestMoveForIndex(-1, result.bestMove);
                    }
                }

                // ── Analizar posición DESPUÉS del movimiento ────────────────
                if (scores[moveIndex + 1] === null) {
                    const isNextBlack = fenAfter.includes(' b ');
                    const result = await stockfishService.analyzePosition(fenAfter, depth, signal);
                    if (signal.aborted) break;
                    scores[moveIndex + 1] = cpToScore(result.score, result.mate, isNextBlack);
                    bestMoveCache[moveIndex + 1] = result.bestMove;
                }

                // ── Guardar mejor jugada para la posición visible ───────────
                // Cuando currentMoveIndex = moveIndex, el tablero muestra
                // positions[moveIndex + 1] → su mejor jugada es bestMoveCache[moveIndex + 1]
                const bestMoveForThisPos = bestMoveCache[moveIndex + 1];
                if (bestMoveForThisPos) {
                    setBestMoveForIndex(moveIndex, bestMoveForThisPos);
                }

                // ── Clasificar el movimiento ────────────────────────────────
                const scoreBefore = scores[moveIndex];
                const scoreAfter = scores[moveIndex + 1];
                const evalLabel = classifyMove(scoreBefore, scoreAfter, isWhiteMove);
                const loss = isWhiteMove
                    ? scoreBefore - scoreAfter
                    : scoreAfter - scoreBefore;

                moveData.push({ index: moveIndex, loss });

                setMoveEvaluation(moveIndex, evalLabel);
                setEvaluation(scoreAfter, moveIndex);

                completed++;
                setAnalysisProgress(Math.round((completed / history.length) * 100));

            } catch (e) {
                if (e.name === 'AbortError') break;
                console.warn(`Error analizando movimiento ${moveIndex}:`, e);
            }
        }

        if (!signal.aborted) {
            const accuracy = calculateAccuracy(moveData);
            setGameScore(accuracy);
            setAnalyzing(false);
            setAnalysisProgress(100);
        }

        this.isRunning = false;
    }

    /**
     * Análisis rápido on-demand de una posición FEN concreta.
     * Usado por el botón "Mejor Jugada" en BoardControls.
     *
     * @param {string} fen
     * @param {number} moveIndex  índice que se mostrará (para indexar en bestMoves)
     * @param {object} storeActions
     */
    async analyzeCurrentPosition(fen, moveIndex, storeActions) {
        const { setBestMoveForIndex, setAnalyzing, setEvaluation } = storeActions;

        try {
            await stockfishService.init();
            setAnalyzing(true);
            
            const isBlackTurn = fen.includes(' b ');
            
            const onProgress = ({ score, mate, bestMove }) => {
                if (setEvaluation) {
                    setEvaluation(cpToScore(score, mate, isBlackTurn), moveIndex);
                }
                if (bestMove) {
                    setBestMoveForIndex(moveIndex, bestMove);
                }
            };

            const result = await stockfishService.analyzePosition(fen, DEPTH_CURRENT, null, onProgress);
            
            if (result) {
                if (setEvaluation) {
                    setEvaluation(cpToScore(result.score, result.mate, isBlackTurn), moveIndex);
                }
                if (result.bestMove) {
                    setBestMoveForIndex(moveIndex, result.bestMove);
                }
            }
        } catch (e) {
            console.warn('analyzeCurrentPosition error:', e);
        } finally {
            setAnalyzing(false);
        }
    }
}

// ── Helpers ────────────────────────────────────────────────────────────────

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
    // Priorizamos el movimiento actual para feedback inmediato, 
    // y luego analizamos el resto en orden secuencial (del inicio al fin)
    const others = indices.filter(i => i !== currentIndex);
    return currentIndex >= 0 ? [currentIndex, ...others] : others;
}

export const analysisQueue = new AnalysisQueue();