import React, { useMemo } from 'react';
import { Loader, CheckSquare, Square, Eye, EyeOff } from 'lucide-react';
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
  isScanning,
  listRef,
  sentinelRef,
  hideAnalyzed,
  onToggleHideAnalyzed,
  hasMoreGames
}) => {
  const displayedGames = useMemo(() => {
    if (!hideAnalyzed) return games;
    return games.filter((game) => !analysedIds.has(String(game.id)));
  }, [games, analysedIds, hideAnalyzed]);

  const isBusy = isFetchingMore || isScanning;

  return (
    <div className="gi-list-section">
      {games.length > 0 && (
        <div className="gi-list-header">
          <p className="gi-list-label">{listTitle}</p>
          <div className="gi-list-actions">
            <button
              className={`gi-filter-btn ${hideAnalyzed ? 'active' : ''}`}
              onClick={onToggleHideAnalyzed}
              title={hideAnalyzed ? 'Mostrar todas las partidas' : 'Mostrar solo partidas no analizadas'}
            >
              {hideAnalyzed ? <EyeOff size={14} /> : <Eye size={14} />}
              <span>{hideAnalyzed ? 'Solo Nuevas' : 'Todas'}</span>
            </button>
            <button
              className="gi-select-all-btn"
              onClick={onToggleAll}
              title={allSelected ? 'Deseleccionar todo' : 'Seleccionar todo'}
            >
              {allSelected ? <CheckSquare size={14} /> : <Square size={14} />}
              <span>{allSelected ? 'Ninguna' : 'Todas'}</span>
            </button>
          </div>
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
          {displayedGames.length > 0 ? (
            <>
              {displayedGames.map((game) => (
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
                {isBusy && (
                  <div className="gi-loading-more">
                    <Loader size={18} className="gi-spin" />
                    <span>{isScanning ? 'Buscando partidas nuevas…' : 'Cargando más…'}</span>
                  </div>
                )}
              </div>
            </>
          ) : games.length > 0 ? (
            // All loaded games are analyzed — sentinel stays to keep triggering the scan loop
            <div className="gi-filtered-empty-state">
              {isBusy ? (
                <>
                  <Loader size={20} className="gi-spin" style={{ color: 'var(--accent-primary)' }} />
                  <span>Buscando partidas sin analizar…</span>
                </>
              ) : hasMoreGames ? (
                <span>Todas las partidas cargadas están analizadas. Bajá para buscar más.</span>
              ) : (
                <span>No quedan más partidas sin analizar.</span>
              )}
              {/* Keep sentinel alive so the observer triggers scanUntilUnanalyzed */}
              <div ref={sentinelRef} className="gi-sentinel" />
            </div>
          ) : (
            !isFetching && !error && <div className="gi-empty-state" />
          )}
        </div>
      )}
    </div>
  );
};
