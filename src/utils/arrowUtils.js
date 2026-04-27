/**
 * Calcula la diferencia de evaluación.
 * Asegura que ambas unidades estén en "peones" (no centipeones).
 */
export function computeDelta(lineObj, baselineScore, baselineMate, isBlackTurn) {
    if (lineObj.mate != null) return { delta: null, mate: lineObj.mate };
    if (baselineMate != null) return { delta: null, mate: null };
  
    const lineScore = lineObj.score;
    if (lineScore == null || baselineScore == null) return { delta: null, mate: null };
  
    const parsedLine = parseFloat(lineScore);
    const parsedBaseline = parseFloat(baselineScore);
  
    if (isNaN(parsedLine) || isNaN(parsedBaseline)) return { delta: null, mate: null };
  
    // Ambos ya son white-centric pawns (positivos = ventaja blanca).
    const rawDelta = parsedLine - parsedBaseline;
    
    // Convertimos a perspectiva del jugador (player-relative):
    // Si juegan negras, un incremento positivo de rawDelta significa
    // que las blancas mejoran, por lo que las negras pierden (delta negativo).
    const playerDelta = isBlackTurn ? -rawDelta : rawDelta;
  
    return { delta: playerDelta, mate: null };
}

/**
 * Formats the evaluation delta for display.
 */
export function formatDelta(delta, mate) {
    if (mate != null) {
        return mate > 0 ? `M${mate}` : `-M${Math.abs(mate)}`;
    }
    if (delta == null || isNaN(delta)) return null;

    const abs = Math.abs(delta);
    if (abs < 0.05) return '=';
    const sign = delta > 0 ? '+' : '−';
    return `${sign}${abs.toFixed(1)}`;
}
