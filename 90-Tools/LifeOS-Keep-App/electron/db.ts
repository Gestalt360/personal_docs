import { app } from 'electron';
import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

export interface NoteItem {
  id: string;
  text: string;
  checked: boolean;
  parentId?: string | null;
  children?: NoteItem[];
  collapsed?: boolean;
  depth?: number;
}

export type NoteType =
  | 'text' | 'checklist' | 'task' | 'habit'
  | 'vision' | '3-5-year-goal' | 'annual-goal'
  | 'quarterly-goal' | 'monthly-goal' | 'weekly-goal'
  | 'daily-goal' | 'project';

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'not_done';
export type CompletionRating = 'none' | 'orange' | 'yellow' | 'lightgreen' | 'darkgreen';

export interface Note {
  id: string;
  title: string;
  content: string;
  items: NoteItem[];
  type: NoteType;
  color: NoteColor;
  labels: string[];
  isPinned: boolean;
  isArchived: boolean;
  isTrashed: boolean;
  reminder?: string;
  taskId?: string;
  createdAt: string;
  updatedAt: string;
  templateId?: string;
  parentId?: string | null;
  dependOn?: string[];
  progress?: number;
  status: TaskStatus;
  completedRating?: CompletionRating;
  startDate?: string;
  dueDate?: string;
  completedAt?: string;
  recurrence?: { rule: string; until?: string };
  streak?: number;
  bestStreak?: number;
  rollupProgress?: number;
}

export interface NoteTemplate {
  id: string;
  name: string;
  title: string;
  content: string;
  items: NoteItem[];
  type: NoteType;
  color: NoteColor;
  labels: string[];
  createdAt: string;
  parentId?: string;
  dependOn?: string[];
  progress?: number;
  status: TaskStatus;
  completedRating?: CompletionRating;
  startDate?: string;
  dueDate?: string;
  recurrence?: { rule: string; until?: string };
}

export type NoteColor =
  | 'white' | 'red' | 'orange' | 'yellow' | 'green' | 'teal'
  | 'blue' | 'darkblue' | 'purple' | 'pink' | 'brown' | 'gray';

export const COLOR_MAP: Record<NoteColor, string> = {
  white: '#ffffff',
  red: '#f28b82',
  orange: '#fbbc04',
  yellow: '#fff475',
  green: '#ccff90',
  teal: '#a7ffeb',
  blue: '#cbf0f8',
  darkblue: '#aecbfa',
  purple: '#d7aefb',
  pink: '#fdcfe8',
  brown: '#e6c9a8',
  gray: '#e8eaed',
};

const SYNC_DIR = path.join(app.getPath('userData'), '..', '..', '..', '..', 'source', 'personal_docs');
const NOTES_FILE = path.join(SYNC_DIR, 'lifeos-keep-notes.json');

export class NoteStore {
  private notes: Note[] = [];
  private templates: NoteTemplate[] = [];

  constructor() {
    this.init();
  }

  private async init() {
    await fs.mkdir(SYNC_DIR, { recursive: true });
    try {
      const data = await fs.readFile(NOTES_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      this.notes = parsed.notes || [];
      this.templates = parsed.templates || [];
    } catch {
      // Seed defaults if starting fresh
      this.notes = [];
      this.templates = [];
    }
  }

  private getDefaultStatus(type: NoteType): TaskStatus {
    return ['habit', 'task'].includes(type) ? 'pending' : 'pending';
  }

  private async save() {
    await fs.mkdir(SYNC_DIR, { recursive: true });
    await fs.writeFile(NOTES_FILE, JSON.stringify({ notes: this.notes, templates: this.templates }, null, 2));
  }

  // ── Recursive Progress Roll-Up ──
  private computeRollup(noteId: string): number {
    const note = this.notes.find(n => n.id === noteId);
    if (!note) return 0;

    // Checklist-based progress
    if (note.items && note.items.length > 0) {
      const checked = note.items.filter(i => i.checked).length;
      return Math.round((checked / note.items.length) * 100);
    }

    // Manual progress if set
    if (note.progress !== undefined) return note.progress;
    if (note.status === 'completed') return 100;
    if (note.status === 'not_done') return 0;

    // Recursive: average of children
    const children = this.notes.filter(n => n.parentId === noteId && !n.isTrashed);
    if (children.length === 0) return 0;

    const total = children.reduce((sum, child) => sum + this.computeRollup(child.id), 0);
    return Math.round(total / children.length);
  }

  private updateAllRollups() {
    for (const note of this.notes) {
      note.rollupProgress = this.computeRollup(note.id);
    }
  }

  // ── Check dependencies ──
  private areDependenciesMet(noteId: string): boolean {
    const note = this.notes.find(n => n.id === noteId);
    if (!note?.dependOn || note.dependOn.length === 0) return true;
    return note.dependOn.every(depId => {
      const dep = this.notes.find(n => n.id === depId);
      return dep?.status === 'completed';
    });
  }

  // ── Public API ──

  getAll(): Note[] {
    this.updateAllRollups();
    return this.notes.filter(n => !n.isTrashed).sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }

  get(id: string): Note | undefined {
    const note = this.notes.find(n => n.id === id);
    if (note) note.rollupProgress = this.computeRollup(note.id);
    return note;
  }

  create(note: Partial<Note>): Note {
    const newNote: Note = {
      id: uuidv4(),
      title: note.title || '',
      content: note.content || '',
      items: note.items || [],
      type: note.type || 'text',
      color: note.color || 'white',
      labels: note.labels || [],
      isPinned: note.isPinned || false,
      isArchived: false,
      isTrashed: false,
      reminder: note.reminder,
      taskId: note.taskId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      templateId: note.templateId,
      parentId: note.parentId || null,
      dependOn: note.dependOn || [],
      progress: note.progress,
      status: note.status || this.getDefaultStatus(note.type || 'text'),
      completedRating: note.completedRating,
      startDate: note.startDate,
      dueDate: note.dueDate,
      completedAt: note.completedAt,
      recurrence: note.recurrence,
      streak: note.streak || 0,
      bestStreak: note.bestStreak || 0,
    };
    this.notes.push(newNote);
    this.save();
    return newNote;
  }

  update(note: Note): Note {
    const idx = this.notes.findIndex(n => n.id === note.id);
    if (idx !== -1) {
      const updated = { ...note, updatedAt: new Date().toISOString() };
      this.notes[idx] = updated;
      this.updateAllRollups();
      this.save();
    }
    return this.notes[idx];
  }

  delete(id: string): void {
    // Also remove from parent's dependOn
    this.notes.forEach(n => {
      if (n.dependOn?.includes(id)) {
        n.dependOn = n.dependOn.filter(d => d !== id);
      }
    });
    this.notes = this.notes.filter(n => n.id !== id && n.parentId !== id);
    this.save();
  }

  archive(id: string): Note {
    const note = this.notes.find(n => n.id === id);
    if (note) {
      note.isArchived = true;
      note.isPinned = false;
      note.updatedAt = new Date().toISOString();
      this.save();
    }
    return note!;
  }

  unarchive(id: string): Note {
    const note = this.notes.find(n => n.id === id);
    if (note) {
      note.isArchived = false;
      note.updatedAt = new Date().toISOString();
      this.save();
    }
    return note!;
  }

  trash(id: string): Note {
    const note = this.notes.find(n => n.id === id);
    if (note) {
      note.isTrashed = true;
      note.isPinned = false;
      note.isArchived = false;
      note.updatedAt = new Date().toISOString();
      this.save();
    }
    return note!;
  }

  restore(id: string): Note {
    const note = this.notes.find(n => n.id === id);
    if (note) {
      note.isTrashed = false;
      note.updatedAt = new Date().toISOString();
      this.save();
    }
    return note!;
  }

  togglePin(id: string): Note {
    const note = this.notes.find(n => n.id === id);
    if (note) {
      note.isPinned = !note.isPinned;
      note.updatedAt = new Date().toISOString();
      this.save();
    }
    return note!;
  }

  getReminders(): Note[] {
    return this.notes.filter(n => n.reminder && !n.isTrashed && !n.isArchived)
      .sort((a, b) => new Date(a.reminder!).getTime() - new Date(b.reminder!).getTime());
  }

  search(query: string): Note[] {
    const q = query.toLowerCase();
    return this.getAll().filter(n =>
      n.title.toLowerCase().includes(q) ||
      n.content.toLowerCase().includes(q) ||
      n.items.some(i => i.text.toLowerCase().includes(q)) ||
      n.labels.some(l => l.toLowerCase().includes(q))
    );
  }

  getByLabel(label: string): Note[] {
    return this.getAll().filter(n => n.labels.includes(label));
  }

  getByColor(color: string): Note[] {
    return this.getAll().filter(n => n.color === color);
  }

  getAllLabels(): string[] {
    const labels = new Set<string>();
    this.notes.forEach(n => n.labels.forEach(l => labels.add(l)));
    return Array.from(labels).sort();
  }

  getTrashed(): Note[] {
    return this.notes.filter(n => n.isTrashed).sort((a, b) =>
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }

  getArchived(): Note[] {
    return this.notes.filter(n => n.isArchived && !n.isTrashed).sort((a, b) =>
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }

  // ── Hierarchy helpers ──
  getChildren(id: string): Note[] {
    return this.notes.filter(n => n.parentId === id && !n.isTrashed);
  }

  getDescendants(id: string): Note[] {
    const result: Note[] = [];
    const children = this.getChildren(id);
    for (const child of children) {
      result.push(child);
      result.push(...this.getDescendants(child.id));
    }
    return result;
  }

  getAncestors(id: string): Note[] {
    const result: Note[] = [];
    let current = this.notes.find(n => n.id === id);
    while (current?.parentId) {
      const parent = this.notes.find(n => n.id === current!.parentId);
      if (parent) {
        result.push(parent);
        current = parent;
      } else break;
    }
    return result;
  }

  // ── Templates ──
  saveTemplate(template: Partial<NoteTemplate>): NoteTemplate {
    const newTemplate: NoteTemplate = {
      id: uuidv4(),
      name: template.name || 'Untitled Template',
      title: template.title || '',
      content: template.content || '',
      items: template.items || [],
      type: template.type || 'text',
      color: template.color || 'white',
      labels: template.labels || [],
      createdAt: new Date().toISOString(),
      parentId: template.parentId,
      dependOn: template.dependOn,
      progress: template.progress,
      status: template.status || 'pending',
      completedRating: template.completedRating,
      startDate: template.startDate,
      dueDate: template.dueDate,
      recurrence: template.recurrence,
    };
    this.templates.push(newTemplate);
    this.saveTemplates();
    return newTemplate;
  }

  getTemplates(): NoteTemplate[] {
    return this.templates;
  }

  deleteTemplate(id: string): void {
    this.templates = this.templates.filter(t => t.id !== id);
    this.saveTemplates();
  }

  private async saveTemplates() {
    await this.save(); // Combined storage now
  }

  // ── Markdown Export/Import ──
  async exportToMarkdown(targetDir: string): Promise<void> {
    await fs.mkdir(targetDir, { recursive: true });
    const activeNotes = this.notes.filter(n => !n.isTrashed);
    for (const note of activeNotes) {
      const safeTitle = note.title.replace(/[<>|:\"/\\\\?*]/g, '').slice(0, 80) || 'untitled';
      const filename = `${safeTitle}_${note.id.slice(0, 8)}.md`;
      const filepath = path.join(targetDir, filename);

      let md = `---\n`;
      md += `keep_id: ${note.id}\n`;
      md += `type: ${note.type}\n`;
      md += `color: ${note.color}\n`;
      md += `labels: ${JSON.stringify(note.labels)}\n`;
      md += `pinned: ${note.isPinned}\n`;
      md += `archived: ${note.isArchived}\n`;
      md += `created: ${note.createdAt}\n`;
      md += `updated: ${note.updatedAt}\n`;
      md += `status: ${note.status}\n`;
      if (note.parentId) md += `parent_id: ${note.parentId}\n`;
      if (note.dependOn?.length) md += `depends_on: ${JSON.stringify(note.dependOn)}\n`;
      if (note.progress !== undefined) md += `progress: ${note.progress}\n`;
      if (note.completedRating) md += `completed_rating: ${note.completedRating}\n`;
      if (note.startDate) md += `start_date: ${note.startDate}\n`;
      if (note.dueDate) md += `due_date: ${note.dueDate}\n`;
      if (note.completedAt) md += `completed_at: ${note.completedAt}\n`;
      if (note.reminder) md += `reminder: ${note.reminder}\n`;
      if (note.recurrence) md += `recurrence: ${JSON.stringify(note.recurrence)}\n`;
      if (note.streak) md += `streak: ${note.streak}\n`;
      if (note.bestStreak) md += `best_streak: ${note.bestStreak}\n`;
      if (note.rollupProgress !== undefined) md += `rollup_progress: ${note.rollupProgress}\n`;
      md += `---\n\n`;

      md += `# ${note.title}\n\n`;
      if (note.type === 'checklist' || note.items.length > 0) {
        const writeItems = (items: NoteItem[], depth = 0) => {
          for (const item of items) {
            const indent = '  '.repeat(depth);
            md += `${indent}- [${item.checked ? 'x' : ' '}] ${item.text}\n`;
            if (item.children && item.children.length > 0) {
              writeItems(item.children, depth + 1);
            }
          }
        };
        writeItems(note.items);
      } else {
        md += note.content || '';
      }
      md += '\n';
      await fs.writeFile(filepath, md, 'utf-8');
    }
  }

  async importFromMarkdown(sourceDir: string): Promise<number> {
    const files = await fs.readdir(sourceDir);
    let imported = 0;
    for (const file of files) {
      if (!file.endsWith('.md')) continue;
      const filepath = path.join(sourceDir, file);
      const content = await fs.readFile(filepath, 'utf-8');
      const note = this.parseMarkdown(content, filepath);
      if (note) {
        const existing = this.notes.find(n => n.id === note.id);
        if (!existing) {
          this.notes.push(note);
          imported++;
        }
      }
    }
    this.save();
    return imported;
  }

  private parseMarkdown(content: string, filepath: string): Note | null {
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n\n([\s\S]*)$/);
    if (!frontmatterMatch) return null;

    const fm: Record<string, string> = {};
    frontmatterMatch[1].split('\n').forEach(line => {
      const [key, ...val] = line.split(':');
      if (key && val.length) fm[key.trim()] = val.join(':').trim();
    });

    const body = frontmatterMatch[2];
    const titleMatch = body.match(/^# (.+)\n\n?/);
    const title = titleMatch ? titleMatch[1] : '';
    const bodyContent = body.replace(/^# .+\n\n?/, '');

    const items: NoteItem[] = [];
    const type = (fm.type as NoteType) || 'text';
    let noteContent = bodyContent;

    if (type === 'checklist' || bodyContent.includes('- [ ]') || bodyContent.includes('- [x]')) {
      const lines = bodyContent.split('\n').filter(l => l.trim());
      const stack: NoteItem[] = [];
      lines.forEach(line => {
        const match = line.match(/^\s*- \[(x| )\] (.+)$/);
        if (match) {
          const indent = (line.match(/^\s*/) || [''])[0].length;
          const depth = Math.floor(indent / 2);
          const item: NoteItem = {
            id: uuidv4(),
            text: match[2],
            checked: match[1] === 'x',
            parentId: null,
            children: [],
            depth,
          };
          while (stack.length > 0 && (stack[stack.length - 1].depth || 0) >= depth) {
            stack.pop();
          }
          if (stack.length > 0) {
            const parent = stack[stack.length - 1];
            item.parentId = parent.id;
            parent.children = parent.children || [];
            parent.children.push(item);
          } else {
            items.push(item);
          }
          stack.push(item);
        }
      });
      noteContent = '';
    }

    return {
      id: fm.keep_id || uuidv4(),
      title,
      content: noteContent,
      items,
      type,
      color: (fm.color as NoteColor) || 'white',
      labels: JSON.parse(fm.labels || '[]'),
      isPinned: fm.pinned === 'true',
      isArchived: fm.archived === 'true',
      isTrashed: false,
      reminder: fm.reminder,
      createdAt: fm.created || new Date().toISOString(),
      updatedAt: fm.updated || new Date().toISOString(),
      parentId: fm.parent_id || null,
      dependOn: fm.depends_on ? JSON.parse(fm.depends_on) : [],
      progress: fm.progress ? Number(fm.progress) : undefined,
      status: (fm.status as TaskStatus) || 'pending',
      completedRating: (fm.completed_rating as CompletionRating) || undefined,
      startDate: fm.start_date,
      dueDate: fm.due_date,
      completedAt: fm.completed_at,
      recurrence: fm.recurrence ? JSON.parse(fm.recurrence) : undefined,
      streak: fm.streak ? Number(fm.streak) : 0,
      bestStreak: fm.best_streak ? Number(fm.best_streak) : 0,
    };
  }
}
