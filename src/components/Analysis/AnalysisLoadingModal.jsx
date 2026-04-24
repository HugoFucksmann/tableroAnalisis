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
import { useShallow } from 'zustand/react/shallow';
import { analysisQueue } from '../../services/analysisQueue';
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
        wantsFullAnalysis,
        setAnalysisReady,
        setAnalyzing,
    } = useGameStore(useShallow(state => ({
        history: state.history,
        analysisReady: state.analysisReady,
        analysisProgress: state.analysisProgress,
        openingName: state.openingName,
        ecoCode: state.ecoCode,
        openingDetected: state.openingDetected,
        gameId: state.gameId,
        wantsFullAnalysis: state.wantsFullAnalysis,
        setAnalysisReady: state.setAnalysisReady,
        setAnalyzing: state.setAnalyzing,
    })));

    // No mostrar si no hay partida, si ya terminó el análisis completo, o si es juego libre (sin gameId)
    if (history.length === 0 || analysisReady || !gameId || !wantsFullAnalysis) return null;

    const handleCancel = () => {
        analysisQueue.cancel();
        setAnalysisReady(true);
        setAnalyzing(false);
    };

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
                    <SimpleSpinner />
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

                <button className="analysis-modal-cancel-btn" onClick={handleCancel}>
                    Interrumpir Análisis
                </button>
            </div>
        </div>
    );
};

// Spinner circular simple
const SimpleSpinner = () => (
    <svg
        className="simple-spinner"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
    >
        <circle
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="3"
            strokeDasharray="45"
            strokeDashoffset="0"
            strokeLinecap="round"
        />
    </svg>
);