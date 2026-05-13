import React from 'react';
import { Search, Loader } from 'lucide-react';

export const SearchInput = ({ platform, username, setSearchUsername, onSearch, isFetching }) => {
  if (platform === 'pgn') return null;

  return (
    <div className="gi-search-wrap">
      <input
        className="gi-search-input"
        type="text"
        placeholder={`Usuario en ${platform === 'lichess' ? 'Lichess' : 'Chess.com'}…`}
        value={username}
        onChange={(e) => setSearchUsername(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && onSearch()}
      />
      <button
        className="gi-search-btn"
        onClick={onSearch}
        disabled={isFetching || !username.trim()}
        aria-label="Buscar"
      >
        {isFetching ? <Loader size={15} className="gi-spin" /> : <Search size={15} />}
      </button>
    </div>
  );
};
