export const statsInitialState = {
  rawData: null,
  loading: true,
  activeTab: 'stats',
  selectedIds: new Set(),
  historyLoaded: false,
  isFiltering: false,
  historyOffset: 0,
  hasMore: true,
  timeFilter: 'all',
  durationFilter: 'all',
  countFilter: 'all',
};

export function statsReducer(state, action) {
  switch (action.type) {
    case 'UPDATE':
      return { ...state, ...action.payload };
    case 'TOGGLE_SELECTION': {
      const next = new Set(state.selectedIds);
      next.has(action.id) ? next.delete(action.id) : next.add(action.id);
      return { ...state, selectedIds: next };
    }
    case 'SELECT_ALL': {
      const isAll = state.selectedIds.size === action.analyses.length && action.analyses.length > 0;
      return {
        ...state,
        selectedIds: isAll ? new Set() : new Set(action.analyses.map(a => a.id))
      };
    }
    case 'RESET_FILTERS':
      return { ...state, timeFilter: 'all', durationFilter: 'all', countFilter: 'all' };
    default:
      return state;
  }
}
