import { Chess } from 'chess.js';


export const generateAnnotatedPgn = (
    history,
    moveEvaluations,
    evaluationHistory,
    engineConfig,
    originalHeaders = {},
    pgnCommentsByIndex = {}
) => {
    try {
        const startFen = originalHeaders.FEN || null;
        const pgnGame = startFen ? new Chess(startFen) : new Chess();

        // Copiar encabezados originales filtrando nulos y placeholders de chess.js
        const PLACEHOLDERS = new Set(['?', '????.??.??']);
        for (const key in originalHeaders) {
            const val = originalHeaders[key];
            if (val === null || val === undefined) continue;
            if (PLACEHOLDERS.has(String(val))) continue;
            // No sobreescribir FEN si ya lo inicializamos en el constructor
            if (key === 'FEN' && startFen) continue;
            pgnGame.header(key, String(val));
        }
        if (startFen) pgnGame.header('FEN', startFen);

        if (engineConfig?.depth) {
            pgnGame.header('Annotator', `Tablero Análisis (Stockfish Profundidad ${engineConfig.depth})`);
        }

        // Reproducir todos los movimientos desde el array completo del store
        for (let i = 0; i < history.length; i++) {
            const move = history[i];
            try {
                pgnGame.move(move.san);
            } catch {
                console.warn(`pgnExport: movimiento inválido en índice ${i}: ${move.san}`);
                break;
            }

            const evalObj = evaluationHistory?.[i];
            const moveEval = moveEvaluations[i];

            // Extraer [%clk] del comentario original si existe
            const originalComment = pgnCommentsByIndex[i] ?? '';
            const clkMatch = originalComment.match(/\[%clk\s+[^\]]+\]/);
            const clkTag = clkMatch ? clkMatch[0] : '';

            let comment = '';
            // Primero el [%clk] para respetar el estándar PGN
            if (clkTag) comment += clkTag;
            if (evalObj?.score !== undefined) {
                comment += comment ? ` [%eval ${evalObj.score}]` : `[%eval ${evalObj.score}]`;
            }
            if (moveEval) {
                comment += comment ? ` ${moveEval}` : moveEval;
            }

            if (comment) {
                pgnGame.setComment(comment);
            }
        }

        // Asegurar resultado al final si la partida terminó
        if (!pgnGame.header().Result) {
            if (pgnGame.isGameOver()) {
                if (pgnGame.isCheckmate()) {
                    pgnGame.header('Result', pgnGame.turn() === 'w' ? '0-1' : '1-0');
                } else {
                    pgnGame.header('Result', '1/2-1/2');
                }
            } else {
                pgnGame.header('Result', '*');
            }
        }

        return pgnGame.pgn();
    } catch (e) {
        console.error('Error generating PGN:', e);
        try {
            const fallback = new Chess();
            for (const m of history) {
                try { fallback.move(m.san); } catch { break; }
            }
            return fallback.pgn();
        } catch {
            return '';
        }
    }
};

export const downloadPgn = (pgnString, filename = 'analisis_partida.pgn') => {
    const blob = new Blob([pgnString], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};
