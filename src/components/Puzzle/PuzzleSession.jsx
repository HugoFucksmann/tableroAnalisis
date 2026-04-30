import React, { useState, useEffect, useRef } from 'react';
import { backendService } from '../../services/backendService';
import { useGameStore } from '../../store/useGameStore';
import { ChevronLeft, ChevronRight, Eye, SkipForward, CheckCircle2, XCircle, RotateCcw } from 'lucide-react';
import { playChessSound } from '../../utils/soundUtils';
import './Puzzle.css';

export const PuzzleSession = ({ onBack }) => {
  const [puzzles, setPuzzles] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [status, setStatus] = useState('loading'); // loading, empty, active, finished
  const [showSolution, setShowSolution] = useState(false);
  const [isWrong, setIsWrong] = useState(false);
  const [isSolved, setIsSolved] = useState(false);
  const opponentTimerRef = useRef(null);

  const {
    loadFen, setBoardOrientation, setPuzzleState, puzzleState,
    makeMove, goToMove, history, currentMoveIndex
  } = useGameStore();

  // ── Load puzzle list ──────────────────────────────────────────
  useEffect(() => {
    let retryInterval;

    const removeHandler = backendService.addHandler((msg) => {
      if (msg.type === 'puzzle_list') {
        if (retryInterval) {
          clearInterval(retryInterval);
          retryInterval = null;
        }
        // Only set puzzles if we haven't yet (prevent infinite shuffle resets)
        setPuzzles(prev => {
          if (prev.length > 0) return prev;
          return [...msg.puzzles].sort(() => Math.random() - 0.5);
        });
        setStatus(msg.puzzles.length > 0 ? 'active' : 'empty');
      }
    });

    backendService.getPuzzles();
    // Retry until we get a response (connection may still be opening)
    retryInterval = setInterval(() => backendService.getPuzzles(), 1000);

    return () => {
      removeHandler();
      if (retryInterval) clearInterval(retryInterval);
      if (opponentTimerRef.current) clearTimeout(opponentTimerRef.current);
      setPuzzleState(null);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Initialize puzzle when index changes ─────────────────────
  useEffect(() => {
    if (puzzles.length === 0 || currentIndex >= puzzles.length) return;

    const p = puzzles[currentIndex];

    if (opponentTimerRef.current) clearTimeout(opponentTimerRef.current);

    // FEN is already post-blunder — board starts in the correct position.
    loadFen(p.fen);
    setBoardOrientation(p.playerColor);
    setShowSolution(false);
    setIsWrong(false);
    setIsSolved(false);

    // Expose the solution sequence to Board.jsx validator
    setPuzzleState({
      sequence: p.solutionSequence,
      currentStep: 0,
      isWrong: false,
      isSolved: false
    });
  }, [currentIndex, puzzles]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── React to Board.jsx updating puzzleState ──────────────────
  // Board.jsx calls setPuzzleState({ currentStep: +1 }) on a correct move
  // and setPuzzleState({ isWrong: true }) on a wrong one.
  useEffect(() => {
    if (!puzzleState || isSolved) return;

    if (puzzleState.isWrong) {
      setIsWrong(true);
      return;
    }

    const step = puzzleState.currentStep;
    const sequence = puzzleState.sequence;

    // Solver finished the whole sequence
    if (step >= sequence.length) {
      setIsSolved(true);
      setIsWrong(false);
      if (puzzles[currentIndex]) {
        backendService.puzzleSolved(puzzles[currentIndex].id);
      }
      playChessSound('notify');
      return;
    }

    // Odd step = opponent's turn (step 0 = solver, 1 = opponent, 2 = solver, …)
    if (step % 2 === 1) {
      const oppUci = sequence[step];
      const oppMove = {
        from: oppUci.slice(0, 2),
        to: oppUci.slice(2, 4),
        ...(oppUci.length === 5 ? { promotion: oppUci[4] } : {})
      };

      opponentTimerRef.current = setTimeout(() => {
        console.log('[Puzzle] Opponent timer fired! Step:', step, 'oppUci:', oppUci, 'oppMove:', oppMove);
        // Advance step first so Board.jsx doesn't re-validate this as a solver move
        setPuzzleState(prev => ({ ...prev, currentStep: step + 1 }));
        const result = makeMove(oppMove);
        console.log('[Puzzle] makeMove(oppMove) returned:', result);
      }, 600);

      return () => clearTimeout(opponentTimerRef.current);
    }
  }, [puzzleState?.currentStep, puzzleState?.isWrong]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Handlers ─────────────────────────────────────────────────
  const handleNext = () => {
    if (currentIndex < puzzles.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      setStatus('finished');
      setPuzzleState(null);
    }
  };

  const handleRestart = () => {
    const p = puzzles[currentIndex];
    if (opponentTimerRef.current) clearTimeout(opponentTimerRef.current);
    loadFen(p.fen);
    setShowSolution(false);
    setIsWrong(false);
    setIsSolved(false);
    setPuzzleState({
      sequence: p.solutionSequence,
      currentStep: 0,
      isWrong: false,
      isSolved: false
    });
  };

  const handleStepBack = () => {
    if (currentMoveIndex >= 0) goToMove(currentMoveIndex - 1);
  };

  const handleStepForward = () => {
    if (currentMoveIndex < history.length - 1) goToMove(currentMoveIndex + 1);
  };

  // Clicking a solution move triggers it
  const handleSolutionClick = (uciStr, i) => {
    if (!puzzleState || i !== puzzleState.currentStep || isSolved) return;
    const uci = {
      from: uciStr.slice(0, 2),
      to: uciStr.slice(2, 4),
      ...(uciStr.length === 5 ? { promotion: uciStr[4] } : {})
    };
    
    // Advance the puzzle state before making the move so the opponent reply effect triggers
    setPuzzleState(prev => ({
      ...prev,
      currentStep: prev.currentStep + 1,
      isSolved: prev.currentStep + 1 >= prev.sequence.length,
      isWrong: false
    }));
    
    makeMove(uci);
  };

  // ── Render ────────────────────────────────────────────────────
  if (status === 'loading' || status === 'empty' || status === 'finished') {
    return (
      <div className="puzzle-session">
        <div className="puzzle-header">
          <button className="back-btn" onClick={onBack}><ChevronLeft size={16} /></button>
          <h3>Entrenar</h3>
        </div>
        <div className="ps-state">
          {status === 'loading' && <p>Cargando puzzles...</p>}
          {status === 'empty' && <p>No hay puzzles guardados. Ve a «Extraer Puzzles» primero.</p>}
          {status === 'finished' && (
            <>
              <h3>¡Sesión finalizada!</h3>
              <button className="pi-start-btn" onClick={onBack} style={{ marginTop: '16px' }}>Volver al Menú</button>
            </>
          )}
        </div>
      </div>
    );
  }

  const puzzle = puzzles[currentIndex];
  if (!puzzle) return null;

  return (
    <div className="puzzle-session">
      <div className="puzzle-header">
        <button className="back-btn" onClick={onBack}><ChevronLeft size={16} /></button>
        <h3>Entrenar ({currentIndex + 1}/{puzzles.length})</h3>
      </div>

      <div className="ps-card glass-panel">
        {/* Context */}
        <div className="ps-info">
          <span className={`pl-label ${puzzle.label.toLowerCase().replace(' ', '-')}`}>
            {puzzle.label}
          </span>
          <p className="ps-hint">
            Tu oponente jugó <strong>{puzzle.playedMove}</strong>. ¿Cuál es la mejor respuesta?
          </p>
        </div>

        {/* Feedback */}
        {isWrong && !isSolved && (
          <div className="ps-feedback wrong">
            <XCircle size={16} /> Movimiento incorrecto.
            <button className="ps-btn-small" onClick={handleRestart} style={{ marginLeft: '8px' }}>
              <RotateCcw size={12} /> Reintentar
            </button>
          </div>
        )}
        {isSolved && (
          <div className="ps-feedback solved">
            <CheckCircle2 size={16} /> ¡Excelente! Puzzle resuelto.
          </div>
        )}

        {/* Board navigation */}
        <div className="ps-nav">
          <button
            className="ps-nav-btn"
            onClick={handleStepBack}
            disabled={currentMoveIndex < 0}
            title="Jugada anterior"
          >
            <ChevronLeft size={18} />
          </button>
          <span className="ps-nav-label">
            {currentMoveIndex + 1} / {history.length}
          </span>
          <button
            className="ps-nav-btn"
            onClick={handleStepForward}
            disabled={currentMoveIndex >= history.length - 1}
            title="Jugada siguiente"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        {/* Controls */}
        <div className="ps-controls">
          <button className="ps-btn" onClick={() => setShowSolution(s => !s)}>
            <Eye size={16} /> {showSolution ? 'Ocultar' : 'Ver Solución'}
          </button>
          <button className="ps-btn" onClick={handleNext}>
            <SkipForward size={16} /> {isSolved ? 'Siguiente' : 'Saltar'}
          </button>
        </div>

        {/* Solution */}
        {showSolution && (
          <div className="ps-solution">
            <span className="sol-label">Solución:</span>
            <div className="sol-moves">
              {puzzle.solutionSequence.map((m, i) => {
                const isDone = puzzleState ? puzzleState.currentStep > i : false;
                const isNext = puzzleState ? i === puzzleState.currentStep && !isSolved : false;
                return (
                  <span
                    key={i}
                    className={`sol-move ${isDone ? 'done' : ''} ${isNext ? 'clickable' : ''}`}
                    onClick={() => handleSolutionClick(m, i)}
                    title={isNext ? 'Clic para reproducir' : ''}
                  >
                    {m}
                  </span>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="ps-footer">
        <p>{isSolved ? '¡Encontraste la mejor jugada!' : 'Mueve las piezas en el tablero para resolver el puzzle.'}</p>
      </div>
    </div>
  );
};
