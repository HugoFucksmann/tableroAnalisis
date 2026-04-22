export async function fetchLichessGames(username, max = 10, token = '') {
  try {
    const headers = { 'Accept': 'application/x-ndjson' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`https://lichess.org/api/games/user/${username}?max=${max}&pgnInJson=true`, {
      headers
    });
    if (!res.ok) throw new Error('Usuario no encontrado o error en Lichess');
    const text = await res.text();
    const lines = text.split('\n').filter(line => line.trim().length > 0);
    return lines.map(line => {
      const game = JSON.parse(line);
      return {
        id: game.id,
        white: game.players.white.user?.name || 'Anon',
        black: game.players.black.user?.name || 'Anon',
        result: game.winner === 'white' ? '1-0' : game.winner === 'black' ? '0-1' : '1/2-1/2',
        date: new Date(game.createdAt).toLocaleDateString(),
        pgn: game.pgn,
      };
    });
  } catch (err) {
    console.error(err);
    throw err;
  }
}

export async function fetchChesscomGames(username, max = 10) {
  try {
    const archiveRes = await fetch(`https://api.chess.com/pub/player/${username}/games/archives`);
    if (!archiveRes.ok) throw new Error('Usuario no encontrado en Chess.com');
    const archiveData = await archiveRes.json();
    if (!archiveData.archives || archiveData.archives.length === 0) return [];
    
    // Tomamos el último archivo (mes más reciente)
    const lastArchiveUrl = archiveData.archives[archiveData.archives.length - 1];
    const gamesRes = await fetch(lastArchiveUrl);
    if (!gamesRes.ok) throw new Error('Error obteniendo partidas de Chess.com');
    const gamesData = await gamesRes.json();
    
    // Obtenemos las últimas `max` partidas
    const games = gamesData.games.slice(-max).reverse();
    return games.map(game => {
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
