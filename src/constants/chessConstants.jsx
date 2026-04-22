/**
 * chessConstants.jsx  v3
 *
 * Cambios:
 *  - 'Libro' es la key canónica para Book Move (ya existía, se mantiene)
 *  - 'Genial' agregado al config (faltaba en v2 aunque se usaba en classifyMove)
 *  - BOOK_MOVE_LIMIT y MIN_GAMES_THRESHOLD exportados para OpeningExplorer
 *    (aunque ya no los usa para escribir evaluaciones, puede usarlos para UI)
 */
import React from 'react';
import { BookOpen, Star, ThumbsUp, Check, X, Zap } from 'lucide-react';

export const EVAL_CONFIG = {
  'Brillante': { icon: '!!', color: '#fff', bg: '#00c1b1', label: 'Brillante' },
  'Genial': { icon: <Zap size={12} fill="white" />, color: '#fff', bg: '#409cde', label: 'Genial' },
  'Libro': { icon: <BookOpen size={12} />, color: '#fff', bg: '#917961', label: 'Libro' },
  'Mejor': { icon: <Star size={12} fill="white" />, color: '#fff', bg: '#79a83a', label: 'Mejor' },
  'Excelente': { icon: <ThumbsUp size={12} fill="white" />, color: '#fff', bg: '#86a45e', label: 'Excelente' },
  'Bueno': { icon: <Check size={12} />, color: '#fff', bg: '#7e9561', label: 'Bueno' },
  'Imprecisión': { icon: '?!', color: '#fff', bg: '#f2b134', label: 'Imprecisión' },
  'Error': { icon: '?', color: '#fff', bg: '#e6912c', label: 'Error' },
  'Omisión': { icon: <X size={12} />, color: '#fff', bg: '#d46d5a', label: 'Omisión' },
  'Error grave': { icon: '??', color: '#fff', bg: '#c23e30', label: 'Error grave' },
};

export const PIECE_ICONS = {
  N: '♘', B: '♗', R: '♖', Q: '♕', K: '♔',
};

// Usados por OpeningExplorer para display (ya no para escribir evaluaciones)
export const BOOK_MOVE_LIMIT = 20;
export const MIN_GAMES_THRESHOLD = 100;