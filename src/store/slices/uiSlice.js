export const createUISlice = (set, get) => ({
  clocks: { white: null, black: null },
  players: { white: 'Blancas', black: 'Negras' },
  playerElos: { white: null, black: null },
  gamePhase: 'Opening',
  importedGames: [],
  searchUsername: 'elcolof',
  searchPlatform: 'lichess',
  lichessToken: import.meta.env.VITE_TOKEN_LICHESS || '',
  showTokenInput: false,
  boardOrientation: 'white',
  gameId: 0,

  setShowTokenInput: (v) => set({ showTokenInput: v }),
  setGameId: (id) => set({ gameId: id }),
  setBoardOrientation: (orientation) => set({ boardOrientation: orientation }),
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
  setImportedGames: (games) => set({ importedGames: games }),
  setSearchUsername: (username) => set({ searchUsername: username }),
  setSearchPlatform: (platform) => set({ searchPlatform: platform }),
  setLichessToken: (token) => set({ lichessToken: token }),
  
  appMode: 'analysis',
  setAppMode: (mode) => set({ appMode: mode }),
  
  puzzleState: null,
  setPuzzleState: (updater) => set((state) => ({ 
    puzzleState: typeof updater === 'function' ? updater(state.puzzleState) : updater 
  })),
});