import React from 'react';

export const PgnManualImport = ({ customPgn, setCustomPgn, onLoad }) => {
  return (
    <div className="gi-pgn-manual-wrap">
      <textarea
        className="gi-pgn-textarea premium-scroll"
        placeholder="Pega el texto de tu PGN aquí..."
        value={customPgn}
        onChange={(e) => setCustomPgn(e.target.value)}
      />
      <button
        className="gi-pgn-load-btn"
        onClick={() => onLoad(customPgn)}
        disabled={!customPgn.trim()}
      >
        Cargar al tablero
      </button>
    </div>
  );
};
