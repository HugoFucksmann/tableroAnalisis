import React, { useState, useEffect, useRef } from 'react';
import { backendService } from '../../services/backendService';
import { useGameStore } from '../../store/useGameStore';
import { ChevronLeft, ChevronRight, Eye, SkipForward, CheckCircle2, XCircle, RotateCcw } from 'lucide-react';
import { playChessSound } from '../../utils/soundUtils';
import './Puzzle.css';

export const PuzzleSession = ({ onBack }) => {
  const [state, setState] = useState({
    puzzles: [],
    currentIndex: 0,
    status: 'loading', // loading, empty, active, finished
    showSolution: false,
    showOriginal: false,
    isWrong: false,
    isSolved: false,
  });

  const {
    puzzles, currentIndex, status, showSolution,
    showOriginal, isWrong, isSolved
  } = state;

  const updateState = (patch) => setState(prev => ({ ...prev, ...patch }));
  const opponentTimerRef = useRef(null);

  const {
    loadFen, setBoardOrientation, setPuzzleState, puzzleState,
    makeMove, goToMove, history, currentMoveIndex, setArrows
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
        setState(prev => {
          if (prev.puzzles.length > 0) return prev;
          return {
            ...prev,
            puzzles: msg.puzzles.toSorted(() => Math.random() - 0.5),
            status: msg.puzzles.length > 0 ? 'active' : 'empty'
          };
        });
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
      setArrows([]);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Initialize puzzle logic ──────────────────────────────────
  const initPuzzle = (p) => {
    if (opponentTimerRef.current) clearTimeout(opponentTimerRef.current);

    updateState({
      showSolution: false,
      showOriginal: false,
      isWrong: false,
      isSolved: false
    });
    setArrows([]);

    if (p.baseFen) {
      loadFen(p.baseFen);
      setBoardOrientation(p.playerColor);
      
      if (p.contextMoves) {
        p.contextMoves.forEach(m => makeMove(m));
      }

      setPuzzleState({
        sequence: ['__animating__'],
        currentStep: 0,
        isWrong: false,
        isSolved: false,
        isAnimating: true
      });

      opponentTimerRef.current = setTimeout(() => {
        makeMove(p.playedMove);
        setPuzzleState({
          sequence: p.solutionSequence,
          currentStep: 0,
          isWrong: false,
          isSolved: false
        });
      }, 1000);
    } else if (p.preBlunderFen) {
      loadFen(p.preBlunderFen);
      setBoardOrientation(p.playerColor);
      
      setPuzzleState({
        sequence: ['__animating__'],
        currentStep: 0,
        isWrong: false,
        isSolved: false,
        isAnimating: true
      });

      opponentTimerRef.current = setTimeout(() => {
        makeMove(p.playedMove);
        setPuzzleState({
          sequence: p.solutionSequence,
          currentStep: 0,
          isWrong: false,
          isSolved: false
        });
      }, 1000);
    } else {
      loadFen(p.fen);
      setBoardOrientation(p.playerColor);
      setPuzzleState({
        sequence: p.solutionSequence,
        currentStep: 0,
        isWrong: false,
        isSolved: false
      });
    }
  };

  useEffect(() => {
    if (puzzles.length === 0 || currentIndex >= puzzles.length) return;
    initPuzzle(puzzles[currentIndex]);
  }, [currentIndex, puzzles]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── React to Board.jsx updating puzzleState ──────────────────
  // Board.jsx calls setPuzzleState({ currentStep: +1 }) on a correct move
  // and setPuzzleState({ isWrong: true }) on a wrong one.
  useEffect(() => {
    if (!puzzleState || isSolved) return;

    if (puzzleState.isWrong) {
      updateState({ isWrong: true });
      return;
    }

    const step = puzzleState.currentStep;
    const sequence = puzzleState.sequence;

    // Solver finished the whole sequence
    if (step >= sequence.length) {
      updateState({ isSolved: true, isWrong: false });
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

  // ── Draw arrow for the current move ───────────────────────────
  useEffect(() => {
    if (status === 'active' && currentMoveIndex >= 0 && history[currentMoveIndex]) {
      const move = history[currentMoveIndex];
      const p = puzzles[currentIndex];
      const isSolver = move.color === (p?.playerColor === 'white' ? 'w' : 'b');
      const color = isSolver ? 'rgba(16, 185, 129, 0.8)' : 'rgba(239, 68, 68, 0.8)';
      setArrows([ { startSquare: move.from, endSquare: move.to, color } ]);
    } else {
      setArrows([]);
    }
  }, [currentMoveIndex, history, status, setArrows, currentIndex, puzzles]);

  // ── Handlers ─────────────────────────────────────────────────
  const applySequence = (sequenceToPlay) => {
    const p = puzzles[currentIndex];
    
    setPuzzleState(prev => ({ ...prev, isSolved: true }));
    
    if (p.baseFen) {
      loadFen(p.baseFen);
      setBoardOrientation(p.playerColor);
      if (p.contextMoves) p.contextMoves.forEach(m => makeMove(m));
      makeMove(p.playedMove);
    } else if (p.preBlunderFen) {
      loadFen(p.preBlunderFen);
      setBoardOrientation(p.playerColor);
      makeMove(p.playedMove);
    } else {
      loadFen(p.fen);
      setBoardOrientation(p.playerColor);
    }
    
    sequenceToPlay.forEach(m => {
       // If m is UCI (solutionSequence), convert to object. If SAN (originalContinuation), pass as is.
       if (m.length >= 4 && m[0] >= 'a' && m[0] <= 'h' && m[1] >= '1' && m[1] <= '8' && m[2] >= 'a' && m[2] <= 'h' && m[3] >= '1' && m[3] <= '8') {
         makeMove({
           from: m.slice(0, 2),
           to: m.slice(2, 4),
           ...(m.length === 5 ? { promotion: m[4] } : {})
         });
       } else {
         makeMove(m);
       }
    });
  };

  const handleToggleOriginal = () => {
    const nextVal = !showOriginal;
    updateState({ showOriginal: nextVal });
    const p = puzzles[currentIndex];
    if (nextVal) {
      applySequence(p.originalContinuation || []);
    } else {
      applySequence(p.solutionSequence);
    }
  };

  const handleNext = () => {
    if (currentIndex < puzzles.length - 1) {
      updateState({ currentIndex: currentIndex + 1 });
    } else {
      updateState({ status: 'finished' });
      setPuzzleState(null);
    }
  };

  const handleRestart = () => {
    initPuzzle(puzzles[currentIndex]);
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
          {status === 'loading' && <p>Cargando puzzles…</p>}
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
          <div className="ps-feedback solved" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <CheckCircle2 size={16} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
              ¡Excelente! Puzzle resuelto.
            </div>
            {puzzle.originalContinuation && puzzle.originalContinuation.length > 0 && (
              <button className="ps-btn-small" onClick={handleToggleOriginal}>
                {showOriginal ? 'Ver Solución' : 'Ver Partida Real'}
              </button>
            )}
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
          <button className="ps-btn" onClick={() => updateState({ showSolution: !showSolution })}>
            <Eye size={16} /> {showSolution ? 'Ocultar' : 'Ver Solución'}
          </button>
          <button className="ps-btn" onClick={handleNext}>
            <SkipForward size={16} /> {isSolved ? 'Siguiente' : 'Saltar'}
          </button>
        </div>

        {/* Solution */}
        {(showSolution || isSolved) && (
          <div className={`ps-solution ${showOriginal ? 'original-mode' : ''}`}>
            <span className="sol-label">
              {showOriginal ? 'Jugadas de la partida real:' : 'Solución:'}
            </span>
            <div className="sol-moves">
              {(showOriginal ? puzzle.originalContinuation : puzzle.solutionSequence).map((m, i) => {
                const isDone = puzzleState ? puzzleState.currentStep > i : false;
                const isNext = puzzleState ? i === puzzleState.currentStep && !isSolved && !showOriginal : false;
                return (
                  <span
                    key={`move-${i}-${m}`}
                    className={`sol-move ${(isDone || showOriginal) ? 'done' : ''} ${isNext ? 'clickable' : ''}`}
                    onClick={() => !showOriginal ? handleSolutionClick(m, i) : null}
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
