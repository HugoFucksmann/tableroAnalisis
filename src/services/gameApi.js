export async function fetchLichessGames(username, max = 15, until = null, token = '', signal = null) {
  try {
    const headers = { 'Accept': 'application/x-ndjson' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    let url = `https://lichess.org/api/games/user/${encodeURIComponent(username)}?max=${max}&pgnInJson=true`;
    if (until) url += `&until=${until}`;

    const res = await fetch(url, { headers, signal });
    if (!res.ok) throw new Error('Usuario no encontrado o error en Lichess');

    const text = await res.text();
    const lines = text.split('\n').filter(line => line.trim().length > 0);

    const games = lines.reduce((acc, line) => {
      try {
        const game = JSON.parse(line);
        acc.push({
          id: game.id,
          white: game.players.white.user?.name || 'Anon',
          black: game.players.black.user?.name || 'Anon',
          result: game.winner === 'white' ? '1-0' : game.winner === 'black' ? '0-1' : '1/2-1/2',
          date: new Date(game.createdAt).toLocaleDateString(),
          pgn: game.pgn,
          createdAt: game.createdAt,
        });
      } catch (e) {
        console.warn('Línea NDJSON corrupta ignorada (Conexión cortada por el servidor)');
      }
      return acc;
    }, []);

    return {
      games,
      lastTimestamp: games.length > 0 ? games[games.length - 1].createdAt : null,
      hasMore: games.length === max
    };
  } catch (err) {
    if (err.name !== 'AbortError') console.error(err);
    throw err;
  }
}

export async function fetchChesscomGames(username, max = 15, pagination = null, signal = null) {
  try {
    const headers = {
      'User-Agent': 'ChessPuzzleTrainer/1.0 (Contact: elcolof@gmail.com)',
      'Accept': 'application/json'
    };

    let archives = pagination?.archives;
    let currentIdx = pagination?.currentArchiveIdx ?? 0;
    let offset = pagination?.offset ?? 0;

    if (!archives) {
      const archiveRes = await fetch(`https://api.chess.com/pub/player/${encodeURIComponent(username)}/games/archives`, { headers, signal });
      if (!archiveRes.ok) throw new Error('Usuario no encontrado en Chess.com');
      const archiveData = await archiveRes.json();

      if (!archiveData.archives || archiveData.archives.length === 0) return { games: [], pagination: null };
      archives = [...archiveData.archives].reverse();
    }

    let collectedGames = [];
    const BATCH_SIZE = 3;
    const batchUrls = archives.slice(currentIdx, currentIdx + BATCH_SIZE);
    
    const batchResults = await Promise.all(
      batchUrls.map(url => 
        fetch(url, { headers, signal })
          .then(res => res.ok ? res.json() : null)
          .catch(() => null)
      )
    );

    for (let i = 0; i < batchResults.length; i++) {
      const data = batchResults[i];
      if (!data || !data.games) {
        currentIdx++;
        offset = 0;
        continue;
      }

      const allMonthlyGames = [...data.games].reverse();
      const available = allMonthlyGames.slice(offset);
      const needed = max - collectedGames.length;
      
      if (needed <= 0) break;

      const toAdd = available.slice(0, needed);
      collectedGames = [...collectedGames, ...toAdd];
      
      offset += toAdd.length;
      if (offset >= allMonthlyGames.length) {
        currentIdx++;
        offset = 0;
      } else {
        // Encontramos suficientes partidas en este archivo
        break;
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
      pagination: { archives, currentArchiveIdx: currentIdx, offset },
      hasMore: currentIdx < archives.length || (currentIdx === archives.length - 1 && offset > 0)
    };
  } catch (err) {
    if (err.name !== 'AbortError') console.error(err);
    throw err;
  }
}