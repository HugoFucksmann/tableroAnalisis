import { fetchWithTimeout } from '../utils/network';

export const MAX_BOOK_PLY = 30; // [FIX #1] Aumentado de 20 a 30 para capturar más teoría
const MIN_THEORY_GAMES = 5;     // [FIX #2] Bajado de 20 a 5: en ratings 2200-2500 las líneas
//          secundarias tienen menos partidas pero son teoría válida
const MAX_MOVE_RANK = 8;        // [FIX #3] Nuevo: límite de rank del movimiento en el explorer.
//          Antes era <= 3 (solo top-4), ahora <= 7 (top-8)
const LICHESS_DELAY_MS = 400;
const LICHESS_TIMEOUT_MS = 6000;
const MAX_CACHE_SIZE = 50;

// [FIX #4] Agregamos ratings más amplios para que coincidan con la base de Lichess.
// Usar solo 2200,2500 excluye demasiados juegos de la muestra.
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

        // [FIX #5] positions tiene length = history.length + 1 (incluye posición inicial).
        // El ply N de history corresponde a positions[N] (el FEN *antes* del movimiento N),
        // lo cual es correcto para consultar qué movimientos salen de esa posición.
        // Pero el nombre de apertura devuelto por Lichess describe la posición consultada,
        // así que hay que leer el opening del ply SIGUIENTE. Esto se corrige abajo.
        const maxPly = Math.min(history.length, MAX_BOOK_PLY);
        const bookPlies = new Set();

        // [FIX #6] Eliminamos la bandera `inTheory` que era de "un solo uso".
        // Ahora permitimos "gaps": si un movimiento no está en teoría pero el siguiente
        // sí lo está (línea secundaria que reaparece), seguimos buscando hasta maxPly.
        // El corte se hace solo cuando se acumulan N plies seguidos fuera de teoría.
        const MAX_CONSECUTIVE_NON_BOOK = 2;
        let consecutiveNonBook = 0;

        let finalOpeningName = '';
        let finalEcoCode = '';
        let lastTheoryPly = -1;

        for (let ply = 0; ply < maxPly; ply++) {
            if (signal?.aborted) break;

            // Corte anticipado: si ya llevamos demasiados movimientos fuera de libro consecutivos
            if (consecutiveNonBook >= MAX_CONSECUTIVE_NON_BOOK) {
                for (let i = ply; i < maxPly; i++) onPlyResolved(i, false);
                break;
            }

            // [FIX #5] positions[ply] = FEN antes del movimiento ply
            //          positions[ply + 1] = FEN después del movimiento ply
            // Consultamos positions[ply] para buscar el movimiento history[ply] en el explorer.
            const fenBeforeMove = positions[ply].split(' ').slice(0, 4).join(' ');

            let plyRetries = 2; // [FIX #7] Aumentado de 1 a 2 reintentos para rate limit
            let success = false;

            while (plyRetries >= 0 && !success && !signal?.aborted) {
                try {
                    const url = `https://explorer.lichess.ovh/lichess?fen=${encodeURIComponent(fenBeforeMove)}&ratings=${RATINGS_PARAM}`;
                    const headersOpt = token ? { Authorization: `Bearer ${token}` } : {};

                    const res = await fetchWithTimeout(url, { headers: headersOpt, signal }, LICHESS_TIMEOUT_MS);

                    if (res.status === 429) {
                        plyRetries--;
                        const waitMs = plyRetries >= 0 ? 3000 : 0;
                        if (waitMs > 0) await new Promise(r => setTimeout(r, waitMs));
                        continue;
                    }

                    if (!res.ok) throw new Error(`HTTP ${res.status}`);

                    const data = await res.json();

                    // [FIX #5 cont.] El opening que devuelve Lichess para esta posición
                    // describe el nombre de apertura que SE ALCANZÓ al llegar aquí.
                    // Lo guardamos siempre que exista (el último válido gana).
                    if (data.opening?.name) {
                        finalOpeningName = data.opening.name;
                        finalEcoCode = data.opening.eco ?? finalEcoCode;
                    }

                    // Buscamos el movimiento jugado en la lista de movimientos del explorer
                    const playedUci = history[ply].lan;
                    const explorerIdx = data.moves.findIndex(m => m.uci === playedUci);

                    // [FIX #3] Antes: explorerIdx <= 3 (top-4 solo)
                    // Ahora: explorerIdx <= MAX_MOVE_RANK - 1 (top-8)
                    if (explorerIdx > -1 && explorerIdx < MAX_MOVE_RANK) {
                        const m = data.moves[explorerIdx];
                        // [FIX #8] Error tipográfico: m.draws en lugar de m.draw
                        // gameApi.js usa m.draw (correcto), openingService usaba m.draws (incorrecto)
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