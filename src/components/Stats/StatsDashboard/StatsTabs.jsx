import React from 'react';
import { LayoutDashboard, List, AlertTriangle } from 'lucide-react';
import './StatsTabs.css';
import { ViewToggle } from '../../common/ViewToggle';

const STATS_TAB_OPTIONS = [
  { value: 'stats',   icon: <LayoutDashboard size={14} />, title: 'Dashboard' },
  { value: 'history', icon: <List size={14} />,            title: 'Historial' },
];

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
        <ViewToggle
          options={STATS_TAB_OPTIONS}
          value={activeTab}
          onChange={onTabChange}
        />
      </div>
    </header>
  );
};

