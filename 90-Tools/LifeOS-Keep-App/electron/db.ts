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

export interface Note {
  id: string;
  title: string;
  content: string;
  items: NoteItem[];
  type: 'text' | 'checklist';
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
}

export interface NoteTemplate {
  id: string;
  name: string;
  title: string;
  content: string;
  items: NoteItem[];
  type: 'text' | 'checklist';
  color: NoteColor;
  labels: string[];
  createdAt: string;
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

const DATA_DIR = path.join(app.getPath('userData'), 'lifeos-keep');
const NOTES_FILE = path.join(DATA_DIR, 'notes.json');
const TEMPLATES_FILE = path.join(DATA_DIR, 'templates.json');

export class NoteStore {
  private notes: Note[] = [];
  private templates: NoteTemplate[] = [];

  constructor() {
    this.init();
  }

  private async init() {
    await fs.mkdir(DATA_DIR, { recursive: true });
    try {
      const data = await fs.readFile(NOTES_FILE, 'utf-8');
      this.notes = JSON.parse(data);
    } catch {
      this.notes = [];
    }
    try {
      const data = await fs.readFile(TEMPLATES_FILE, 'utf-8');
      this.templates = JSON.parse(data);
    } catch {
      this.templates = [];
    }
  }

  private async save() {
    await fs.writeFile(NOTES_FILE, JSON.stringify(this.notes, null, 2));
  }

  private async saveTemplates() {
    await fs.writeFile(TEMPLATES_FILE, JSON.stringify(this.templates, null, 2));
  }

  getAll(): Note[] {
    return this.notes.filter(n => !n.isTrashed).sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }

  get(id: string): Note | undefined {
    return this.notes.find(n => n.id === id);
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
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      templateId: note.templateId,
    };
    this.notes.push(newNote);
    this.save();
    return newNote;
  }

  update(note: Note): Note {
    const idx = this.notes.findIndex(n => n.id === note.id);
    if (idx !== -1) {
      this.notes[idx] = { ...note, updatedAt: new Date().toISOString() };
      this.save();
    }
    return this.notes[idx];
  }

  delete(id: string): void {
    this.notes = this.notes.filter(n => n.id !== id);
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

  async exportToMarkdown(targetDir: string): Promise<void> {
    await fs.mkdir(targetDir, { recursive: true });
    const activeNotes = this.notes.filter(n => !n.isTrashed);
    for (const note of activeNotes) {
      const safeTitle = note.title.replace(/[<>|:"/\\?*]/g, '').slice(0, 80) || 'untitled';
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
      if (note.reminder) md += `reminder: ${note.reminder}\n`;
      md += `---\n\n`;
      md += `# ${note.title}\n\n`;
      if (note.type === 'checklist') {
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
        md += note.content;
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
    const type = (fm.type as any) || 'text';
    let noteContent = bodyContent;

    if (type === 'checklist') {
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
          // Find parent
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
    };
  }
}
