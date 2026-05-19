import React from 'react';
import { HistoryItem } from './HistoryItem';
import './HistoryListView.css';


export const HistoryListView = ({ 
  analyses, 
  selectedIds, 
  onToggleAll, 
  onToggleItem, 
  onDeleteItem, 
  hasMore, 
  onLoadMore 
}) => {
  return (
    <div className="stats-history-view premium-scroll">
      <div className="history-list">
        {analyses.length > 0 && (
          <div className="history-bulk-actions">
            <div
              className={`history-select-all ${selectedIds.size === analyses.length ? 'all-selected' : ''}`}
              onClick={onToggleAll}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onToggleAll();
                }
              }}
              role="button"
              tabIndex={0}
            >
              <div className="hi-check"><div className="hi-check-inner"></div></div>
              <span>Seleccionar todos ({analyses.length})</span>
            </div>
          </div>
        )}
        
        {analyses.length === 0 ? (
          <div className="empty-history">No hay partidas analizadas aún</div>
        ) : (
          analyses.map(item => (
            <HistoryItem
              key={item.id}
              item={item}
              selected={selectedIds.has(item.id)}
              onToggle={onToggleItem}
              onDelete={onDeleteItem}
            />
          ))
        )}
        
        {analyses.length > 0 && hasMore && (
          <button className="load-more-history-btn" onClick={onLoadMore}>
            Cargar más partidas
          </button>
        )}
      </div>
    </div>
  );
};
