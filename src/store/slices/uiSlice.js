import { replayTo } from '../../utils/chessUtils';

export const createUISlice = (set, get) => ({
  clocks: { white: null, black: null },
  players: { white: 'Blancas', black: 'Negras' },
  playerElos: { white: null, black: null },
  gamePhase: 'Opening',
  showTokenInput: false,
  boardOrientation: 'white',
  playerColor: 'white',
  gameId: 0,

  setShowTokenInput: (v) => set({ showTokenInput: v }),
  setGameId: (id) => set({ gameId: id }),
  setBoardOrientation: (orientation) => set({ boardOrientation: orientation }),
  setPlayerColor: (color) => set({ playerColor: color }),
  setGamePhase: (phase) => set({ gamePhase: phase }),
  setClocks: (white, black) => {
    const current = get().clocks;
    if (current.white === white && current.black === black) return;
    set({ clocks: { white, black } });
  },
  setPlayers: (white, black, whiteElo = null, blackElo = null) => set({
    players: { white, black },
    playerElos: { white: whiteElo, black: blackElo }
  }),
  
  appMode: 'analysis',
  setAppMode: (mode) => set({ appMode: mode, explorerMode: mode === 'explorer' }),
  
  puzzleState: null,
  setPuzzleState: (updater) => set((state) => ({ 
    puzzleState: typeof updater === 'function' ? updater(state.puzzleState) : updater 
  })),

  explorerMode: false,
  setExplorerMode: (v) => set({ explorerMode: v }),

  selectedStatCategory: null,
  setSelectedStatCategory: (cat) => set({ selectedStatCategory: cat }),

  targetPly: null,
  setTargetPly: (ply) => set({ targetPly: ply }),

  analysisSubView: 'analysis',
  setAnalysisSubView: (view) => set({ analysisSubView: view }),

  botActive: false,
  botDifficulty: 'intermediate',
  botColor: 'black',
  botActualColor: 'black',
  botMemory: {},

  setBotActive: (active) => set({ botActive: active }),
  setBotDifficulty: (diff) => set({ botDifficulty: diff }),
  setBotColor: (color) => set({ botColor: color }),
  setBotActualColor: (color) => set({ botActualColor: color }),
  clearBotMemory: () => set({ botMemory: {} }),
  addBotMemoryDiscard: (fen, move) => set((state) => {
    const current = state.botMemory[fen] || [];
    if (current.includes(move)) return state;
    return { botMemory: { ...state.botMemory, [fen]: [...current, move] } };
  }),

  takebackBotMove: () => {
    const state = get();
    if (state.history.length === 0) return;
    
    const lastMoveIdx = state.history.length - 1;
    const lastMove = state.history[lastMoveIdx];
    
    // Si es el turno del bot (o acaba de mover el bot), el último movimiento en el historial es del bot.
    const isBotTurn = (lastMoveIdx % 2 === 1 && state.botActualColor === 'black') || 
                      (lastMoveIdx % 2 === 0 && state.botActualColor === 'white');
    
    if (isBotTurn) {
      const beforeMoveIndex = lastMoveIdx - 1;
      const beforeFen = beforeMoveIndex === -1 ? state.startFen || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1' : state.history[beforeMoveIndex].after;
      
      get().addBotMemoryDiscard(beforeFen, lastMove.san);
      get().addBotMemoryDiscard(beforeFen, lastMove.lan ?? (lastMove.from + lastMove.to + (lastMove.promotion || '')));
      
      get().trimAnalysisState(beforeMoveIndex);
      
      const gameCopy = replayTo(state.history, beforeMoveIndex, state.startFen);
      set({
        game: gameCopy,
        fen: gameCopy.fen(),
        history: state.history.slice(0, beforeMoveIndex + 1),
        currentMoveIndex: beforeMoveIndex,
        arrows: [],
      });
    }
  }
});