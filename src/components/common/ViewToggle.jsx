import React from 'react';
import './ViewToggle.css';

/**
 * ViewToggle — Shared segmented button toggle.
 *
 * @param {Array<{ value: string, label?: string, icon?: React.ReactNode, title?: string }>} options
 * @param {string} value — Currently active value
 * @param {function} onChange — Called with the new value on click
 */
export const ViewToggle = ({ options, value, onChange }) => {
  return (
    <div className="view-toggle">
      {options.map((opt) => (
        <button
          key={opt.value}
          className={`view-toggle-btn ${value === opt.value ? 'active' : ''}`}
          onClick={() => onChange(opt.value)}
          title={opt.title}
        >
          {opt.icon}
          {opt.label && <span>{opt.label}</span>}
        </button>
      ))}
    </div>
  );
};
