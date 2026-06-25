/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { NoteStoreProvider, useNoteStore } from './noteStore';
import type { Note } from '../types/note';

// Mock platform storage
const mockStorage = {
  getAll: vi.fn(),
  get: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  archive: vi.fn(),
  unarchive: vi.fn(),
  trash: vi.fn(),
  restore: vi.fn(),
  pin: vi.fn(),
  search: vi.fn(),
  getByLabel: vi.fn(),
  getByColor: vi.fn(),
  getLabels: vi.fn(),
  getReminders: vi.fn(),
  getChildren: vi.fn(),
  getDescendants: vi.fn(),
  getAncestors: vi.fn(),
  saveTemplate: vi.fn(),
  getTemplates: vi.fn(),
  deleteTemplate: vi.fn(),
};

// Mock platform tasks
const mockTasks = {
  create: vi.fn(),
  list: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  checkAuth: vi.fn(),
};

// Mock platform sync
const mockSync = {
  exportToMarkdown: vi.fn(),
  importFromMarkdown: vi.fn(),
};

// Mock platform dialog
const mockDialog = {
  selectFolder: vi.fn(),
};

// Mock platform app
const mockApp = {
  getPath: vi.fn(),
  getVersion: vi.fn(),
  gitSync: vi.fn(),
};

// Mock platform
const mockPlatform = {
  platform: 'browser' as const,
  storage: mockStorage,
  tasks: mockTasks,
  sync: mockSync,
  dialog: mockDialog,
  app: mockApp,
};

// Wrapper to inject mock platform
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <NoteStoreProvider platform={mockPlatform}>
    {children}
  </NoteStoreProvider>
);

describe('NoteStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mocks
    mockStorage.getAll.mockResolvedValue([]);
    mockStorage.get.mockResolvedValue(undefined);
    mockStorage.create.mockResolvedValue(undefined);
    mockStorage.update.mockResolvedValue(undefined);
    mockStorage.delete.mockResolvedValue(undefined);
    mockStorage.getLabels.mockResolvedValue([]);
    mockStorage.getTemplates.mockResolvedValue([]);
  });

  it('should load notes on mount', async () => {
    const notes: Note[] = [
      { id: '1', title: 'Test Note', content: 'Content', type: 'text', color: 'white', labels: [], isPinned: false, isArchived: false, isTrashed: false, status: 'pending', createdAt: '2023-01-01T00:00:00Z', updatedAt: '2023-01-01T00:00:00Z' }
    ];
    mockStorage.getAll.mockResolvedValue(notes);
    mockStorage.getLabels.mockResolvedValue(['work']);
    mockStorage.getTemplates.mockResolvedValue([]);

    const { result } = renderHook(() => useNoteStore(), { wrapper });

    // Wait for initial load
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(result.current.notes).toEqual(notes);
    expect(result.current.labels).toEqual(['work']);
    expect(mockStorage.getAll).toHaveBeenCalled();
  });

  it('should create a note', async () => {
    const newNote: Note = {
      id: '1',
      title: 'New Note',
      content: 'New content',
      type: 'text',
      color: 'white',
      labels: [],
      isPinned: false,
      isArchived: false,
      isTrashed: false,
      status: 'pending',
      createdAt: '2023-01-01T00:00:00Z',
      updatedAt: '2023-01-01T00:00:00Z'
    };

    mockStorage.create.mockResolvedValue(newNote);
    mockStorage.getAll.mockResolvedValue([newNote]);

    const { result } = renderHook(() => useNoteStore(), { wrapper });

    await act(async () => {
      await result.current.createNote({ title: 'New Note', content: 'New content' });
    });

    expect(mockStorage.create).toHaveBeenCalledWith({ title: 'New Note', content: 'New content' });
    expect(result.current.notes).toEqual([newNote]);
  });

  it('should update a note', async () => {
    const initialNote: Note = {
      id: '1',
      title: 'Initial Note',
      content: 'Initial content',
      type: 'text',
      color: 'white',
      labels: [],
      isPinned: false,
      isArchived: false,
      isTrashed: false,
      status: 'pending',
      createdAt: '2023-01-01T00:00:00Z',
      updatedAt: '2023-01-01T00:00:00Z'
    };

    const updatedNote: Note = {
      ...initialNote,
      title: 'Updated Note',
      updatedAt: '2023-01-02T00:00:00Z'
    };

    mockStorage.getAll.mockResolvedValue([initialNote]);
    mockStorage.update.mockResolvedValue(updatedNote);
    mockStorage.getAll.mockResolvedValue([updatedNote]);

    const { result } = renderHook(() => useNoteStore(), { wrapper });

    // Wait for initial load
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    await act(async () => {
      await result.current.updateNote(updatedNote);
    });

    expect(mockStorage.update).toHaveBeenCalledWith(updatedNote);
    expect(result.current.notes[0].title).toBe('Updated Note');
  });

  it('should delete a note', async () => {
    const note: Note = {
      id: '1',
      title: 'Note to delete',
      content: 'Content',
      type: 'text',
      color: 'white',
      labels: [],
      isPinned: false,
      isArchived: false,
      isTrashed: false,
      status: 'pending',
      createdAt: '2023-01-01T00:00:00Z',
      updatedAt: '2023-01-01T00:00:00Z'
    };

    mockStorage.getAll.mockResolvedValue([note]);
    mockStorage.delete.mockResolvedValue(undefined);
    mockStorage.getAll.mockResolvedValue([]);

    const { result } = renderHook(() => useNoteStore(), { wrapper });

    // Wait for initial load
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    await act(async () => {
      await result.current.deleteNote('1');
    });

    expect(mockStorage.delete).toHaveBeenCalledWith('1');
    expect(result.current.notes).toEqual([]);
  });

  it('should toggle habit completion', async () => {
    const habit: Note = {
      id: '1',
      title: 'Daily Habit',
      type: 'habit',
      color: 'green',
      labels: [],
      isPinned: false,
      isArchived: false,
      isTrashed: false,
      status: 'pending',
      createdAt: '2023-01-01T00:00:00Z',
      updatedAt: '2023-01-01T00:00:00Z',
      streak: 0,
      bestStreak: 0,
      recurrence: { rule: 'FREQ=DAILY' }
    };

    const completedHabit: Note = {
      ...habit,
      streak: 1,
      bestStreak: 1,
      completedAt: new Date().toISOString().split('T')[0],
      updatedAt: '2023-01-02T00:00:00Z'
    };

    mockStorage.getAll.mockResolvedValue([habit]);
    mockStorage.update.mockResolvedValue(completedHabit);
    mockStorage.getAll.mockResolvedValue([completedHabit]);

    const { result } = renderHook(() => useNoteStore(), { wrapper });

    // Wait for initial load
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    await act(async () => {
      await result.current.toggleHabitCompletion('1');
    });

    expect(mockStorage.update).toHaveBeenCalled();
    expect(result.current.notes[0].streak).toBe(1);
  });
});