import React from 'react';
import { Brain, X } from 'lucide-react';

export const BatchProgressOverlay = ({ batchStatus, onCancel }) => {
  if (!batchStatus) return null;

  return (
    <div className="gi-batch-overlay">
      <div className="gi-batch-card">
        <div className="gi-batch-header">
          <Brain size={18} className="gi-brain-icon" />
          <div className="gi-batch-title">
            <h4>Analizando Partidas</h4>
            <span>Partida {batchStatus.current + 1} de {batchStatus.total}</span>
          </div>
          <button className="gi-batch-cancel" onClick={onCancel}>
            <X size={16} />
          </button>
        </div>

        <div className="gi-batch-progress">
          <div className="gi-progress-track">
            <div
              className="gi-progress-fill"
              style={{ width: `${batchStatus.pct}%` }}
            />
          </div>
          <div className="gi-progress-info">
            <span className="gi-progress-label">{batchStatus.label}</span>
            <span className="gi-progress-pct">{batchStatus.pct}%</span>
          </div>
        </div>
      </div>
    </div>
  );
};
