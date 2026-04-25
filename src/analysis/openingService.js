import { fetchWithTimeout } from '../utils/network';

export const MAX_BOOK_PLY = 30;
const MIN_THEORY_GAMES = 230000;
const MAX_MOVE_RANK = 6;
const LICHESS_DELAY_MS = 400;
const LICHESS_TIMEOUT_MS = 6000;
const MAX_CACHE_SIZE = 50;

const RATINGS_PARAM = '1800,2000,2200,2500';

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


        const MAX_CONSECUTIVE_NON_BOOK = 2;
        let consecutiveNonBook = 0;

        let finalOpeningName = '';
        let finalEcoCode = '';
        let lastTheoryPly = -1;

        for (let ply = 0; ply < maxPly; ply++) {
            if (signal?.aborted) break;

            if (consecutiveNonBook >= MAX_CONSECUTIVE_NON_BOOK) {
                for (let i = ply; i < maxPly; i++) onPlyResolved(i, false);
                break;
            }

            const fenBeforeMove = positions[ply].split(' ').slice(0, 4).join(' ');

            let plyRetries = 2;
            let success = false;

            while (plyRetries >= 0 && !success && !signal?.aborted) {
                try {
                    const url = `https://explorer.lichess.ovh/lichess?fen=${encodeURIComponent(fenBeforeMove)}&ratings=${RATINGS_PARAM}`;
                    const headersOpt = token ? { Authorization: `Bearer ${token}` } : {};

                    const res = await fetchWithTimeout(url, { headers: headersOpt, signal }, LICHESS_TIMEOUT_MS);

                    if (res.status === 429) {
                        console.warn(`[OpeningService] 429 Too Many Requests in ply ${ply}. Retrying...`);
                        plyRetries--;
                        const waitMs = plyRetries >= 0 ? 3000 : 0;
                        if (waitMs > 0) await new Promise(r => setTimeout(r, waitMs));
                        continue;
                    }

                    if (!res.ok) throw new Error(`HTTP ${res.status}`);

                    const data = await res.json();
                    console.log(`[Lichess Explorer Ply ${ply} Data]:`, data);

                    if (data.opening?.name) {
                        finalOpeningName = data.opening.name;
                        finalEcoCode = data.opening.eco ?? finalEcoCode;
                    }
                    const playedUci = history[ply].lan;
                    const explorerIdx = data.moves.findIndex(m => m.uci === playedUci);

                    if (explorerIdx > -1 && explorerIdx < MAX_MOVE_RANK) {
                        const m = data.moves[explorerIdx];
                        const games = (m.white || 0) + (m.draw || m.draws || 0) + (m.black || 0);

                        if (games >= MIN_THEORY_GAMES) {
                            bookPlies.add(ply);
                            lastTheoryPly = ply;
                            consecutiveNonBook = 0; // resetear contador al encontrar libro
                            onPlyResolved(ply, true);
                        } else {
                            // El movimiento existe pero tiene muy pocas partidas
                            consecutiveNonBook++;
                            onPlyResolved(ply, false);
                        }
                    } else {
                        // Movimiento no encontrado en el explorer o rank demasiado bajo
                        consecutiveNonBook++;
                        onPlyResolved(ply, false);
                    }

                    success = true;

                    // Delay entre requests para no saturar la API de Lichess
                    if (consecutiveNonBook < MAX_CONSECUTIVE_NON_BOOK && ply < maxPly - 1) {
                        await new Promise(r => setTimeout(r, LICHESS_DELAY_MS));
                    }

                } catch (err) {
                    if (err.name === 'AbortError') break;

                    // Error de red: marcar el resto como no-libro y salir
                    console.warn(`[OpeningService] Error en ply ${ply}:`, err.message);
                    for (let i = ply; i < maxPly; i++) onPlyResolved(i, false);
                    success = true; // salir del while
                    consecutiveNonBook = MAX_CONSECUTIVE_NON_BOOK; // forzar corte
                    break;
                }
            }

            // Si el while terminó sin éxito (reintentos agotados)
            if (!success) {
                for (let i = ply; i < maxPly; i++) onPlyResolved(i, false);
                break;
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