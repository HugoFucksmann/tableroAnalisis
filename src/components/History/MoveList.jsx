import { useGameStore } from '../../store/useGameStore';
import {
  Star,
  BookOpen,
  ThumbsUp,
  Check,
  X
} from 'lucide-react';
import './MoveList.css';

const EVAL_ICONS = {
  'Brillante': { icon: '!!', color: '#fff', bg: '#00c1b1' },
  'Genial': { icon: '!', color: '#fff', bg: '#409cde' },
  'Libro': { icon: <BookOpen size={12} />, color: '#fff', bg: '#917961' },
  'Mejor': { icon: <Star size={12} fill="white" />, color: '#fff', bg: '#79a83a' },
  'Excelente': { icon: <ThumbsUp size={12} fill="white" />, color: '#fff', bg: '#86a45e' },
  'Bueno': { icon: <Check size={12} />, color: '#fff', bg: '#7e9561' },
  'Imprecisión': { icon: '?!', color: '#fff', bg: '#f2b134' },
  'Error': { icon: '?', color: '#fff', bg: '#e6912c' },
  'Omisión': { icon: <X size={12} />, color: '#fff', bg: '#d46d5a' },
  'Error grave': { icon: '??', color: '#fff', bg: '#c23e30' },
};

const PIECE_ICONS = { N: '♘', B: '♗', R: '♖', Q: '♕', K: '♔' };

export const MoveList = () => {
  const { history, moveEvaluations, currentMoveIndex, goToMove } = useGameStore();

  // history es ahora un array de objetos verbose: { san, from, to, ... }
  // Extraemos el string SAN de cada entrada de forma segura.
  const getSan = (entry) =>
    entry && typeof entry === 'object' ? entry.san : entry;

  const movePairs = [];
  for (let i = 0; i < history.length; i += 2) {
    movePairs.push({
      round: Math.floor(i / 2) + 1,
      white: { san: getSan(history[i]), index: i, eval: moveEvaluations[i] },
      black: history[i + 1]
        ? { san: getSan(history[i + 1]), index: i + 1, eval: moveEvaluations[i + 1] }
        : null,
    });
  }

  const renderMove = (move) => {
    if (!move) return null;
    const evaluation = EVAL_ICONS[move.eval];

    const pieceMatch = move.san.match(/^([NBRQK])/);
    const piece = pieceMatch ? pieceMatch[1] : null;
    const moveText = piece ? move.san.substring(1) : move.san;

    return (
      <div
        className={`move-item ${currentMoveIndex === move.index ? 'active' : ''}`}
        title={move.eval || ''}
        onClick={() => goToMove(move.index)}
      >
        <span className="san">
          {piece && <span className="piece-icon">{PIECE_ICONS[piece]}</span>}
          {moveText}
        </span>
        {evaluation && (
          <span
            className="eval-icon"
            style={{ color: evaluation.color, backgroundColor: evaluation.bg }}
          >
            {evaluation.icon}
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="move-list-container premium-scroll">
      <div className="move-list-header">
        <span>#</span>
        <span>Blancas</span>
        <span>Negras</span>
      </div>
      <div className="move-list-body">
        {movePairs.map((pair) => (
          <div key={pair.round} className="move-row">
            <span className="round-num">{pair.round}.</span>
            {renderMove(pair.white)}
            {renderMove(pair.black)}
          </div>
        ))}
        {history.length === 0 && (
          <div className="empty-history">Sin movimientos aún</div>
        )}
      </div>
    </div>
  );
};