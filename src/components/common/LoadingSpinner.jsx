import React from 'react';
import { Loader2 } from 'lucide-react';
import './LoadingSpinner.css';

/**
 * LoadingSpinner — Shared loading state component.
 *
 * @param {string} [message] — Optional message to display below the spinner
 * @param {number} [size=28]  — Icon size in px
 * @param {'full' | 'inline'} [variant='full'] — 'full' centers in parent, 'inline' is compact
 */
export const LoadingSpinner = ({ message, size = 28, variant = 'full' }) => {
  if (variant === 'inline') {
    return (
      <div className="loading-spinner-inline">
        <Loader2 className="spin-icon" size={size} />
        {message && <span>{message}</span>}
      </div>
    );
  }

  return (
    <div className="loading-spinner-container">
      <Loader2 className="spin-icon" size={size} />
      {message && <span>{message}</span>}
    </div>
  );
};
