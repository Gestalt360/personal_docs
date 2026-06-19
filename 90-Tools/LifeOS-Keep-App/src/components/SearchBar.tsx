import React, { useState } from 'react';
import { useNoteStore } from '../store/noteStore';
import { Search, X } from 'lucide-react';

export default function SearchBar() {
  const { searchQuery, setSearchQuery } = useNoteStore();
  const [isFocused, setIsFocused] = useState(false);

  return (
    <div className="bg-white border-b border-gray-200 px-6 py-3">
      <div
        className={`max-w-[720px] mx-auto flex items-center gap-3 bg-gray-100 rounded-lg px-4 py-2.5 transition-all ${
          isFocused ? 'bg-white shadow-md ring-2 ring-amber-200' : ''
        }`}
      >
        <Search size={18} className="text-gray-500 shrink-0" />
        <input
          type="text"
          placeholder="Search your notes..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className="flex-1 bg-transparent outline-none text-sm text-gray-800 placeholder-gray-500"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <X size={18} />
          </button>
        )}
      </div>
    </div>
  );
}
