import React from 'react';
import Masonry from 'react-masonry-css';
import { Note } from '../types/note';
import NoteCard from './NoteCard';
import SwipeableCard from './SwipeableCard';
import { useNoteStore } from '../store/noteStore';

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

function NoteCardWrapper({ note, onEdit }: { note: Note; onEdit: (id: string) => void }) {
  const { archiveNote, togglePin, trashNote } = useNoteStore();

  return (
    <div className="mb-4">
      <SwipeableCard
        onArchive={() => archiveNote(note.id)}
        onPin={() => togglePin(note.id)}
        onTrash={() => trashNote(note.id)}
      >
        <NoteCard note={note} onEdit={onEdit} />
      </SwipeableCard>
    </div>
  );
}

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
              <NoteCardWrapper key={note.id} note={note} onEdit={onEdit} />
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
              <NoteCardWrapper key={note.id} note={note} onEdit={onEdit} />
            ))}
          </Masonry>
        </div>
      )}
    </div>
  );
}
