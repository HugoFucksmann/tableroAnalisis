
import React from 'react';
import { BookOpen, Star, ThumbsUp, Check, X, Zap } from 'lucide-react';

export const EVAL_CONFIG = {
  'Brillante': { icon: '!!', color: '#fff', bg: '#1baca6', label: 'Brillante' },
  'Libro': { icon: <BookOpen size={12} />, color: '#fff', bg: '#a88865', label: 'Libro' },
  'Mejor': { icon: <Star size={12} fill="white" />, color: '#fff', bg: '#81b64c', label: 'Mejor' },
  'Excelente': { icon: <ThumbsUp size={12} fill="white" />, color: '#fff', bg: '#96bc4b', label: 'Excelente' },
  'Bueno': { icon: <Check size={12} />, color: '#fff', bg: '#96b566', label: 'Bueno' },
  'Imprecisión': { icon: '?!', color: '#fff', bg: '#f0c15c', label: 'Imprecisión' },
  'Error': { icon: '?', color: '#fff', bg: '#e58f39', label: 'Error' },
  'Error grave': { icon: '??', color: '#fff', bg: '#b33430', label: 'Error grave' },
};


export const MOVE_LABELS = [
  'Error grave',
  'Error',
  'Imprecisión',
  'Bueno',
  'Excelente',
  'Mejor',
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