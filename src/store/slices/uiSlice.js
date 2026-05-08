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
  setAppMode: (mode) => set({ appMode: mode }),
  
  puzzleState: null,
  setPuzzleState: (updater) => set((state) => ({ 
    puzzleState: typeof updater === 'function' ? updater(state.puzzleState) : updater 
  })),
});