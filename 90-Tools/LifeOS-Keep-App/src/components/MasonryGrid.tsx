import React from 'react';
import Masonry from 'react-masonry-css';
import { Note } from '../types/note';
import NoteCard from './NoteCard';

interface MasonryGridProps {
  notes: Note[];
  onEdit: (id: string) => void;
}

const breakpointColumns = {
  default: 4,
  1600: 3,
  1200: 3,
  900: 2,
  600: 1,
};

export default function MasonryGrid({ notes, onEdit }: MasonryGridProps) {
  const pinned = notes.filter(n => n.isPinned);
  const unpinned = notes.filter(n => !n.isPinned);

  return (
    <div className="w-full">
      {/* Pinned section */}
      {pinned.length > 0 && (
        <div className="mb-6">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-1 mb-3">
            Pinned
          </p>
          <Masonry
            breakpointCols={breakpointColumns}
            className="masonry-grid"
            columnClassName="masonry-grid-col"
          >
            {pinned.map(note => (
              <div key={note.id} className="mb-4">
                <NoteCard note={note} onEdit={onEdit} />
              </div>
            ))}
          </Masonry>
        </div>
      )}

      {/* Others section */}
      {unpinned.length > 0 && (
        <div>
          {pinned.length > 0 && (
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-1 mb-3">
              Others
            </p>
          )}
          <Masonry
            breakpointCols={breakpointColumns}
            className="masonry-grid"
            columnClassName="masonry-grid-col"
          >
            {unpinned.map(note => (
              <div key={note.id} className="mb-4">
                <NoteCard note={note} onEdit={onEdit} />
              </div>
            ))}
          </Masonry>
        </div>
      )}
    </div>
  );
}
