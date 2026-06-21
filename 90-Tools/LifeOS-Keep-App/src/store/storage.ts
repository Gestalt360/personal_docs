/**
 * storage.ts — Cross-platform IndexedDB storage for LifeOS Keep
 *
 * Works in every browser, Electron renderer, and Capacitor WebView.
 * Replaces the Electron-only JSON file store (electron/db.ts).
 *
 * Database schema:
 *   - notes:  object store, keyPath='id', indexes on type/archived/trashed/parentId/labels
 *   - templates: object store, keyPath='id'
 *   - meta:    key-value store for settings/migration state
 */

import { openDB, type IDBPDatabase } from 'idb';
import type { Note, NoteTemplate } from '../types/note';

// ── Schema ──────────────────────────────────────────────────────────

interface KeepDB {
  notes: Note;
  templates: NoteTemplate;
  meta: { key: string; value: unknown };
}

const DB_NAME = 'lifeos-keep';
const DB_VERSION = 1;

let _dbPromise: Promise<IDBPDatabase<KeepDB>> | null = null;

function getDB(): Promise<IDBPDatabase<KeepDB>> {
  if (!_dbPromise) {
    _dbPromise = openDB<KeepDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Notes store
        if (!db.objectStoreNames.contains('notes')) {
          const notes = db.createObjectStore('notes', { keyPath: 'id' });
          notes.createIndex('type', 'type');
          notes.createIndex('isArchived', 'isArchived');
          notes.createIndex('isTrashed', 'isTrashed');
          notes.createIndex('parentId', 'parentId');
          notes.createIndex('labels', 'labels', { multiEntry: true });
          notes.createIndex('reminder', 'reminder');
          notes.createIndex('color', 'color');
        }

        // Templates store
        if (!db.objectStoreNames.contains('templates')) {
          db.createObjectStore('templates', { keyPath: 'id' });
        }

        // Meta store (key-value for settings)
        if (!db.objectStoreNames.contains('meta')) {
          db.createObjectStore('meta', { keyPath: 'key' });
        }
      },
    });
  }
  return _dbPromise;
}

// ── Notes CRUD ──────────────────────────────────────────────────────

export async function getAllNotes(): Promise<Note[]> {
  const db = await getDB();
  return db.getAll('notes');
}

export async function getNote(id: string): Promise<Note | undefined> {
  const db = await getDB();
  return db.get('notes', id);
}

export async function createNote(note: Note): Promise<Note> {
  const db = await getDB();
  await db.add('notes', note);
  return note;
}

export async function updateNote(note: Note): Promise<Note> {
  const db = await getDB();
  await db.put('notes', note);
  return note;
}

export async function deleteNote(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('notes', id);
}

// ── Lifecycle helpers ───────────────────────────────────────────────

export async function archiveNote(id: string): Promise<void> {
  const note = await getNote(id);
  if (note) {
    note.isArchived = true;
    note.updatedAt = new Date().toISOString();
    await updateNote(note);
  }
}

export async function unarchiveNote(id: string): Promise<void> {
  const note = await getNote(id);
  if (note) {
    note.isArchived = false;
    note.updatedAt = new Date().toISOString();
    await updateNote(note);
  }
}

export async function trashNote(id: string): Promise<void> {
  const note = await getNote(id);
  if (note) {
    note.isTrashed = true;
    note.updatedAt = new Date().toISOString();
    await updateNote(note);
  }
}

export async function restoreNote(id: string): Promise<void> {
  const note = await getNote(id);
  if (note) {
    note.isTrashed = false;
    note.isArchived = false;
    note.updatedAt = new Date().toISOString();
    await updateNote(note);
  }
}

export async function togglePin(id: string): Promise<void> {
  const note = await getNote(id);
  if (note) {
    note.isPinned = !note.isPinned;
    note.updatedAt = new Date().toISOString();
    await updateNote(note);
  }
}

// ── Queries ─────────────────────────────────────────────────────────

export async function searchNotes(query: string): Promise<Note[]> {
  const db = await getDB();
  const all = await db.getAll('notes');
  const q = query.toLowerCase();
  return all.filter(
    (n) =>
      !n.isArchived &&
      !n.isTrashed &&
      (n.title.toLowerCase().includes(q) ||
        n.content.toLowerCase().includes(q) ||
        n.items.some((i: any) => i.text.toLowerCase().includes(q)) ||
        n.labels.some((l: any) => l.toLowerCase().includes(q)))
  );
}

export async function getByLabel(label: string): Promise<Note[]> {
  const db = await getDB();
  const all = await db.getAll('notes');
  return all.filter((n) => !n.isArchived && !n.isTrashed && n.labels.includes(label));
}

export async function getByColor(color: string): Promise<Note[]> {
  const db = await getDB();
  const all = await db.getAll('notes');
  return all.filter((n) => !n.isArchived && !n.isTrashed && n.color === color);
}

export async function getAllLabels(): Promise<string[]> {
  const db = await getDB();
  const all = await db.getAll('notes');
  const labels = new Set<string>();
  all.forEach((n) => n.labels.forEach((l: any) => labels.add(l)));
  return Array.from(labels).sort();
}

export async function getReminders(): Promise<Note[]> {
  const db = await getDB();
  const all = await db.getAll('notes');
  return all.filter((n) => n.reminder && !n.isTrashed && !n.isArchived);
}

export async function getChildren(id: string): Promise<Note[]> {
  const db = await getDB();
  const all = await db.getAll('notes');
  return all.filter((n) => n.parentId === id && !n.isTrashed);
}

export async function getDescendants(id: string): Promise<Note[]> {
  const db = await getDB();
  const all = await db.getAll('notes');
  const result: Note[] = [];
  const stack = [id];
  while (stack.length > 0) {
    const parentId = stack.pop()!;
    const children = all.filter((n) => n.parentId === parentId && !n.isTrashed);
    for (const child of children) {
      result.push(child);
      stack.push(child.id);
    }
  }
  return result;
}

export async function getAncestors(id: string): Promise<Note[]> {
  const db = await getDB();
  const all = await db.getAll('notes');
  const result: Note[] = [];
  let current = all.find((n) => n.id === id);
  while (current?.parentId) {
    const parent = all.find((n) => n.id === current!.parentId);
    if (parent) {
      result.push(parent);
      current = parent;
    } else {
      break;
    }
  }
  return result;
}

// ── Templates CRUD ──────────────────────────────────────────────────

export async function saveTemplate(
  template: NoteTemplate
): Promise<NoteTemplate> {
  const db = await getDB();
  await db.put('templates', template);
  return template;
}

export async function getTemplates(): Promise<NoteTemplate[]> {
  const db = await getDB();
  return db.getAll('templates');
}

export async function deleteTemplate(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('templates', id);
}

// ── Meta (settings / migration state) ──────────────────────────────

export async function getMeta(key: string): Promise<unknown> {
  const db = await getDB();
  const entry = await db.get('meta', key);
  return entry?.value;
}

export async function setMeta(key: string, value: unknown): Promise<void> {
  const db = await getDB();
  await db.put('meta', { key, value });
}

// ── Bulk operations ─────────────────────────────────────────────────

export async function clearAll(): Promise<void> {
  const db = await getDB();
  await db.clear('notes');
  await db.clear('templates');
  await db.clear('meta');
}

export async function importNotes(notes: Note[]): Promise<number> {
  const db = await getDB();
  const tx = db.transaction('notes', 'readwrite');
  let count = 0;
  for (const note of notes) {
    await tx.store.put(note);
    count++;
  }
  await tx.done;
  return count;
}

// ── Markdown export / import (browser-friendly) ─────────────────────

/**
 * Export all active notes as individual markdown files.
 * In a browser, triggers a download. On Electron, writes to the given path.
 */
export async function exportToMarkdownBrowser(): Promise<Blob> {
  const notes = await getAllNotes();
  const active = notes.filter((n) => !n.isTrashed && !n.isArchived);

  // Generate a single archive blob containing all notes
  let md = '# LifeOS Keep Export\n\n';
  for (const note of active) {
    md += `---\n`;
    md += `# ${note.title}\n\n`;
    md += `**Type:** ${note.type}  \n`;
    md += `**Color:** ${note.color}  \n`;
    md += `**Labels:** ${note.labels.join(', ') || '(none)'}  \n`;
    md += `**Created:** ${note.createdAt}  \n`;
    md += `**Updated:** ${note.updatedAt}  \n\n`;
    if (note.content) md += `${note.content}\n\n`;
    if (note.items && note.items.length > 0) {
      md += `## Checklist\n\n`;
      for (const item of note.items) {
        md += `- [${item.checked ? 'x' : ' '}] ${item.text}\n`;
      }
      md += '\n';
    }
    md += '\n';
  }

  return new Blob([md], { type: 'text/markdown' });
}

/**
 * Import notes from a markdown file (browser: parse uploaded file).
 * Returns the count of notes imported.
 */
export async function importFromMarkdownText(
  text: string,
  defaultType: string = 'text'
): Promise<number> {
  const notes: Note[] = [];
  const sections = text.split(/^---\s*$/m).filter(Boolean);

  for (const section of sections) {
    const lines = section.trim().split('\n');
    const title = lines[0]?.replace(/^#\s+/, '').trim() || 'Imported Note';
    // Everything after the header lines is the body
    const body = lines.slice(1).join('\n').trim();
    if (!body && !title) continue;

    notes.push({
      id: crypto.randomUUID(),
      title,
      content: body,
      items: [],
      type: defaultType as any,
      color: 'white',
      labels: [],
      isPinned: false,
      isArchived: false,
      isTrashed: false,
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  if (notes.length > 0) {
    await importNotes(notes);
  }
  return notes.length;
}
