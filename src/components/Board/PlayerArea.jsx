import React from 'react';

import './PlayerArea.css';
import { getPieceIcon } from '../../utils/chessUtils';

// ── Sub-components ────────────────────────────────────────────────────────────

/**
 * Renders a chess clock time string with an animated colon when active.
 * Handles MM:SS and H:MM:SS formats.
 */
const ClockDisplay = ({ time, isActive }) => {
    if (!time) return null;
    const parts = time.split(':');

    return (
        <div
            className={`clock-time ${isActive ? 'ticking' : ''}`}
            aria-label={`Clock: ${time}`}
        >
            {parts.map((part, i) => (
                <React.Fragment key={i}>
                    {i > 0 && <span className="clock-colon">:</span>}
                    {part}
                </React.Fragment>
            ))}
        </div>
    );
};

/** Renders captured pieces as unicode chess symbols. */
const CapturedPieces = ({ pieces }) => {
    if (!pieces?.length) return null;

    return (
        <div className="captured-pieces" aria-label="Captured pieces">
            {pieces.map((p, i) => {
                const pieceSide = p === p.toUpperCase() ? 'white' : 'black';
                return (
                    <span key={i} className={`captured-piece ${pieceSide}`}>
                        {getPieceIcon(p)}
                    </span>
                );
            })}
        </div>
    );
};

// ── Main Component ────────────────────────────────────────────────────────────

/**
 * Displays a player's identity, captured pieces, material advantage and clock.
 * Highlights visually when it is this player's turn.
 *
 * @param {{
 *   side:     'white' | 'black',
 *   name:     string,
 *   clock:    string | null,
 *   material: { captured: string[], score: number },
 *   isActive: boolean
 * }} props
 */
export const PlayerArea = ({ side, name, clock, material, isActive }) => {
    const initial = name?.[0]?.toUpperCase() ?? '?';

    return (
        <div
            className={`player-area ${side} ${isActive ? 'active' : ''}`}
            role="region"
            aria-label={`${name} — ${side}`}
        >
            {/* Left: identity */}
            <div className="player-identity">
                <div className="player-avatar" aria-hidden="true">{initial}</div>
                <span className="player-name">{name}</span>
            </div>

            {/* Right: material + clock */}
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