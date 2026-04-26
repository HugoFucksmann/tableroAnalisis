import React from 'react';
import './PlayerArea.css';
import { getPieceIcon } from '../../utils/chessUtils';

// ── Helpers ───────────────────────────────────────────────────────

/**
 * Strips milliseconds and formats as MM:SS (< 1 h) or H:MM:SS (≥ 1 h).
 * Accepts "HH:MM:SS", "HH:MM:SS.mmm", "MM:SS", "MM:SS.m", etc.
 */
function formatClock(raw) {
    if (!raw) return null;
    // Remove fractional seconds
    const clean = raw.replace(/\.\d+$/, '');
    const parts = clean.split(':');

    if (parts.length === 3) {
        const h = parseInt(parts[0], 10);
        const mm = parts[1].padStart(2, '0');
        const ss = parts[2].padStart(2, '0');
        return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
    }
    // Already MM:SS or similar
    return parts.map(p => p.padStart(2, '0')).join(':');
}

// ── Sub-components ────────────────────────────────────────────────

/** Static clock display — no colon animation. */
const ClockDisplay = ({ time, isActive }) => {
    const formatted = formatClock(time);
    if (!formatted) return null;
    return (
        <div
            className={`clock-time${isActive ? ' ticking' : ''}`}
            aria-label={`Clock: ${formatted}`}
        >
            {formatted}
        </div>
    );
};

/** Captured pieces as unicode chess symbols. */
const CapturedPieces = ({ pieces }) => {
    if (!pieces?.length) return null;
    return (
        <div className="captured-pieces" aria-label="Captured pieces">
            {pieces.map((p, i) => {
                const side = p === p.toUpperCase() ? 'white' : 'black';
                return (
                    <span key={i} className={`captured-piece ${side}`}>
                        {getPieceIcon(p)}
                    </span>
                );
            })}
        </div>
    );
};

// ── Main component ────────────────────────────────────────────────

export const PlayerArea = ({ side, name, elo, clock, material, isActive }) => {
    const initial = name?.[0]?.toUpperCase() ?? '?';

    return (
        <div
            className={`player-area ${side}${isActive ? ' active' : ''}`}
            role="region"
            aria-label={`${name} — ${side}`}
        >
            <div className="player-identity">
                <div className="player-avatar" aria-hidden="true">{initial}</div>
                <div className="player-name-wrap">
                    <span className="player-name">{name}</span>
                    {elo && <span className="player-elo">({elo})</span>}
                </div>
            </div>

            <div className="player-right">
                <CapturedPieces pieces={material?.captured} />
                {material?.score > 0 && (
                    <span className="material-diff">+{material.score}</span>
                )}
                <ClockDisplay time={clock} isActive={isActive} />
            </div>
        </div>
    );
};