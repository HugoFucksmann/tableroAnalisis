import React from 'react';
import './PlayerArea.css';
import { getPieceIcon } from '../../utils/chessUtils';

function formatClock(raw) {
    if (!raw) return null;
    const clean = raw.replace(/\.\d+$/, '');
    const parts = clean.split(':');

    if (parts.length === 3) {
        const h = parseInt(parts[0], 10);
        const mm = parts[1].padStart(2, '0');
        const ss = parts[2].padStart(2, '0');
        return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
    }
    return parts.map(p => p.padStart(2, '0')).join(':');
}

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

export const PlayerArea = React.memo(({ side, name, elo, clock, material, isActive }) => {
    const initial = name?.[0]?.toUpperCase() ?? '?';

    return (
        <div
            className={`player-area ${side}${isActive ? ' active' : ''}`}
            role="region"
            aria-label={`${name} — ${side}`}
        >
            <div className="player-main">
                <div className="player-info">
                    <div className="player-name-row">
                        <span className="player-name">{name}</span>
                        {elo && <span className="player-elo">({elo})</span>}
                    </div>
                    <div className="player-status-row">
                        <CapturedPieces pieces={material?.captured} />
                        {material?.score > 0 && (
                            <span className="material-diff">+{material.score}</span>
                        )}
                    </div>
                </div>
            </div>

            <div className="player-clock-area">
                <ClockDisplay time={clock} isActive={isActive} />
            </div>
        </div>
    );
});