/**
 * lichessExplorerService — Centralized access to Lichess Opening Explorer API.
 */
export const lichessExplorerService = {
  /**
   * Fetches masters data from Lichess Opening Explorer.
   * @param {string} fen - The board position in FEN format.
   * @param {string} token - Lichess API token (required).
   * @returns {Promise<Object>} The parsed API response.
   */
  async fetchMastersData(fen, token) {
    if (!token || token.trim().length < 10) {
      throw new Error('Valid Lichess token is required for Opening Explorer');
    }

    const cleanFen = fen.trim().split(' ').slice(0, 4).join(' ');
    const url = `https://explorer.lichess.ovh/masters?fen=${encodeURIComponent(cleanFen)}`;
    
    const cleanToken = token.trim();
    const authHeader = cleanToken.startsWith('Bearer ') ? cleanToken : `Bearer ${cleanToken}`;
    
    const headers = {
      'Accept': 'application/json',
      'Authorization': authHeader
    };

    const response = await fetch(url, { headers });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Lichess API Error: ${response.status}`);
    }

    return await response.json();
  }
};
