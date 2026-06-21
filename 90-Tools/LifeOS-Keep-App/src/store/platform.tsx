/**
 * platform.ts — Cross-platform abstraction layer for LifeOS Keep
 *
 * Provides a single API surface that works across:
 *   - Browser (PWA)  ← uses IndexedDB + browser APIs
 *   - Electron       ← wraps the electronAPI contextBridge
 *   - Capacitor      ← future: uses Capacitor plugins
 *
 * The PlatformProvider auto-detects the environment and injects
 * the correct implementation via React context.
 */

import React, { createContext, useContext, useMemo } from 'react';
import type { Note, NoteTemplate, TaskStatus, CompletionRating } from '../types/note';
import * as storage from './storage';
import { githubSync } from '../services/githubSync';
import {
  createTask as googleCreateTask,
  listTasks as googleListTasks,
  updateTask as googleUpdateTask,
  deleteTask as googleDeleteTask,
  checkAuth as googleCheckAuth,
} from '../services/googleTasks';

// ── Types ───────────────────────────────────────────────────────────

export interface TaskResult<T = any> {
  success: boolean;
  task?: T;
  tasks?: T[];
  error?: string;
}

export interface SyncResult {
  success: boolean;
  error?: string;
  imported?: number;
}

// ── Platform API Interface ─────────────────────────────────────────

export interface PlatformAPI {
  /** Determine which platform we're running on */
  readonly platform: 'browser' | 'electron' | 'capacitor';

  // ── Storage (notes + templates) ──────────────────────────────────
  readonly storage: {
    getAll: () => Promise<Note[]>;
    get: (id: string) => Promise<Note | undefined>;
    create: (note: Partial<Note>) => Promise<Note | undefined>;
    update: (note: Note) => Promise<Note | undefined>;
    delete: (id: string) => Promise<void>;
    archive: (id: string) => Promise<void>;
    unarchive: (id: string) => Promise<void>;
    trash: (id: string) => Promise<void>;
    restore: (id: string) => Promise<void>;
    pin: (id: string) => Promise<void>;
    search: (query: string) => Promise<Note[]>;
    getByLabel: (label: string) => Promise<Note[]>;
    getByColor: (color: string) => Promise<Note[]>;
    getLabels: () => Promise<string[]>;
    getReminders: () => Promise<Note[]>;
    getChildren: (id: string) => Promise<Note[]>;
    getDescendants: (id: string) => Promise<Note[]>;
    getAncestors: (id: string) => Promise<Note[]>;
    saveTemplate: (template: Partial<NoteTemplate>) => Promise<NoteTemplate | undefined>;
    getTemplates: () => Promise<NoteTemplate[]>;
    deleteTemplate: (id: string) => Promise<void>;
  };

  // ── Google Tasks ─────────────────────────────────────────────────
  readonly tasks: {
    create: (params: { title: string; due?: string; notes?: string }) => Promise<TaskResult>;
    list: () => Promise<TaskResult>;
    update: (taskId: string, updates: any) => Promise<TaskResult>;
    delete: (taskId: string) => Promise<TaskResult>;
    checkAuth: () => Promise<{ authenticated: boolean }>;
  };

  // ── Markdown Sync ────────────────────────────────────────────────
  readonly sync: {
    exportToMarkdown: (path?: string) => Promise<SyncResult>;
    importFromMarkdown: (source?: string) => Promise<SyncResult>;
  };

  // ── Dialog ───────────────────────────────────────────────────────
  readonly dialog: {
    selectFolder: () => Promise<string | null>;
  };

  // ── App info ─────────────────────────────────────────────────────
  readonly app: {
    getPath: (name: string) => Promise<string>;
    getVersion: () => Promise<string>;
    gitSync: () => Promise<{ success: boolean; message?: string; error?: string }>;
  };
}

// ── Electron Platform ───────────────────────────────────────────────

interface ElectronAPI {
  note: Record<string, (...args: any[]) => Promise<any>>;
  sync: Record<string, (...args: any[]) => Promise<any>>;
  tasks: Record<string, (...args: any[]) => Promise<any>>;
  dialog: Record<string, (...args: any[]) => Promise<any>>;
  app: Record<string, (...args: any[]) => Promise<any>>;
}

class ElectronPlatform implements PlatformAPI {
  readonly platform = 'electron';
  private api: ElectronAPI;

  constructor(api: ElectronAPI) {
    this.api = api;
  }

  storage = {
    getAll: () => this.api.note.getAll(),
    get: (id: string) => this.api.note.get(id),
    create: (note: Partial<Note>) => this.api.note.create(note),
    update: (note: Note) => this.api.note.update(note),
    delete: (id: string) => this.api.note.delete(id),
    archive: (id: string) => this.api.note.archive(id),
    unarchive: (id: string) => this.api.note.unarchive(id),
    trash: (id: string) => this.api.note.trash(id),
    restore: (id: string) => this.api.note.restore(id),
    pin: (id: string) => this.api.note.pin(id),
    search: (query: string) => this.api.note.search(query),
    getByLabel: (label: string) => this.api.note.getByLabel(label),
    getByColor: (color: string) => this.api.note.getByColor(color),
    getLabels: () => this.api.note.getLabels(),
    getReminders: () => this.api.note.getReminders(),
    getChildren: (id: string) => this.api.note.getChildren(id),
    getDescendants: (id: string) => this.api.note.getDescendants(id),
    getAncestors: (id: string) => this.api.note.getAncestors(id),
    saveTemplate: (template: Partial<NoteTemplate>) => this.api.note.saveTemplate(template),
    getTemplates: () => this.api.note.getTemplates(),
    deleteTemplate: (id: string) => this.api.note.deleteTemplate(id),
  };

  tasks = {
    create: (params: { title: string; due?: string; notes?: string }) =>
      this.api.tasks.create(params),
    list: () => this.api.tasks.list(),
    update: (taskId: string, updates: any) => this.api.tasks.update(taskId, updates),
    delete: (taskId: string) => this.api.tasks.delete(taskId),
    checkAuth: () => this.api.tasks.checkAuth(),
  };

  sync = {
    exportToMarkdown: (path?: string) => this.api.sync.exportToMarkdown(path),
    importFromMarkdown: (source?: string) => this.api.sync.importFromMarkdown(source),
  };

  dialog = {
    selectFolder: () => this.api.dialog.selectFolder(),
  };

  app = {
    getPath: (name: string) => this.api.app.getPath(name),
    getVersion: () => this.api.app.getVersion(),
    gitSync: () => this.api.app.gitSync(),
  };
}

// ── Browser (PWA) Platform ──────────────────────────────────────────

class BrowserPlatform implements PlatformAPI {
  readonly platform = 'browser';

  /** Generate a UUID in browser (replaces node's uuid) */
  private uuid(): string {
    return crypto.randomUUID();
  }

  /** Generate an ISO timestamp */
  private now(): string {
    return new Date().toISOString();
  }

  /** Merge partial note data with defaults */
  private buildNote(partial: Partial<Note>): Note {
    const now = this.now();
    return {
      id: partial.id || this.uuid(),
      title: partial.title || '',
      content: partial.content || '',
      items: partial.items || [],
      type: partial.type || 'text',
      color: partial.color || 'white',
      labels: partial.labels || [],
      isPinned: partial.isPinned || false,
      isArchived: partial.isArchived || false,
      isTrashed: partial.isTrashed || false,
      status: partial.status || 'pending',
      createdAt: partial.createdAt || now,
      updatedAt: now,
      ...(partial.parentId != null && { parentId: partial.parentId }),
      ...(partial.dependOn && { dependOn: partial.dependOn }),
      ...(partial.progress != null && { progress: partial.progress }),
      ...(partial.completedRating && { completedRating: partial.completedRating }),
      ...(partial.startDate && { startDate: partial.startDate }),
      ...(partial.dueDate && { dueDate: partial.dueDate }),
      ...(partial.completedAt && { completedAt: partial.completedAt }),
      ...(partial.reminder && { reminder: partial.reminder }),
      ...(partial.recurrence && { recurrence: partial.recurrence }),
      ...(partial.streak != null && { streak: partial.streak }),
      ...(partial.bestStreak != null && { bestStreak: partial.bestStreak }),
      ...(partial.rollupProgress != null && { rollupProgress: partial.rollupProgress }),
    };
  }

  /** Build a partial template with defaults */
  private buildTemplate(partial: Partial<NoteTemplate>): NoteTemplate {
    const now = this.now();
    return {
      id: partial.id || this.uuid(),
      name: partial.name || 'Untitled Template',
      title: partial.title || '',
      content: partial.content || '',
      items: partial.items || [],
      type: partial.type || 'text',
      color: partial.color || 'white',
      labels: partial.labels || [],
      status: partial.status || 'pending',
      createdAt: now,
      ...(partial.parentId != null && { parentId: partial.parentId }),
      ...(partial.dependOn && { dependOn: partial.dependOn }),
      ...(partial.progress != null && { progress: partial.progress }),
      ...(partial.completedRating && { completedRating: partial.completedRating }),
      ...(partial.startDate && { startDate: partial.startDate }),
      ...(partial.dueDate && { dueDate: partial.dueDate }),
      ...(partial.recurrence && { recurrence: partial.recurrence }),
    };
  }

  // ── Storage ──────────────────────────────────────────────────────

  storage = {
    getAll: () => storage.getAllNotes(),
    get: (id: string) => storage.getNote(id),
    create: async (note: Partial<Note>) => {
      const full = this.buildNote(note);
      await storage.createNote(full);
      return full;
    },
    update: async (note: Note) => {
      await storage.updateNote(note);
      return note;
    },
    delete: (id: string) => storage.deleteNote(id),
    archive: (id: string) => storage.archiveNote(id),
    unarchive: (id: string) => storage.unarchiveNote(id),
    trash: (id: string) => storage.trashNote(id),
    restore: (id: string) => storage.restoreNote(id),
    pin: (id: string) => storage.togglePin(id),
    search: (query: string) => storage.searchNotes(query),
    getByLabel: (label: string) => storage.getByLabel(label),
    getByColor: (color: string) => storage.getByColor(color),
    getLabels: () => storage.getAllLabels(),
    getReminders: () => storage.getReminders(),
    getChildren: (id: string) => storage.getChildren(id),
    getDescendants: (id: string) => storage.getDescendants(id),
    getAncestors: (id: string) => storage.getAncestors(id),
    saveTemplate: async (template: Partial<NoteTemplate>) => {
      const full = this.buildTemplate(template);
      await storage.saveTemplate(full);
      return full;
    },
    getTemplates: () => storage.getTemplates(),
    deleteTemplate: (id: string) => storage.deleteTemplate(id),
  };

  // ── Tasks (Google Tasks REST API via OAuth) ────────────────────
  tasks = {
    create: async (params: { title: string; due?: string; notes?: string }) => {
      const result = await googleCreateTask(params.title, { due: params.due, notes: params.notes });
      return { success: result.success, task: result.data, error: result.error };
    },
    list: async () => {
      const result = await googleListTasks();
      return { success: result.success, tasks: result.data, error: result.error };
    },
    update: async (taskId: string, updates: any) => {
      const result = await googleUpdateTask(taskId, updates);
      return { success: result.success, task: result.data, error: result.error };
    },
    delete: async (taskId: string) => {
      const result = await googleDeleteTask(taskId);
      return { success: result.success, error: result.error };
    },
    checkAuth: async () => {
      const result = googleCheckAuth();
      return { authenticated: result.authenticated };
    },
  };

  // ── Sync (browser: GitHub API + download) ───────────────────────
  sync = {
    exportToMarkdown: async (_path?: string) => {
      // If GitHub is connected, push to GitHub instead of downloading
      if (githubSync.isAuthenticated) {
        try {
          // Load all notes from storage and sync them
          const allNotes = await storage.getAllNotes();
          const result = await githubSync.syncNotes(allNotes);
          return { success: result.success, error: result.success ? undefined : result.message };
        } catch (err) {
          return { success: false, error: (err as Error).message };
        }
      }

      // Otherwise, trigger a browser download
      try {
        const blob = await storage.exportToMarkdownBrowser();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `LifeOS-Keep-Export-${new Date().toISOString().split('T')[0]}.md`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        return { success: true };
      } catch (err) {
        return { success: false, error: (err as Error).message };
      }
    },
    importFromMarkdown: async (_source?: string): Promise<any> => {
      // Use a hidden file input to let the user pick a file
      return new Promise((resolve) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.md,.markdown,.txt';
        input.onchange = async (e: any) => {
          const file = e.target?.files?.[0];
          if (!file) {
            resolve({ success: false, error: 'No file selected.' });
            return;
          }
          try {
            const text = await file.text();
            const imported = await storage.importFromMarkdownText(text);
            resolve({ success: true, imported });
          } catch (err) {
            resolve({ success: false, error: (err as Error).message });
          }
        };
        input.click();
      });
    },
  };

  // ── Dialog ───────────────────────────────────────────────────────
  dialog = {
    selectFolder: async () => {
      // File System Access API (Chrome/Edge) or fallback
      try {
        const handle = await (window as any).showDirectoryPicker?.();
        if (handle) return handle.name; // can't return full path in browser
      } catch { /* ignore */ }
      return null;
    },
  };

  // ── App ──────────────────────────────────────────────────────────
  app = {
    getPath: async (_name: string) => 'browser',
    getVersion: async () => '1.1.0',
    gitSync: async () => {
      if (githubSync.isAuthenticated) {
        const allNotes = await storage.getAllNotes();
        return githubSync.syncNotes(allNotes);
      }
      return {
        success: false,
        error: 'GitHub not connected. Open Sync Settings to configure.',
      };
    },
  };
}

// ── React Context ───────────────────────────────────────────────────

const PlatformContext = createContext<PlatformAPI | null>(null);

export function PlatformProvider({ children }: { children: React.ReactNode }) {
  const platform = useMemo(() => {
    const electronAPI = (window as any).electronAPI;
    if (electronAPI?.note?.getAll) {
      console.log('[Platform] Detected Electron environment');
      return new ElectronPlatform(electronAPI);
    }
    console.log('[Platform] Detected Browser (PWA) environment');
    return new BrowserPlatform();
  }, []);

  return (
    <PlatformContext.Provider value={platform}>
      {children}
    </PlatformContext.Provider>
  );
}

export function usePlatform(): PlatformAPI {
  const ctx = useContext(PlatformContext);
  if (!ctx) {
    throw new Error('usePlatform must be used inside <PlatformProvider>');
  }
  return ctx;
}

// ── Convenience: Detect platform without context ────────────────────

export function detectPlatform(): 'electron' | 'browser' | 'capacitor' {
  if ((window as any).electronAPI?.note?.getAll) return 'electron';
  if ((window as any).Capacitor?.isNativePlatform?.()) return 'capacitor';
  return 'browser';
}
