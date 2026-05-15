export const createUISlice = (set, get) => ({
  clocks: { white: null, black: null },
  players: { white: 'Blancas', black: 'Negras' },
  playerElos: { white: null, black: null },
  gamePhase: 'Opening',
  showTokenInput: false,
  boardOrientation: 'white',
  playerColor: 'white',
  // CRÍTICO SOLUCIONADO: gameId duplicado removido de uiSlice. 
  // Ahora la única "fuente de la verdad" es gameSlice.js

  setShowTokenInput: (v) => set({ showTokenInput: v }),
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
});