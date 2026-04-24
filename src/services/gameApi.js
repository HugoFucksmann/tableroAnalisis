export async function fetchLichessGames(username, max = 15, until = null, token = '') {
  try {
    const headers = { 'Accept': 'application/x-ndjson' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    let url = `https://lichess.org/api/games/user/${encodeURIComponent(username)}?max=${max}&pgnInJson=true`;
    if (until) url += `&until=${until}`;

    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error('Usuario no encontrado o error en Lichess');
    
    const text = await res.text();
    const lines = text.split('\n').filter(line => line.trim().length > 0);
    
    const games = lines.map(line => {
      const game = JSON.parse(line);
      return {
        id: game.id,
        white: game.players.white.user?.name || 'Anon',
        black: game.players.black.user?.name || 'Anon',
        result: game.winner === 'white' ? '1-0' : game.winner === 'black' ? '0-1' : '1/2-1/2',
        date: new Date(game.createdAt).toLocaleDateString(),
        pgn: game.pgn,
        createdAt: game.createdAt,
      };
    });

    return {
      games,
      lastTimestamp: games.length > 0 ? games[games.length - 1].createdAt : null,
      hasMore: games.length === max
    };
  } catch (err) {
    console.error(err);
    throw err;
  }
}

/**
 * Para Chess.com, la paginación es manual por archivos mensuales.
 * @param {string} username 
 * @param {object} pagination { archives, currentArchiveIdx, offset }
 */
export async function fetchChesscomGames(username, max = 15, pagination = null) {
  try {
    let archives = pagination?.archives;
    let currentIdx = pagination?.currentArchiveIdx ?? 0;
    let offset = pagination?.offset ?? 0;

    if (!archives) {
      const archiveRes = await fetch(`https://api.chess.com/pub/player/${encodeURIComponent(username)}/games/archives`);
      if (!archiveRes.ok) throw new Error('Usuario no encontrado en Chess.com');
      const archiveData = await archiveRes.json();
      if (!archiveData.archives || archiveData.archives.length === 0) return { games: [], pagination: null };
      archives = [...archiveData.archives].reverse();
    }

    let collectedGames = [];
    
    while (currentIdx < archives.length && collectedGames.length < max) {
      const res = await fetch(archives[currentIdx]);
      if (!res.ok) {
        currentIdx++;
        offset = 0;
        continue;
      }
      
      const data = await res.json();
      const allMonthlyGames = [...data.games].reverse();
      const available = allMonthlyGames.slice(offset);
      
      const needed = max - collectedGames.length;
      const toAdd = available.slice(0, needed);
      
      collectedGames = [...collectedGames, ...toAdd];
      offset += toAdd.length;
      
      if (offset >= allMonthlyGames.length) {
        currentIdx++;
        offset = 0;
      }
    }

    const formattedGames = collectedGames.map(game => {
      let result = '1/2-1/2';
      if (game.white.result === 'win') result = '1-0';
      else if (game.black.result === 'win') result = '0-1';
      
      return {
        id: game.url.split('/').pop(),
        white: game.white.username,
        black: game.black.username,
        result: result,
        date: new Date(game.end_time * 1000).toLocaleDateString(),
        pgn: game.pgn,
      };
    });

    return {
      games: formattedGames,
      pagination: {
        archives,
        currentArchiveIdx: currentIdx,
        offset
      },
      hasMore: currentIdx < archives.length || (currentIdx === archives.length - 1 && offset > 0)
    };
  } catch (err) {
    console.error(err);
    throw err;
  }
}

export async function fetchOpeningExplorer(fen, token = '', ratings = '1600,1800,2000,2200,2500') {
  try {
    // Normalizamos el FEN para la API (primeras 4 partes son suficientes)
    const fenParts = fen.split(' ');
    const cleanFen = fenParts.slice(0, 4).join(' ');
    
    const url = `https://explorer.lichess.ovh/lichess?fen=${encodeURIComponent(cleanFen)}&ratings=${ratings}`;
    
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(url, { headers });
    
    if (!res.ok) {
      throw new Error(`Lichess API error: ${res.status}`);
    }
    
    const data = await res.json();
    
    if (!data.moves) return { opening: 'Posición no encontrada', moves: [] };

    return {
      opening: data.opening?.name || 'Teoría de aperturas',
      moves: data.moves.map(m => {
        const w = m.white || 0;
        const d = m.draws || m.draw || 0;
        const b = m.black || 0;
        const total = w + d + b;
        
        return {
          san: m.san,
          white: total > 0 ? Math.round((w / total) * 100) : 0,
          draw: total > 0 ? Math.round((d / total) * 100) : 0,
          black: total > 0 ? Math.round((b / total) * 100) : 0,
          games: total
        };
      })
    };
  } catch (err) {
    console.error('fetchOpeningExplorer error:', err);
    throw err;
  }
}
