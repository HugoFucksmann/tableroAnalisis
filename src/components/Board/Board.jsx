import React from 'react';
import { Chessboard } from 'react-chessboard';
import { useGameStore } from '../../store/useGameStore';
import { analysisQueue } from '../../services/analysisQueue';
import './Board.css';

const EVAL_ICONS = {
  'Brillante': { icon: '!!', bg: '#00c1b1' },
  'Genial': { icon: '!', bg: '#409cde' },
  'Libro': { icon: '📖', bg: '#917961' },
  'Mejor': { icon: '★', bg: '#79a83a' },
  'Excelente': { icon: '👍', bg: '#86a45e' },
  'Bueno': { icon: '✓', bg: '#7e9561' },
  'Imprecisión': { icon: '?!', bg: '#f2b134' },
  'Error': { icon: '?', bg: '#e6912c' },
  'Omisión': { icon: '✗', bg: '#d46d5a' },
  'Error grave': { icon: '??', bg: '#c23e30' },
};

const BADGE_SIZE = 36;

/**
 * Convierte "e2e4" → objeto Arrow que entiende react-chessboard v5:
 * { startSquare, endSquare, color }
 */
function uciToArrow(uci, color = 'rgb(0, 193, 177)') {
  if (!uci || uci.length < 4) return null;
  return { startSquare: uci.slice(0, 2), endSquare: uci.slice(2, 4), color };
}

export const Board = () => {
  const {
    fen,
    makeMove,
    clocks,
    gamePhase,
    openingName,
    history,
    currentMoveIndex,
    moveEvaluations,
    bestMoves,
    arrows,          // Arrow[] del store (vienen de OpeningExplorer u otros)
    evaluationHistory,
    isAnalyzing,
    setBestMoveForIndex,
    setAnalyzing,
    setEvaluation,
  } = useGameStore();

  const lastAnalyzedFen = React.useRef(null);

  React.useEffect(() => {
    const hasEval = evaluationHistory?.some(e => e.moveIndex === currentMoveIndex);
    if (!hasEval && !isAnalyzing && currentMoveIndex >= -1 && lastAnalyzedFen.current !== fen) {
      lastAnalyzedFen.current = fen;
      analysisQueue.analyzeCurrentPosition(fen, currentMoveIndex, {
        setBestMoveForIndex,
        setAnalyzing,
        setEvaluation,
      });
    }
  }, [fen, currentMoveIndex, evaluationHistory, isAnalyzing, setBestMoveForIndex, setAnalyzing, setEvaluation]);

  // ── Highlight de la última jugada ────────────────────────────────────────
  const squareStyles = React.useMemo(() => {
    if (currentMoveIndex < 0) return {};
    const currentMove = history[currentMoveIndex];
    if (!currentMove) return {};
    return {
      [currentMove.from]: { backgroundColor: 'rgba(255, 255, 100, 0.25)' },
      [currentMove.to]: { backgroundColor: 'rgba(255, 255, 100, 0.35)' },
    };
  }, [currentMoveIndex, history]);

  // ── Flechas: motor (bestMove) + aperturas/manuales (arrows del store) ────
  // En v5, arrows es Arrow[] = [{ startSquare, endSquare, color }, ...]
  const combinedArrows = React.useMemo(() => {
    const engineArrow = uciToArrow(bestMoves[currentMoveIndex]);
    const base = engineArrow ? [engineArrow] : [];
    const storeArrows = arrows ?? [];

    // Usamos un Set para evitar duplicados que causan errores de keys en react-chessboard
    const seen = new Set();
    const result = [];

    // Primero agregamos la del motor (prioridad de visualización)
    if (engineArrow) {
      const key = `${engineArrow.startSquare}-${engineArrow.endSquare}`;
      seen.add(key);
      result.push(engineArrow);
    }

    // Luego agregamos las del store (Lichess / Aperturas) si no están repetidas
    for (const arrow of storeArrows) {
      const key = `${arrow.startSquare}-${arrow.endSquare}`;
      if (!seen.has(key)) {
        seen.add(key);
        result.push(arrow);
      }
    }

    return result;
  }, [bestMoves, currentMoveIndex, arrows]);

  // ── Handler de drop ──────────────────────────────────────────────────────
  // En v5 onPieceDrop recibe { piece, sourceSquare, targetSquare }
  // targetSquare puede ser null si se suelta fuera del tablero
  function onDrop({ sourceSquare, targetSquare }) {
    if (!targetSquare || sourceSquare === targetSquare) return false;
    const move = makeMove({ from: sourceSquare, to: targetSquare, promotion: 'q' });
    return move !== null;
  }

  return (
    <div className="board-container">
      <div className="board-header-info">
        <span className="opening-label">{openingName}</span>
        <span className="phase-badge">{gamePhase}</span>
      </div>

      <div className="clock-display black">
        <span className="clock-label">NEGRAS</span>
        <span className="clock-time">{clocks.black}</span>
      </div>

      <div className="board-main-area">
        <Chessboard
          options={{
            position: fen,
            onPieceDrop: onDrop,
            boardOrientation: 'white',
            darkSquareStyle: { backgroundColor: '#2d3436' },
            lightSquareStyle: { backgroundColor: '#636e72' },
            arrows: combinedArrows,
            squareStyles: squareStyles,
            animationDurationInMs: 200,
          }}
        />
        <EvalBadgeOverlay
          currentMoveIndex={currentMoveIndex}
          history={history}
          moveEvaluations={moveEvaluations}
        />
      </div>

      <div className="clock-display white">
        <span className="clock-label">BLANCAS</span>
        <span className="clock-time">{clocks.white}</span>
      </div>
    </div>
  );
};

// ── Badge de evaluación sobre el tablero ─────────────────────────────────
const EvalBadgeOverlay = ({ currentMoveIndex, history, moveEvaluations }) => {
  if (currentMoveIndex < 0) return null;
  const currentMove = history[currentMoveIndex];
  if (!currentMove) return null;
  const evalData = EVAL_ICONS[moveEvaluations[currentMoveIndex]];
  if (!evalData) return null;

  const file = currentMove.to.charCodeAt(0) - 'a'.charCodeAt(0);
  const rank = parseInt(currentMove.to[1]) - 1;
  const leftPct = ((file + 1) / 8) * 100;
  const topPct = ((7 - rank) / 8) * 100;

  return (
    <div className="eval-badge-overlay" aria-hidden="true">
      <div
        className="eval-badge"
        style={{
          left: `calc(${leftPct}% - ${BADGE_SIZE}px + 4px)`,
          top: `calc(${topPct}%  + 4px)`,
          backgroundColor: evalData.bg,
        }}
      >
        {evalData.icon}
      </div>
    </div>
  );
};