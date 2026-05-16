import React from 'react';
import { Loader, CheckSquare, Square } from 'lucide-react';
import { GameCard } from './GameCard';

export const ImportGameList = ({ 
  games, 
  isFetching, 
  error, 
  listTitle, 
  allSelected, 
  onToggleAll, 
  analysedIds, 
  selectedGameIds, 
  loadingId, 
  onToggleGameSelection, 
  onLoadGame,
  isFetchingMore,
  listRef,
  sentinelRef
}) => {
  return (
    <div className="gi-list-section">
      {games.length > 0 && (
        <div className="gi-list-header">
          <p className="gi-list-label">{listTitle}</p>
          <button
            className="gi-select-all-btn"
            onClick={onToggleAll}
            title={allSelected ? 'Deseleccionar todo' : 'Seleccionar todo'}
          >
            {allSelected ? <CheckSquare size={14} /> : <Square size={14} />}
            <span>{allSelected ? 'Ninguna' : 'Todas'}</span>
          </button>
        </div>
      )}
      {!games.length && <p className="gi-list-label">{listTitle}</p>}

      {isFetching ? (
        <div className="gi-fetching">
          <Loader size={22} className="gi-spin" />
          <span>Buscando partidas…</span>
        </div>
      ) : (
        <div ref={listRef} className="gi-list premium-scroll">
          {games.length > 0 ? (
            <>
              {games.map((game) => (
                <GameCard
                  key={game.id}
                  game={game}
                  isAnalyzed={analysedIds.has(String(game.id))}
                  isSelected={selectedGameIds.includes(game.id)}
                  loadingId={loadingId}
                  onToggleSelection={onToggleGameSelection}
                  onLoadGame={onLoadGame}
                />
              ))}

              <div ref={sentinelRef} className="gi-sentinel">
                {isFetchingMore && (
                  <div className="gi-loading-more">
                    <Loader size={18} className="gi-spin" />
                    <span>Cargando más…</span>
                  </div>
                )}
              </div>
            </>
          ) : (
            !isFetching && !error && <div className="gi-empty-state" />
          )}
        </div>
      )}
    </div>
  );
};
