import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { Note, NoteColor, NoteTemplate, TaskStatus, CompletionRating } from '../types/note';
import { usePlatform } from './platform';

interface NoteStoreState {
  notes: Note[];
  labels: string[];
  templates: NoteTemplate[];
  view: 'notes' | 'archive' | 'trash' | 'label' | 'search' | 'reminders' | 'goals' | 'habits' | 'projects' | 'timeline';
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
  getTree: () => Note[];
  updateProgress: (id: string, progress: number) => Promise<void>;
  updateStatus: (id: string, status: TaskStatus) => Promise<void>;
  updateRating: (id: string, rating: CompletionRating) => Promise<void>;
  toggleCompletion: (id: string) => Promise<void>;
  addDependency: (noteId: string, dependsOnId: string) => Promise<void>;
  removeDependency: (noteId: string, dependsOnId: string) => Promise<void>;
  toggleHabitCompletion: (id: string) => Promise<void>;
  rollupProgress: (id: string) => number;
  setView: (view: NoteStoreState['view']) => void;
  setActiveLabel: (label: string | null) => void;
  setSearchQuery: (query: string) => void;
  exportToMarkdown: (path?: string) => Promise<{ success: boolean; error?: string }>;
  importFromMarkdown: (path?: string) => Promise<{ success: boolean; imported?: number; error?: string }>;
  saveTemplate: (template: Partial<NoteTemplate>) => Promise<NoteTemplate | undefined>;
  deleteTemplate: (id: string) => Promise<void>;
  getTemplates: () => Promise<NoteTemplate[]>;
  createTask: (params: { title: string; due?: string; notes?: string }) => Promise<{ success: boolean; task?: any; error?: string }>;
  listTasks: () => Promise<{ success: boolean; tasks?: any[]; error?: string }>;
  updateTask: (taskId: string, updates: any) => Promise<{ success: boolean; task?: any; error?: string }>;
  deleteTask: (taskId: string) => Promise<{ success: boolean; error?: string }>;
  checkAuth: () => Promise<{ authenticated: boolean }>;
  selectFolder: () => Promise<string | null>;
  getAppPath: () => Promise<string>;
  getVersion: () => Promise<string>;
}

const NoteStoreContext = createContext<(NoteStoreState & NoteStoreActions & { filteredNotes: Note[] }) | null>(null);

export function NoteStoreProvider({ children }: { children: React.ReactNode }) {
  const platform = usePlatform();

  const [state, setState] = useState<NoteStoreState>({
    notes: [],
    labels: [],
    templates: [],
    view: 'notes',
    activeLabel: null,
    searchQuery: '',
    isLoading: true,
  });

  const loadNotes = useCallback(async () => {
    setState(s => ({ ...s, isLoading: true }));
    const notes = await platform.storage.getAll();
    const labels = await platform.storage.getLabels();
    const templates = await platform.storage.getTemplates();
    setState(s => ({ ...s, notes, labels, templates, isLoading: false }));
  }, [platform]);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  const createNote = useCallback(async (note: Partial<Note>) => {
    const created = await platform.storage.create(note);
    await loadNotes();
    return created;
  }, [platform, loadNotes]);

  const updateNote = useCallback(async (note: Note) => {
    const updated = await platform.storage.update(note);
    await loadNotes();
    return updated;
  }, [platform, loadNotes]);

  const deleteNote = useCallback(async (id: string) => {
    await platform.storage.delete(id);
    await loadNotes();
  }, [platform, loadNotes]);

  const getNote = useCallback(async (id: string) => {
    return await platform.storage.get(id);
  }, [platform]);

  const getArchived = useCallback(async () => {
    const notes = await platform.storage.getAll();
    return notes.filter((n: Note) => n.isArchived && !n.isTrashed);
  }, [platform]);

  const getTrashed = useCallback(async () => {
    const notes = await platform.storage.getAll();
    return notes.filter((n: Note) => n.isTrashed);
  }, [platform]);

  const getWithReminders = useCallback(async () => {
    return await platform.storage.getReminders();
  }, [platform]);

  const getTree = useCallback(() => {
    const buildTree = (parentId: string | null = null): Note[] => {
      return state.notes
        .filter(n => n.parentId === parentId && !n.isTrashed)
        .map(n => ({
          ...n,
          children: buildTree(n.id),
        }));
    };
    return buildTree(null);
  }, [state.notes]);

  const rollupProgress = useCallback((id: string): number => {
    const note = state.notes.find(n => n.id === id);
    if (!note) return 0;
    
    // If it's a checklist note, progress is based on checkboxes
    if (note.items && note.items.length > 0) {
      const checked = note.items.filter(i => i.checked).length;
      return Math.round((checked / note.items.length) * 100);
    }
    
    // Find children
    const children = state.notes.filter(n => n.parentId === id && !n.isTrashed);
    if (children.length === 0) {
      return note.progress || (note.status === 'completed' ? 100 : 0);
    }
    
    // Recursively calculate average progress of children
    const totalProgress = children.reduce((sum, child) => sum + rollupProgress(child.id), 0);
    return Math.round(totalProgress / children.length);
  }, [state.notes]);

  const updateProgress = useCallback(async (id: string, progress: number) => {
    const note = state.notes.find(n => n.id === id);
    if (!note) return;
    const updated = { ...note, progress, updatedAt: new Date().toISOString() };
    await platform.storage.update(updated);
    await loadNotes();
  }, [platform, loadNotes, state.notes]);

  const updateStatus = useCallback(async (id: string, status: TaskStatus) => {
    const note = state.notes.find(n => n.id === id);
    if (!note) return;
    const updated: Note = {
      ...note,
      status,
      completedAt: status === 'completed' ? new Date().toISOString() : status === 'not_done' ? undefined : note.completedAt,
      progress: status === 'completed' ? 100 : status === 'not_done' ? 0 : note.progress,
      updatedAt: new Date().toISOString(),
    };
    await platform.storage.update(updated);
    await loadNotes();
  }, [platform, loadNotes, state.notes]);

  const updateRating = useCallback(async (id: string, rating: CompletionRating) => {
    const note = state.notes.find(n => n.id === id);
    if (!note) return;
    const updated = { ...note, completedRating: rating === 'none' ? undefined : rating, updatedAt: new Date().toISOString() };
    await platform.storage.update(updated);
    await loadNotes();
  }, [platform, loadNotes, state.notes]);

  const toggleCompletion = useCallback(async (id: string) => {
    const note = state.notes.find(n => n.id === id);
    if (!note) return;
    const isCurrentlyCompleted = note.status === 'completed';
    const newStatus: TaskStatus = isCurrentlyCompleted ? 'not_done' : 'completed';
    await updateStatus(id, newStatus);
  }, [updateStatus, state.notes]);

  const addDependency = useCallback(async (noteId: string, dependsOnId: string) => {
    const note = state.notes.find(n => n.id === noteId);
    if (!note) return;
    const deps = note.dependOn || [];
    if (deps.includes(dependsOnId)) return;
    const updated = { ...note, dependOn: [...deps, dependsOnId], updatedAt: new Date().toISOString() };
    await platform.storage.update(updated);
    await loadNotes();
  }, [platform, loadNotes, state.notes]);

  const removeDependency = useCallback(async (noteId: string, dependsOnId: string) => {
    const note = state.notes.find(n => n.id === noteId);
    if (!note) return;
    const deps = (note.dependOn || []).filter(d => d !== dependsOnId);
    const updated = { ...note, dependOn: deps.length > 0 ? deps : undefined, updatedAt: new Date().toISOString() };
    await platform.storage.update(updated);
    await loadNotes();
  }, [platform, loadNotes, state.notes]);

  const toggleHabitCompletion = useCallback(async (id: string) => {
    const note = state.notes.find(n => n.id === id);
    if (!note) return;
    
    const today = new Date().toISOString().split('T')[0];
    const completedDates: string[] = note.completedAt ? [note.completedAt] : [];
    
    // Toggle today's completion
    const index = completedDates.indexOf(today);
    let newDates: string[];
    let newStreak = note.streak || 0;
    let newBestStreak = note.bestStreak || 0;
    
    if (index >= 0) {
      newDates = completedDates.filter(d => d !== today);
      newStreak = Math.max(0, newStreak - 1);
    } else {
      newDates = [...completedDates, today];
      newStreak += 1;
      newBestStreak = Math.max(newStreak, newBestStreak);
    }
    
    const updated = {
      ...note,
      streak: newStreak,
      bestStreak: newBestStreak,
      completedAt: newDates.join(','),
      updatedAt: new Date().toISOString(),
    };
    await platform.storage.update(updated);
    await loadNotes();
  }, [platform, loadNotes, state.notes]);

  const archiveNote = useCallback(async (id: string) => {
    await platform.storage.archive(id);
    await loadNotes();
  }, [platform, loadNotes]);

  const unarchiveNote = useCallback(async (id: string) => {
    await platform.storage.unarchive(id);
    await loadNotes();
  }, [platform, loadNotes]);

  const trashNote = useCallback(async (id: string) => {
    await platform.storage.trash(id);
    await loadNotes();
  }, [platform, loadNotes]);

  const restoreNote = useCallback(async (id: string) => {
    await platform.storage.restore(id);
    await loadNotes();
  }, [platform, loadNotes]);

  const togglePin = useCallback(async (id: string) => {
    await platform.storage.pin(id);
    await loadNotes();
  }, [platform, loadNotes]);

  const setView = useCallback((view: NoteStoreState['view']) => {
    setState(s => ({ ...s, view, activeLabel: null, searchQuery: '' }));
  }, []);

  const setActiveLabel = useCallback((label: string | null) => {
    setState(s => ({ ...s, activeLabel: label, view: label ? 'label' : 'notes' }));
  }, []);

  const setSearchQuery = useCallback((query: string) => {
    setState(s => ({ ...s, searchQuery: query, view: query ? 'search' : 'notes' }));
  }, []);

  const exportToMarkdown = useCallback(async (path?: string) => {
    return await platform.sync.exportToMarkdown(path);
  }, [platform]);

  const importFromMarkdown = useCallback(async (path?: string) => {
    const result = await platform.sync.importFromMarkdown(path);
    if (result.success) await loadNotes();
    return result;
  }, [platform, loadNotes]);

  const saveTemplate = useCallback(async (template: Partial<NoteTemplate>) => {
    const created = await platform.storage.saveTemplate(template);
    await loadNotes();
    return created;
  }, [platform, loadNotes]);

  const deleteTemplate = useCallback(async (id: string) => {
    await platform.storage.deleteTemplate(id);
    await loadNotes();
  }, [platform, loadNotes]);

  const getTemplates = useCallback(async () => {
    return await platform.storage.getTemplates();
  }, [platform]);

  const createTask = useCallback(async (params: { title: string; due?: string; notes?: string }) => {
    return await platform.tasks.create(params);
  }, [platform]);

  const listTasks = useCallback(async () => {
    return await platform.tasks.list();
  }, [platform]);

  const deleteTask = useCallback(async (taskId: string) => {
    return await platform.tasks.delete(taskId);
  }, [platform]);

  const checkAuth = useCallback(async () => {
    return await platform.tasks.checkAuth();
  }, [platform]);

  const updateTask = useCallback(async (taskId: string, updates: any) => {
    return await platform.tasks.update(taskId, updates);
  }, [platform]);

  const selectFolder = useCallback(async () => {
    return await platform.dialog.selectFolder();
  }, [platform]);

  const getAppPath = useCallback(async () => {
    return await platform.app.getPath('userData');
  }, [platform]);

  const getVersion = useCallback(async () => {
    return await platform.app.getVersion();
  }, [platform]);

  const filteredNotes = React.useMemo(() => {
    let result = state.notes;
    if (state.view === 'archive') {
      result = state.notes.filter(n => n.isArchived && !n.isTrashed);
    } else if (state.view === 'trash') {
      result = state.notes.filter(n => n.isTrashed);
    } else if (state.view === 'reminders') {
      result = state.notes.filter(n => n.reminder && !n.isTrashed && !n.isArchived);
    } else if (state.view === 'goals') {
      result = state.notes.filter(n =>
        !n.isArchived && !n.isTrashed &&
        ['vision', '3-5-year-goal', 'annual-goal', 'quarterly-goal', 'monthly-goal', 'weekly-goal', 'daily-goal'].includes(n.type)
      );
    } else if (state.view === 'habits') {
      result = state.notes.filter(n => !n.isArchived && !n.isTrashed && n.type === 'habit');
    } else if (state.view === 'projects') {
      result = state.notes.filter(n => !n.isArchived && !n.isTrashed && n.type === 'project');
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
    } else if (state.view === 'notes') {
      result = state.notes.filter(n => !n.isArchived && !n.isTrashed && (n.type === 'text' || n.type === 'checklist' || n.type === 'task'));
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
    getTree,
    updateProgress,
    updateStatus,
    updateRating,
    toggleCompletion,
    addDependency,
    removeDependency,
    toggleHabitCompletion,
    rollupProgress,
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
    updateTask,
    deleteTask,
    checkAuth,
    selectFolder,
    getAppPath,
    getVersion,
  };

  return <NoteStoreContext.Provider value={value}>{children}</NoteStoreContext.Provider>;
}

export function useNoteStore() {
  const context = useContext(NoteStoreContext);
  if (!context) throw new Error('useNoteStore must be used within NoteStoreProvider');
  return context;
}
