/**
 * Converts a UCI move string (e.g. "e2e4") to a react-chessboard v5 Arrow object.
 */
export function uciToArrow(uci, color = 'rgba(217, 119, 6, 0.8)') {
    if (!uci || uci.length < 4) return null;
    return { startSquare: uci.slice(0, 2), endSquare: uci.slice(2, 4), color };
}

/**
 * Derives whose turn it is from a FEN string.
 * Returns 'white' | 'black'.
 */
export function getActiveColor(fen) {
    return fen?.split(' ')[1] === 'b' ? 'black' : 'white';
}

/**
 * Convierte una casilla ("e4") a porcentajes (0% a 100%).
 * Cada casilla mide 12.5%. Centramos sumando 6.25%.
 */
export function squareToPct(square, orientation) {
    if (!square || square.length < 2) return null;

    const file = square.charCodeAt(0) - 97; // a=0 … h=7
    const rank = parseInt(square[1], 10) - 1; // 1=0 … 8=7

    let col = file;
    let row = 7 - rank;

    if (orientation === 'black') {
        col = 7 - file;
        row = rank;
    }

    return {
        x: (col * 12.5) + 6.25,
        y: (row * 12.5) + 6.25,
    };
}
