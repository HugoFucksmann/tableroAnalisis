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
  'Brillante': { icon: '!!', color: '#fff', bg: '#1baca6', label: 'Brillante' },
  'Genial': { icon: '!', color: '#fff', bg: '#5c92ba', label: 'Genial' },
  'Libro': { icon: <BookOpen size={12} />, color: '#fff', bg: '#a88865', label: 'Libro' },
  'Mejor': { icon: <Star size={12} fill="white" />, color: '#fff', bg: '#81b64c', label: 'Mejor' },
  'Excelente': { icon: <ThumbsUp size={12} fill="white" />, color: '#fff', bg: '#96bc4b', label: 'Excelente' },
  'Bueno': { icon: <Check size={12} />, color: '#fff', bg: '#96b566', label: 'Bueno' },
  'Imprecisión': { icon: '?!', color: '#fff', bg: '#f0c15c', label: 'Imprecisión' },
  'Error': { icon: '?', color: '#fff', bg: '#e58f39', label: 'Error' },
  'Omisión': { icon: <X size={12} strokeWidth={4} />, color: '#fff', bg: '#ff7769', label: 'Omisión' },
  'Error grave': { icon: '??', color: '#fff', bg: '#b33430', label: 'Error grave' },
};

/**
 * Fuente de verdad única de labels de evaluación.
 * Deben coincidir exactamente con los que produce evaluationRules.js.
 * Ordenados de mayor a menor severidad para que el parser
 * encuentre primero el más específico (ej: 'Error grave' antes de 'Error').
 */
export const MOVE_LABELS = [
  'Error grave',
  'Omisión',
  'Error',
  'Imprecisión',
  'Bueno',
  'Excelente',
  'Mejor',
  'Genial',
  'Brillante',
  'Libro',
];

export const PIECE_ICONS = {
  P: { white: '♙', black: '♟' },
  N: { white: '♘', black: '♞' },
  B: { white: '♗', black: '♝' },
  R: { white: '♖', black: '♜' },
  Q: { white: '♕', black: '♛' },
  K: { white: '♔', black: '♚' },
};

// Usados por OpeningExplorer para display (ya no para escribir evaluaciones)
export const BOOK_MOVE_LIMIT = 20;
export const MIN_GAMES_THRESHOLD = 100;