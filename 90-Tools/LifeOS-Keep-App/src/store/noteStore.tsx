import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { Note, NoteColor, NoteTemplate } from '../types/note';

interface NoteStoreState {
  notes: Note[];
  labels: string[];
  templates: NoteTemplate[];
  view: 'notes' | 'archive' | 'trash' | 'label' | 'search' | 'reminders';
  activeLabel: string | null;
  searchQuery: string;
  isLoading: boolean;
}

interface NoteStoreActions {
  loadNotes: () => Promise<void>;
  createNote: (note: Partial<Note>) => Promise<Note | undefined>;
  updateNote: (note: Note) => Promise<Note | undefined>;
  deleteNote: (id: string) => Promise<void>;
  archiveNote: (id: string) => Promise<void>;
  unarchiveNote: (id: string) => Promise<void>;
  trashNote: (id: string) => Promise<void>;
  restoreNote: (id: string) => Promise<void>;
  togglePin: (id: string) => Promise<void>;
  getNote: (id: string) => Promise<Note | undefined>;
  getArchived: () => Promise<Note[]>;
  getTrashed: () => Promise<Note[]>;
  getWithReminders: () => Promise<Note[]>;
  setView: (view: NoteStoreState['view']) => void;
  setActiveLabel: (label: string | null) => void;
  setSearchQuery: (query: string) => void;
  exportToMarkdown: (path: string) => Promise<{ success: boolean; error?: string }>;
  importFromMarkdown: (path: string) => Promise<{ success: boolean; imported?: number; error?: string }>;
  saveTemplate: (template: Partial<NoteTemplate>) => Promise<NoteTemplate | undefined>;
  deleteTemplate: (id: string) => Promise<void>;
  getTemplates: () => Promise<NoteTemplate[]>;
  createTask: (params: { title: string; due?: string; notes?: string }) => Promise<{ success: boolean; task?: any; error?: string }>;
  listTasks: () => Promise<{ success: boolean; tasks?: any[]; error?: string }>;
  deleteTask: (taskId: string) => Promise<{ success: boolean; error?: string }>;
  selectFolder: () => Promise<string | null>;
  getAppPath: () => Promise<string>;
}

const NoteStoreContext = createContext<(NoteStoreState & NoteStoreActions & { filteredNotes: Note[] }) | null>(null);

export function NoteStoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<NoteStoreState>({
    notes: [],
    labels: [],
    templates: [],
    view: 'notes',
    activeLabel: null,
    searchQuery: '',
    isLoading: true,
  });

  const api = (window as any).electronAPI;

  const loadNotes = useCallback(async () => {
    if (!api) return;
    setState(s => ({ ...s, isLoading: true }));
    const notes = await api.note.getAll();
    const labels = await api.note.getLabels();
    const templates = await api.note.getTemplates();
    setState(s => ({ ...s, notes, labels, templates, isLoading: false }));
  }, [api]);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  const createNote = useCallback(async (note: Partial<Note>) => {
    if (!api) return;
    const created = await api.note.create(note);
    await loadNotes();
    return created;
  }, [api, loadNotes]);

  const updateNote = useCallback(async (note: Note) => {
    if (!api) return;
    const updated = await api.note.update(note);
    await loadNotes();
    return updated;
  }, [api, loadNotes]);

  const deleteNote = useCallback(async (id: string) => {
    if (!api) return;
    await api.note.delete(id);
    await loadNotes();
  }, [api, loadNotes]);

  const getNote = useCallback(async (id: string) => {
    if (!api) return undefined;
    return await api.note.get(id);
  }, [api]);

  const getArchived = useCallback(async () => {
    if (!api) return [];
    const notes = await api.note.getAll();
    return notes.filter((n: Note) => n.isArchived && !n.isTrashed);
  }, [api]);

  const getTrashed = useCallback(async () => {
    if (!api) return [];
    const notes = await api.note.getAll();
    return notes.filter((n: Note) => n.isTrashed);
  }, [api]);

  const getWithReminders = useCallback(async () => {
    if (!api) return [];
    return await api.note.getReminders();
  }, [api]);

  const archiveNote = useCallback(async (id: string) => {
    if (!api) return;
    await api.note.archive(id);
    await loadNotes();
  }, [api, loadNotes]);

  const unarchiveNote = useCallback(async (id: string) => {
    if (!api) return;
    await api.note.unarchive(id);
    await loadNotes();
  }, [api, loadNotes]);

  const trashNote = useCallback(async (id: string) => {
    if (!api) return;
    await api.note.trash(id);
    await loadNotes();
  }, [api, loadNotes]);

  const restoreNote = useCallback(async (id: string) => {
    if (!api) return;
    await api.note.restore(id);
    await loadNotes();
  }, [api, loadNotes]);

  const togglePin = useCallback(async (id: string) => {
    if (!api) return;
    await api.note.pin(id);
    await loadNotes();
  }, [api, loadNotes]);

  const setView = useCallback((view: NoteStoreState['view']) => {
    setState(s => ({ ...s, view, activeLabel: null, searchQuery: '' }));
  }, []);

  const setActiveLabel = useCallback((label: string | null) => {
    setState(s => ({ ...s, activeLabel: label, view: label ? 'label' : 'notes' }));
  }, []);

  const setSearchQuery = useCallback((query: string) => {
    setState(s => ({ ...s, searchQuery: query, view: query ? 'search' : 'notes' }));
  }, []);

  const exportToMarkdown = useCallback(async (path: string) => {
    if (!api) return { success: false, error: 'API not available' };
    return await api.sync.exportToMarkdown(path);
  }, [api]);

  const importFromMarkdown = useCallback(async (path: string) => {
    if (!api) return { success: false, error: 'API not available' };
    const result = await api.sync.importFromMarkdown(path);
    if (result.success) await loadNotes();
    return result;
  }, [api, loadNotes]);

  const saveTemplate = useCallback(async (template: Partial<NoteTemplate>) => {
    if (!api) return;
    const created = await api.note.saveTemplate(template);
    await loadNotes();
    return created;
  }, [api, loadNotes]);

  const deleteTemplate = useCallback(async (id: string) => {
    if (!api) return;
    await api.note.deleteTemplate(id);
    await loadNotes();
  }, [api, loadNotes]);

  const getTemplates = useCallback(async () => {
    if (!api) return [];
    return await api.note.getTemplates();
  }, [api]);

  const createTask = useCallback(async (params: { title: string; due?: string; notes?: string }) => {
    if (!api) return { success: false, error: 'API not available' };
    return await api.tasks.create(params);
  }, [api]);

  const listTasks = useCallback(async () => {
    if (!api) return { success: false, error: 'API not available' };
    return await api.tasks.list();
  }, [api]);

  const deleteTask = useCallback(async (taskId: string) => {
    if (!api) return { success: false, error: 'API not available' };
    return await api.tasks.delete(taskId);
  }, [api]);

  const selectFolder = useCallback(async () => {
    if (!api) return null;
    return await api.dialog.selectFolder();
  }, [api]);

  const getAppPath = useCallback(async () => {
    if (!api) return '';
    return await api.app.getPath('userData');
  }, [api]);

  const filteredNotes = React.useMemo(() => {
    let result = state.notes;
    if (state.view === 'archive') {
      result = state.notes.filter(n => n.isArchived && !n.isTrashed);
    } else if (state.view === 'trash') {
      result = state.notes.filter(n => n.isTrashed);
    } else if (state.view === 'reminders') {
      result = state.notes.filter(n => n.reminder && !n.isTrashed && !n.isArchived);
    } else if (state.view === 'label' && state.activeLabel) {
      result = state.notes.filter(n => n.labels.includes(state.activeLabel!));
    } else if (state.view === 'search' && state.searchQuery) {
      const q = state.searchQuery.toLowerCase();
      result = state.notes.filter(n =>
        !n.isArchived && !n.isTrashed && (
          n.title.toLowerCase().includes(q) ||
          n.content.toLowerCase().includes(q) ||
          n.items.some(i => i.text.toLowerCase().includes(q)) ||
          n.labels.some(l => l.toLowerCase().includes(q))
        )
      );
    } else {
      result = state.notes.filter(n => !n.isArchived && !n.isTrashed);
    }
    return result;
  }, [state.notes, state.view, state.activeLabel, state.searchQuery]);

  const value = {
    ...state,
    filteredNotes,
    loadNotes,
    createNote,
    updateNote,
    deleteNote,
    getNote,
    getArchived,
    getTrashed,
    getWithReminders,
    archiveNote,
    unarchiveNote,
    trashNote,
    restoreNote,
    togglePin,
    setView,
    setActiveLabel,
    setSearchQuery,
    exportToMarkdown,
    importFromMarkdown,
    saveTemplate,
    deleteTemplate,
    getTemplates,
    createTask,
    listTasks,
    deleteTask,
    selectFolder,
    getAppPath,
  };

  return <NoteStoreContext.Provider value={value}>{children}</NoteStoreContext.Provider>;
}

export function useNoteStore() {
  const context = useContext(NoteStoreContext);
  if (!context) throw new Error('useNoteStore must be used within NoteStoreProvider');
  return context;
}
