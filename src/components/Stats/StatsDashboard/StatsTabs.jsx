import React from 'react';
import { LayoutDashboard, List, AlertTriangle } from 'lucide-react';

export const StatsTabs = ({ 
  activeTab, 
  onTabChange, 
  totalStats, 
  analysesCount, 
  selectedCount, 
  onBulkDelete 
}) => {
  return (
    <header className="stats-top-bar">
      <div className="stats-title-section">
        <span className="stats-section-title">
          {activeTab === 'stats' ? 'Dashboard' : 'Historial'}
        </span>
        <span className="stats-section-count">
          {activeTab === 'stats'
            ? `${totalStats || 0} partidas`
            : `${analysesCount} analizadas`}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {activeTab === 'history' && selectedCount > 0 && (
          <button className="bulk-delete-btn" onClick={onBulkDelete}>
            <AlertTriangle size={13} /> Borrar {selectedCount}
          </button>
        )}
        <div className="stats-view-toggle">
          <button
            className={`view-btn ${activeTab === 'stats' ? 'active' : ''}`}
            onClick={() => onTabChange('stats')}
            title="Dashboard"
          >
            <LayoutDashboard size={14} />
          </button>
          <button
            className={`view-btn ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => onTabChange('history')}
            title="Historial"
          >
            <List size={14} />
          </button>
        </div>
      </div>
    </header>
  );
};
