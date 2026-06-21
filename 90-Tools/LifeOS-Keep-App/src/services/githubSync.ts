/**
 * githubSync.ts — Browser-based GitHub sync via REST API
 *
 * Commits LifeOS Keep notes to the personal_docs repository
 * using the GitHub REST API directly (no local git CLI needed).
 * Works in any browser, Electron, or Capacitor.
 *
 * Requires a GitHub Personal Access Token (PAT) with `repo` scope.
 */

import { Octokit } from '@octokit/rest';
import type { Note } from '../types/note';
import * as storage from '../store/storage';

const OWNER = 'Gestalt360';
const REPO = 'personal_docs';
const NOTES_PATH = '90-Tools/LifeOS-Keep-App/data';
const BRANCH = 'main';

/**
 * Convert a Note to a Markdown string for storage on GitHub.
 */
function noteToMarkdown(note: Note): string {
  const frontmatter = [
    '---',
    `id: ${note.id}`,
    `type: ${note.type}`,
    `color: ${note.color}`,
    `created: ${note.createdAt}`,
    `updated: ${note.updatedAt}`,
    `status: ${note.status}`,
    note.labels.length > 0 ? `labels: [${note.labels.join(', ')}]` : '',
    note.isPinned ? 'pinned: true' : '',
    note.parentId ? `parent: ${note.parentId}` : '',
    '---',
    '',
  ].filter(Boolean).join('\n');

  let body = `# ${note.title}\n\n`;
  if (note.content) body += `${note.content}\n\n`;

  if (note.items && note.items.length > 0) {
    body += '## Checklist\n\n';
    for (const item of note.items) {
      body += `- [${item.checked ? 'x' : ' '}] ${item.text}\n`;
    }
    body += '\n';
  }

  return frontmatter + body;
}

/**
 * GitHub Sync Service — manages authentication and sync operations.
 */
export class GitHubSyncService {
  private octokit: Octokit | null = null;
  private _token: string = '';

  /** Check if a token has been configured */
  get isAuthenticated(): boolean {
    return this.octokit !== null;
  }

  /** Get the stored token (masked for display) */
  get tokenPreview(): string {
    if (!this._token) return '';
    if (this._token.length <= 8) return '••••••••';
    return this._token.slice(0, 4) + '••••' + this._token.slice(-4);
  }

  /** Configure with a GitHub PAT. Returns true if the token is valid. */
  async setToken(token: string): Promise<boolean> {
    this._token = token;
    if (!token || token.length < 10) {
      this.octokit = null;
      return false;
    }

    this.octokit = new Octokit({ auth: token });

    // Verify the token by making a lightweight API call
    try {
      const { data: user } = await this.octokit.rest.users.getAuthenticated();
      console.log(`[GitHubSync] Authenticated as ${user.login}`);
      localStorage.setItem('github_pat', token);
      return true;
    } catch (err) {
      console.error('[GitHubSync] Token validation failed:', err);
      this.octokit = null;
      this._token = '';
      localStorage.removeItem('github_pat');
      return false;
    }
  }

  /** Load a previously stored token from localStorage */
  async loadToken(): Promise<boolean> {
    const stored = localStorage.getItem('github_pat');
    if (stored) {
      return this.setToken(stored);
    }
    return false;
  }

  /** Clear the stored token */
  clearToken(): void {
    this._token = '';
    this.octokit = null;
    localStorage.removeItem('github_pat');
  }

  /** Sync all active notes to GitHub as markdown files */
  async syncNotes(notes?: Note[]): Promise<{ success: boolean; message: string }> {
    if (!this.octokit) {
      return { success: false, message: 'Not authenticated. Set a GitHub PAT first.' };
    }

    try {
      const allNotes = notes || await storage.getAllNotes();
      const active = allNotes.filter(n => !n.isTrashed);

      // Get the latest commit SHA on the target branch
      let refSha: string;
      try {
        const { data: ref } = await this.octokit.rest.git.getRef({
          owner: OWNER,
          repo: REPO,
          ref: `heads/${BRANCH}`,
        });
        refSha = ref.object.sha;
      } catch {
        return { success: false, message: `Branch '${BRANCH}' not found in ${OWNER}/${REPO}.` };
      }

      // Get the tree of the latest commit so we can base our new tree on it
      const { data: commit } = await this.octokit.rest.git.getCommit({
        owner: OWNER,
        repo: REPO,
        commit_sha: refSha,
      });

      // Build a new tree with updated note files
      const treeEntries: { path: string; mode: '100644'; type: 'blob'; content: string }[] = [];

      for (const note of active) {
        const filePath = `${NOTES_PATH}/${note.id}.md`;
        const content = noteToMarkdown(note);
        treeEntries.push({
          path: filePath,
          mode: '100644',
          type: 'blob',
          content,
        });
      }

      // Create a tree
      const { data: tree } = await this.octokit.rest.git.createTree({
        owner: OWNER,
        repo: REPO,
        base_tree: commit.tree.sha,
        tree: treeEntries,
      });

      // Create a commit
      const dateStr = new Date().toISOString().replace('T', ' ').slice(0, 19);
      const { data: newCommit } = await this.octokit.rest.git.createCommit({
        owner: OWNER,
        repo: REPO,
        message: `LifeOS Keep sync ${dateStr}`,
        tree: tree.sha,
        parents: [refSha],
        author: {
          name: 'LifeOS Keep',
          email: 'lifeos@sipho.dev',
          date: new Date().toISOString(),
        },
      });

      // Update the branch reference
      await this.octokit.rest.git.updateRef({
        owner: OWNER,
        repo: REPO,
        ref: `heads/${BRANCH}`,
        sha: newCommit.sha,
      });

      return {
        success: true,
        message: `Synced ${treeEntries.length} note(s) to ${OWNER}/${REPO}`,
      };
    } catch (err: any) {
      console.error('[GitHubSync] Sync failed:', err);
      return {
        success: false,
        message: err.message || 'GitHub sync failed',
      };
    }
  }

  /** Pull the latest note data from GitHub (parse markdown files from repo) */
  async pullNotes(): Promise<{ success: boolean; notes?: Partial<Note>[]; message: string }> {
    if (!this.octokit) {
      return { success: false, message: 'Not authenticated.', notes: [] };
    }

    try {
      // Get the repo contents at the notes path
      const { data } = await this.octokit.rest.repos.getContent({
        owner: OWNER,
        repo: REPO,
        path: NOTES_PATH,
      });

      if (!Array.isArray(data)) {
        return { success: false, message: 'No notes directory found.', notes: [] };
      }

      const mdFiles = data.filter((item: any) => item.name.endsWith('.md'));
      const notes: Partial<Note>[] = [];

      for (const file of mdFiles) {
        const { data: fileData } = await this.octokit.rest.repos.getContent({
          owner: OWNER,
          repo: REPO,
          path: file.path,
        });

        if ('content' in fileData) {
          const content = Buffer.from(fileData.content, 'base64').toString('utf-8');
          // Parse frontmatter and body
          const parsed = parseNoteMarkdown(content, file.name.replace('.md', ''));
          if (parsed) notes.push(parsed);
        }
      }

      return {
        success: true,
        notes,
        message: `Pulled ${notes.length} note(s) from GitHub`,
      };
    } catch (err: any) {
      console.error('[GitHubSync] Pull failed:', err);
      return {
        success: false,
        message: err.message || 'GitHub pull failed',
        notes: [],
      };
    }
  }
}

/**
 * Parse a markdown note file back into a Note object.
 */
function parseNoteMarkdown(md: string, noteId?: string): Partial<Note> | null {
  try {
    const note: Partial<Note> = {
      id: noteId || crypto.randomUUID(),
      labels: [],
      items: [],
      status: 'pending',
    };

    // Parse frontmatter (between --- markers)
    const fmMatch = md.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
    if (fmMatch) {
      const fm = fmMatch[1];
      const body = fmMatch[2];

      // Parse each frontmatter line
      for (const line of fm.split('\n')) {
        const [key, ...vals] = line.split(':');
        const value = vals.join(':').trim();
        switch (key.trim()) {
          case 'id': note.id = value; break;
          case 'type': note.type = value as any; break;
          case 'color': note.color = value as any; break;
          case 'created': note.createdAt = value; break;
          case 'updated': note.updatedAt = value; break;
          case 'status': note.status = value as any; break;
          case 'pinned': note.isPinned = value === 'true'; break;
          case 'parent': note.parentId = value; break;
          case 'labels':
            note.labels = value
              .replace(/[\[\]]/g, '')
              .split(',')
              .map((l: string) => l.trim())
              .filter(Boolean);
            break;
        }
      }

      // Parse body — first line is title (# ...)
      const bodyLines = body.trim().split('\n');
      if (bodyLines[0]?.startsWith('# ')) {
        note.title = bodyLines[0].slice(2).trim();
      }

      // The rest is content (until "## Checklist" if present)
      const checklistIdx = bodyLines.findIndex(l => l === '## Checklist');
      if (checklistIdx >= 0) {
        note.content = bodyLines.slice(1, checklistIdx).join('\n').trim();
        // Parse checklist items
        const items = bodyLines.slice(checklistIdx + 2)
          .filter(l => l.startsWith('- [') || l.startsWith('  '))
          .map(l => {
            const checked = l.includes('[x]');
            const text = l.replace(/^- \[[ x]\]\s*/, '').trim();
            return text ? { id: crypto.randomUUID(), text, checked } : null;
          })
          .filter(Boolean) as any;
        note.items = items;
      } else {
        note.content = bodyLines.slice(1).join('\n').trim();
      }
    }

    return note;
  } catch {
    return null;
  }
}

// Singleton for app-wide use
export const githubSync = new GitHubSyncService();
