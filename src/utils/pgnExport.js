import { Chess } from 'chess.js';

/**
 * Genera un PGN anotado a partir del historial completo de la partida.
 *
 * @param {Array}  history              - history[] del store (array de movimientos verbose)
 * @param {Object} moveEvaluations      - { moveIndex: label }
 * @param {Array}  evaluationHistory    - [{ moveIndex, score }]
 * @param {Object} engineConfig         - { depth, ... }
 * @param {Object} originalHeaders      - headers guardados al importar (White, Black, WhiteElo, etc.)
 * @param {Object} pgnCommentsByIndex   - { moveIndex: commentString } con [%clk] y otros datos originales
 */
export const generateAnnotatedPgn = (
    history,
    moveEvaluations,
    evaluationHistory,
    engineConfig,
    originalHeaders = {},
    pgnCommentsByIndex = {}
) => {
    try {
        const pgnGame = new Chess();

        // Copiar encabezados originales filtrando nulos y placeholders de chess.js
        const PLACEHOLDER = ['?', '????.??.??'];
        for (const key in originalHeaders) {
            const val = originalHeaders[key];
            if (val === null || val === undefined) continue;
            if (PLACEHOLDER.includes(String(val))) continue;
            pgnGame.header(key, String(val));
        }

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

            const evalObj = evaluationHistory.find(e => e.moveIndex === i);
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
