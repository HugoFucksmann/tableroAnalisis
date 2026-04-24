import { fetchWithTimeout } from '../utils/network';

export const MAX_BOOK_PLY = 20; // Exportado para que el queue sepa cuándo detenerse
const MIN_THEORY_GAMES = 20;
const LICHESS_DELAY_MS = 350;
const LICHESS_TIMEOUT_MS = 5000;
const MAX_CACHE_SIZE = 50;

const openingCache = new Map();

export const OpeningService = {
    async detectOpenings({ positions, history, gameId, token, signal, onPlyResolved, onOpeningDetected }) {
        if (openingCache.has(gameId)) {
            const cache = openingCache.get(gameId);
            for (let i = 0; i < history.length; i++) onPlyResolved(i, cache.bookPlies.has(i));
            onOpeningDetected?.({
                openingName: cache.openingName,
                ecoCode: cache.ecoCode,
                openingPly: cache.openingPly,
                bookPlies: cache.bookPlies
            });
            return;
        }

        const maxPly = Math.min(history.length, MAX_BOOK_PLY);
        const bookPlies = new Set();
        let inTheory = true;
        let finalOpeningName = '';
        let finalEcoCode = '';
        let lastTheoryPly = -1;

        for (let ply = 0; ply < maxPly; ply++) {
            if (signal?.aborted) break;

            if (!inTheory) {
                for (let i = ply; i < maxPly; i++) onPlyResolved(i, false);
                break;
            }

            let plyRetries = 1;
            let success = false;

            while (plyRetries >= 0 && !success && !signal?.aborted) {
                try {
                    const fen = positions[ply].split(' ').slice(0, 4).join(' ');
                    const url = `https://explorer.lichess.ovh/lichess?fen=${encodeURIComponent(fen)}&ratings=2200,2500`;
                    const headersOpt = token ? { Authorization: `Bearer ${token}` } : {};

                    const res = await fetchWithTimeout(url, { headers: headersOpt, signal }, LICHESS_TIMEOUT_MS);

                    if (res.status === 429) {
                        if (plyRetries > 0) {
                            plyRetries--;
                            await new Promise(r => setTimeout(r, 2000));
                            continue;
                        } else {
                            throw new Error('Rate limit exceeded');
                        }
                    }

                    if (!res.ok) throw new Error(`HTTP ${res.status}`);

                    const data = await res.json();

                    if (data.opening) {
                        finalOpeningName = data.opening.name;
                        finalEcoCode = data.opening.eco;
                    }

                    const explorerIdx = data.moves.findIndex(m => m.uci === history[ply].lan);

                    if (explorerIdx > -1 && explorerIdx <= 3) {
                        const m = data.moves[explorerIdx];
                        const games = (m.white || 0) + (m.draws || 0) + (m.black || 0);

                        if (games >= MIN_THEORY_GAMES) {
                            bookPlies.add(ply);
                            lastTheoryPly = ply;
                            onPlyResolved(ply, true);
                        } else {
                            inTheory = false;
                            onPlyResolved(ply, false);
                        }
                    } else {
                        inTheory = false;
                        onPlyResolved(ply, false);
                    }

                    success = true;

                    if (inTheory && ply < maxPly - 1) {
                        await new Promise(r => setTimeout(r, LICHESS_DELAY_MS));
                    }

                } catch (err) {
                    if (err.name === 'AbortError') break;
                    inTheory = false;
                    for (let i = ply; i < maxPly; i++) onPlyResolved(i, false);
                    break;
                }
            }
        }

        if (!signal?.aborted) {
            if (openingCache.size >= MAX_CACHE_SIZE) {
                openingCache.delete(openingCache.keys().next().value);
            }
            openingCache.set(gameId, {
                bookPlies,
                openingName: finalOpeningName,
                ecoCode: finalEcoCode,
                openingPly: lastTheoryPly
            });

            onOpeningDetected?.({
                openingName: finalOpeningName,
                ecoCode: finalEcoCode,
                openingPly: lastTheoryPly,
                bookPlies
            });
        }
    },

    clearCache(gameId) {
        if (gameId) openingCache.delete(gameId);
    }
};