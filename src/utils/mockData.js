export const MOCK_GAMES = [
  {
    id: 'game1',
    white: 'Magnus Carlsen',
    black: 'Hikaru Nakamura',
    result: '1-0',
    date: '2023.12.15',
    event: 'Speed Chess Championship',
    pgn: '1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O Be7 6. Re1 b5 7. Bb3 d6 8. c3 O-O 9. h3 Na5 10. Bc2 c5 11. d4 Qc7',
  },
  {
    id: 'game2',
    white: 'Anish Giri',
    black: 'Ian Nepomniachtchi',
    result: '1/2-1/2',
    date: '2024.01.20',
    event: 'Tata Steel Chess',
    pgn: '1. d4 Nf6 2. c4 e6 3. Nf3 d5 4. Nc3 c6 5. Bg5 h6 6. Bh4 dxc4 7. e4 g5 8. Bg3 b5 9. Be2 Bb7 10. O-O Nbd7',
  },
  {
    id: 'game3',
    white: 'Alireza Firouzja',
    black: 'Fabiano Caruana',
    result: '0-1',
    date: '2024.02.10',
    event: 'Candidates Tournament',
    pgn: '1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 a6 6. Be3 e5 7. Nb3 Be6 8. f3 Be7 9. Qd2 O-O 10. O-O-O Nbd7',
  }
];

export const MOCK_OPENING_DATA = {
  opening: 'Ruy Lopez: Marshall Attack',
  moves: [
    { san: 'd3', white: 35, draw: 40, black: 25, games: 12450 },
    { san: 'Re1', white: 32, draw: 45, black: 23, games: 8900 },
    { san: 'c3', white: 40, draw: 35, black: 25, games: 4500 },
    { san: 'Nc3', white: 30, draw: 50, black: 20, games: 3200 },
  ]
};
