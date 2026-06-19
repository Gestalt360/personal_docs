import React, { useState } from 'react';
import { NoteStoreProvider, useNoteStore } from './store/noteStore';
import Sidebar from './components/Sidebar';
import SearchBar from './components/SearchBar';
import CreateNote from './components/CreateNote';
import MasonryGrid from './components/MasonryGrid';
import NoteEditor from './components/NoteEditor';
import TemplateModal from './components/TemplateModal';
import { Lightbulb, Archive, Trash2, Bell, LayoutGrid, X } from 'lucide-react';

function AppContent() {
  const { view, filteredNotes, isLoading, labels, searchQuery } = useNoteStore();
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);

  const viewTitle = {
    notes: 'Notes',
    archive: 'Archive',
    trash: 'Trash',
    label: 'Label',
    search: 'Search Results',
    reminders: 'Reminders',
  }[view] || 'Notes';

  return (
    <div className="flex h-screen w-screen bg-gray-100">
      <Sidebar onTemplateClick={() => setShowTemplates(true)} />
      
      <div className="flex-1 flex flex-col min-w-0">
        <SearchBar />
        
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {/* View header */}
          {(view === 'archive' || view === 'trash' || view === 'search') && (
            <div className="flex items-center gap-2 mb-4 text-gray-600">
              {view === 'archive' && <Archive size={20} />}
              {view === 'trash' && <Trash2 size={20} />}
              {view === 'search' && <X size={20} />}
              <span className="font-medium text-lg">{viewTitle}</span>
              {view === 'search' && searchQuery && (
                <span className="text-sm text-gray-400">for "{searchQuery}"</span>
              )}
            </div>
          )}
          {view === 'reminders' && (
            <div className="flex items-center gap-2 mb-4 text-gray-600">
              <Bell size={20} />
              <span className="font-medium text-lg">Reminders</span>
              <span className="text-sm text-gray-400">Notes with upcoming reminders</span>
            </div>
          )}

          {/* Create note (only in notes view) */}
          {view === 'notes' && (
            <div className="max-w-[600px] mx-auto mb-8">
              <CreateNote />
            </div>
          )}

          {/* Loading */}
          {isLoading && (
            <div className="flex justify-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-600"></div>
            </div>
          )}

          {/* Empty states */}
          {!isLoading && filteredNotes.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
              {view === 'notes' && (
                <>
                  <Lightbulb size={64} strokeWidth={1} className="mb-4 text-gray-300" />
                  <p className="text-lg font-medium">Notes you add appear here</p>
                </>
              )}
              {view === 'archive' && (
                <>
                  <Archive size={64} strokeWidth={1} className="mb-4 text-gray-300" />
                  <p className="text-lg font-medium">Your archived notes appear here</p>
                </>
              )}
              {view === 'trash' && (
                <>
                  <Trash2 size={64} strokeWidth={1} className="mb-4 text-gray-300" />
                  <p className="text-lg font-medium">No notes in Trash</p>
                </>
              )}
              {view === 'search' && (
                <>
                  <X size={64} strokeWidth={1} className="mb-4 text-gray-300" />
                  <p className="text-lg font-medium">No matching notes</p>
                </>
              )}
              {view === 'label' && (
                <>
                  <LayoutGrid size={64} strokeWidth={1} className="mb-4 text-gray-300" />
                  <p className="text-lg font-medium">No notes with this label</p>
                </>
              )}
              {view === 'reminders' && (
                <>
                  <Bell size={64} strokeWidth={1} className="mb-4 text-gray-300" />
                  <p className="text-lg font-medium">No upcoming reminders</p>
                  <p className="text-sm text-gray-400 mt-1">Set a reminder in any note to see it here</p>
                </>
              )}
            </div>
          )}

          {/* Notes grid */}
          {!isLoading && filteredNotes.length > 0 && (
            <MasonryGrid
              notes={filteredNotes}
              onEdit={setEditingNote}
            />
          )}
        </div>
      </div>

      {/* Note Editor Modal */}
      {editingNote && (
        <NoteEditor
          noteId={editingNote}
          onClose={() => setEditingNote(null)}
        />
      )}

      {/* Template Modal */}
      {showTemplates && (
        <TemplateModal onClose={() => setShowTemplates(false)} />
      )}
    </div>
  );
}

export default function App() {
  return (
    <NoteStoreProvider>
      <AppContent />
    </NoteStoreProvider>
  );
}
