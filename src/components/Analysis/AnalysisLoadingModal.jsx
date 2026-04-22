/**
 * AnalysisLoadingModal.jsx
 *
 * Modal bloqueante que cubre la UI mientras corre el análisis completo.
 * Se muestra cuando:
 *   - hay una partida cargada (history.length > 0)
 *   - analysisReady === false
 *
 * Desaparece automáticamente cuando analysisQueue llama onComplete()
 * y el store setea analysisReady = true.
 *
 * Muestra:
 *   - Nombre de apertura detectado (actualizado en tiempo real)
 *   - Barra de progreso animada
 *   - Porcentaje de análisis de Stockfish
 */
import React from 'react';
import { useGameStore } from '../../store/useGameStore';
import './AnalysisLoadingModal.css';

export const AnalysisLoadingModal = () => {
    const {
        history,
        analysisReady,
        analysisProgress,
        openingName,
        ecoCode,
        openingDetected,
        gameId,
    } = useGameStore();

    // No mostrar si no hay partida, si ya terminó el análisis completo, o si es juego libre (sin gameId)
    if (history.length === 0 || analysisReady || !gameId) return null;

    // Fase actual basada en el progreso
    const phase = !openingDetected
        ? 'Detectando apertura…'
        : analysisProgress < 100
            ? `Analizando con Stockfish… ${analysisProgress}%`
            : 'Finalizando…';

    return (
        <div className="analysis-modal-overlay">
            <div className="analysis-modal-card">

                <div className="analysis-modal-icon">
                    <ChessKnightSpinner />
                </div>

                <h2 className="analysis-modal-title">Analizando partida</h2>

                {openingDetected && openingName && (
                    <div className="analysis-modal-opening">
                        {ecoCode && <span className="eco-badge">{ecoCode}</span>}
                        <span className="opening-text">{openingName}</span>
                    </div>
                )}

                <p className="analysis-modal-phase">{phase}</p>

                <div className="analysis-modal-progress-track">
                    <div
                        className="analysis-modal-progress-fill"
                        style={{ width: `${Math.max(3, analysisProgress)}%` }}
                    />
                </div>

                <p className="analysis-modal-hint">
                    El análisis corre una sola vez por partida
                </p>
            </div>
        </div>
    );
};

// Spinner SVG de pieza de ajedrez (caballo) — sin dependencias externas
const ChessKnightSpinner = () => (
    <svg
        className="knight-spinner"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
    >
        <path
            d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeDasharray="40"
            strokeDashoffset="0"
            strokeLinecap="round"
        />
        {/* Caballo simplificado */}
        <path
            d="M9 17c0-2 1-3 2-4l1-3h2l-1 2h1c1 0 1 1 0 2l-1 1v2H9z"
            fill="currentColor"
            opacity="0.85"
        />
        <circle cx="11" cy="9" r="1" fill="currentColor" />
    </svg>
);