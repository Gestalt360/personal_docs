import React, { useState } from 'react';
import { NoteStoreProvider, useNoteStore } from './store/noteStore';
import { PlatformProvider } from './store/platform';
import Sidebar from './components/Sidebar';
import SearchBar from './components/SearchBar';
import CreateNote from './components/CreateNote';
import MasonryGrid from './components/MasonryGrid';
import NoteEditor from './components/NoteEditor';
import TemplateModal from './components/TemplateModal';
import GoalsTree from './components/GoalsTree';
import HabitTracker from './components/HabitTracker';
import { Lightbulb, Archive, Trash2, Bell, LayoutGrid, X, Target, Flame, CheckSquare } from 'lucide-react';

function AppContent() {
  const { view, filteredNotes, isLoading, searchQuery } = useNoteStore();
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);

  const viewTitle = {
    notes: 'Notes',
    archive: 'Archive',
    trash: 'Trash',
    label: 'Label',
    search: 'Search Results',
    reminders: 'Reminders',
    goals: 'Goals & Planning',
    habits: 'Habit Tracker',
    projects: 'Projects',
    timeline: 'Timeline',
  }[view] || 'Notes';

  const handleEditNote = (id: string) => {
    setEditingNote(id);
  };

  const renderViewHeader = () => {
    const headerConfig: Record<string, { icon: React.ReactNode; subtitle?: string }> = {
      archive: { icon: <Archive size={20} /> },
      trash: { icon: <Trash2 size={20} /> },
      search: { icon: <X size={20} /> },
      reminders: { icon: <Bell size={20} />, subtitle: 'Notes with upcoming reminders' },
      goals: { icon: <Target size={20} />, subtitle: 'Vision → 3-5 Year → Annual → Quarterly → Monthly → Weekly → Daily' },
      habits: { icon: <Flame size={20} />, subtitle: 'Track your daily streaks' },
      projects: { icon: <CheckSquare size={20} />, subtitle: 'Active projects and milestones' },
    };

    const config = headerConfig[view];
    if (!config && view !== 'search') return null;

    return (
      <div className="flex items-center gap-2 mb-4 text-gray-600">
        {config?.icon}
        <span className="font-medium text-lg">{viewTitle}</span>
        {view === 'search' && searchQuery && (
          <span className="text-sm text-gray-400">for "{searchQuery}"</span>
        )}
        {config?.subtitle && (
          <span className="text-sm text-gray-400 hidden md:inline">— {config.subtitle}</span>
        )}
      </div>
    );
  };

  const renderEmptyState = () => {
    const emptyStates: Record<string, { icon: React.ReactNode; message: string; submessage?: string }> = {
      notes: {
        icon: <Lightbulb size={64} strokeWidth={1} className="mb-4 text-gray-300" />,
        message: 'Notes you add appear here',
      },
      archive: {
        icon: <Archive size={64} strokeWidth={1} className="mb-4 text-gray-300" />,
        message: 'Your archived notes appear here',
      },
      trash: {
        icon: <Trash2 size={64} strokeWidth={1} className="mb-4 text-gray-300" />,
        message: 'No notes in Trash',
      },
      search: {
        icon: <X size={64} strokeWidth={1} className="mb-4 text-gray-300" />,
        message: 'No matching notes',
      },
      label: {
        icon: <LayoutGrid size={64} strokeWidth={1} className="mb-4 text-gray-300" />,
        message: 'No notes with this label',
      },
      reminders: {
        icon: <Bell size={64} strokeWidth={1} className="mb-4 text-gray-300" />,
        message: 'No upcoming reminders',
        submessage: 'Set a reminder in any note to see it here',
      },
      goals: {
        icon: <Target size={64} strokeWidth={1} className="mb-4 text-gray-300" />,
        message: 'No goals defined yet',
        submessage: 'Use the quick-add buttons above to create your vision, goals, and projects',
      },
      habits: {
        icon: <Flame size={64} strokeWidth={1} className="mb-4 text-gray-300" />,
        message: 'No habits tracked yet',
        submessage: 'Add a habit using the input above to start tracking your streaks',
      },
      projects: {
        icon: <CheckSquare size={64} strokeWidth={1} className="mb-4 text-gray-300" />,
        message: 'No active projects',
        submessage: 'Create a project from the Goals view or sidebar',
      },
    };

    const state = emptyStates[view] || emptyStates.notes;
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400">
        {state.icon}
        <p className="text-lg font-medium">{state.message}</p>
        {state.submessage && (
          <p className="text-sm text-gray-400 mt-1">{state.submessage}</p>
        )}
      </div>
    );
  };

  return (
    <div className="flex h-screen w-screen bg-gray-100">
      <Sidebar onTemplateClick={() => setShowTemplates(true)} />
      
      <div className="flex-1 flex flex-col min-w-0">
        <SearchBar />
        
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {/* View header */}
          {renderViewHeader()}

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

          {/* Goals Tree View */}
          {!isLoading && view === 'goals' && (
            <div className="max-w-[900px] mx-auto">
              <GoalsTree onEditNote={handleEditNote} />
            </div>
          )}

          {/* Habit Tracker View */}
          {!isLoading && view === 'habits' && (
            <div className="max-w-[600px] mx-auto">
              <HabitTracker />
            </div>
          )}

          {/* Projects View (reuses the grid with filter) */}
          {!isLoading && view === 'projects' && filteredNotes.length > 0 && (
            <MasonryGrid notes={filteredNotes} onEdit={handleEditNote} />
          )}

          {/* Default views (notes, archive, trash, search, label, reminders) */}
          {!isLoading && !['goals', 'habits', 'projects'].includes(view) && filteredNotes.length === 0 && (
            renderEmptyState()
          )}
          {!isLoading && filteredNotes.length > 0 && !['goals', 'habits'].includes(view) && (
            <MasonryGrid notes={filteredNotes} onEdit={handleEditNote} />
          )}

          {/* Projects empty state */}
          {!isLoading && view === 'projects' && filteredNotes.length === 0 && (
            renderEmptyState()
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
    <PlatformProvider>
      <NoteStoreProvider>
        <AppContent />
      </NoteStoreProvider>
    </PlatformProvider>
  );
}
