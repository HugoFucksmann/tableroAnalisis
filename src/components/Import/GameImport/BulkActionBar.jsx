import React from 'react';
import { Cpu } from 'lucide-react';

export const BulkActionBar = ({ selectedCount, batchStatus, onAnalyze, onClear }) => {
  if (selectedCount === 0 || batchStatus) return null;

  return (
    <div className="gi-bulk-bar">
      <span className="gi-bulk-count">
        {selectedCount} seleccionada{selectedCount !== 1 ? 's' : ''}
      </span>
      <div className="gi-bulk-actions">
        <button
          className="gi-bulk-btn analyze"
          onClick={onAnalyze}
          title="Analizar partidas seleccionadas en lote"
        >
          <Cpu size={14} />
          Analizar Partidas
        </button>
      </div>
      <button 
        className="gi-bulk-clear" 
        onClick={onClear} 
        title="Limpiar selección"
      >
        ✕
      </button>
    </div>
  );
};
