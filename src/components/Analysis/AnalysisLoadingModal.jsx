import React from 'react';
import { useGameStore } from '../../store/useGameStore';
import { useShallow } from 'zustand/react/shallow';
import { analysisBridge } from '../../services/analysisBridge';
import './AnalysisLoadingModal.css';

export const AnalysisLoadingModal = () => {
    const {
        history,
        analysisReady,
        analysisProgress,
        analysisLabel,
        openingName,
        ecoCode,
        openingDetected,
        gameId,
        isReviewRequested,
        isCanceling,
    } = useGameStore(useShallow(state => ({
        history: state.history,
        analysisReady: state.analysisReady,
        analysisProgress: state.analysisProgress,
        analysisLabel: state.analysisLabel,
        openingName: state.openingName,
        ecoCode: state.ecoCode,
        openingDetected: state.openingDetected,
        gameId: state.gameId,
        isReviewRequested: state.isReviewRequested,
        isCanceling: state.isCanceling,
    })));

    if (history.length === 0 || analysisReady || !gameId || !isReviewRequested) return null;

    const handleCancel = () => {
        analysisBridge.cancel();
    };

    let phase = analysisLabel;
    if (!phase) {
        if (analysisProgress < 100) {
            phase = `Analizando posiciones… ${analysisProgress}%`;
        } else if (!openingDetected) {
            phase = 'Consultando teoría de aperturas…';
        } else {
            phase = 'Generando reporte final…';
        }
    }

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

                <button className="analysis-modal-cancel-btn" onClick={handleCancel} disabled={isCanceling}>
                    {isCanceling ? 'Cancelando...' : 'Interrumpir Análisis'}
                </button>
            </div>
        </div>
    );
};

const SimpleSpinner = () => (
    <svg className="simple-spinner" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="45" strokeDashoffset="0" strokeLinecap="round" />
    </svg>
);