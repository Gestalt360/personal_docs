import { app, BrowserWindow, ipcMain, dialog, Tray, Menu, globalShortcut, nativeImage, Notification } from 'electron';
import path from 'path';
import { spawn } from 'child_process';
import { NoteStore } from './db';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isDev = !app.isPackaged;

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
const store = new NoteStore();

// Resolve GWS path relative to personal_docs root
const GWS_BIN = (() => {
  const candidates = [
    path.resolve(process.cwd(), '..', '..', '.tools', 'gws.exe'),
    path.resolve(app.getPath('userData'), '..', '..', '..', '..', '.tools', 'gws.exe'),
    path.join(app.getPath('userData'), 'gws.exe'), // bundled in production
    'gws.exe', // PATH
  ];
  for (const c of candidates) {
    try {
      if (fs.existsSync(c)) return c;
    } catch { /* ignore */ }
  }
  return 'gws.exe'; // fallback to PATH
})();

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    show: false,
    icon: path.join(__dirname, '..', 'assets', 'icon.png'),
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  mainWindow.on('close', (e) => {
    if (tray) {
      e.preventDefault();
      mainWindow?.hide();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createTray() {
  if (tray) return;
  // Create a simple 16x16 tray icon
  const icon = nativeImage.createFromBuffer(
    Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAAMlJREFUOE+l0rENwjAQBdD/V4yAWIAJYAQKOkZgBEZgBEZgBDoWYARGYAMK4kiWLNn5nARSJPv9f9eW5Zci+iVifpOyEEBjRM/3yLkHMBVxD8DdIgGlFImYAQwA5pF1KeUCYAMA+PP3UkrrQfM8Q0RfIj4AjAHMB9RSyg3AoaW2OWPMHMAOwLa1b845KaVMRDyJ+ADQA1haaz8AH8/zvokYI4Su6/ZSShPRB4B+KeUIYAfg1lL78jzv/0/gn4FaawfgXEp5AjgA+L5aKf0BwMDY4gMUFUgAAAAASUVORK5CYII=',
      'base64'
    )
  );

  tray = new Tray(icon.resize({ width: 16, height: 16 }));
  tray.setToolTip('LifeOS Keep');

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Open LifeOS Keep',
      click: () => {
        mainWindow?.show();
        mainWindow?.focus();
      },
    },
    { type: 'separator' },
    {
      label: 'Quick Note',
      accelerator: 'CmdOrCtrl+Shift+N',
      click: () => {
        mainWindow?.show();
        mainWindow?.webContents.send('create-quick-note');
      },
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        tray?.destroy();
        tray = null;
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);

  tray.on('double-click', () => {
    mainWindow?.show();
    mainWindow?.focus();
  });
}

function registerGlobalShortcuts() {
  globalShortcut.register('CmdOrCtrl+Shift+N', () => {
    mainWindow?.show();
    mainWindow?.focus();
    mainWindow?.webContents.send('create-quick-note');
  });
}

app.whenReady().then(() => {
  createWindow();
  createTray();
  registerGlobalShortcuts();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
    else {
      mainWindow?.show();
      mainWindow?.focus();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin' && !tray) app.quit();
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

// ── Google Tasks helper ──
function gwsTasks(method: string, args: string[] = []): Promise<any> {
  return new Promise((resolve, reject) => {
    // First get the default task list, then operate on tasks within it
    const proc = spawn(GWS_BIN, ['tasks', 'tasks', method, ...args], {
      cwd: path.dirname(GWS_BIN),
      shell: true,
    });
    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', (d) => (stdout += d.toString()));
    proc.stderr.on('data', (d) => (stderr += d.toString()));
    proc.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(stderr || `gws tasks exited ${code}`));
      } else {
        try {
          resolve(JSON.parse(stdout));
        } catch {
          resolve(stdout.trim());
        }
      }
    });
  });
}

// Get default task list ID
async function getDefaultTaskListId(): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn(GWS_BIN, ['tasks', 'tasklists', 'list', '--params', JSON.stringify({ maxResults: 1 })], {
      cwd: path.dirname(GWS_BIN),
      shell: true,
    });
    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', (d) => (stdout += d.toString()));
    proc.stderr.on('data', (d) => (stderr += d.toString()));
    proc.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(stderr || 'Failed to get task list'));
      } else {
        try {
          const parsed = JSON.parse(stdout);
          const items = parsed.items || parsed;
          if (Array.isArray(items) && items.length > 0) {
            resolve(items[0].id);
          } else {
            // Create default list
            resolve('@default');
          }
        } catch {
          reject(new Error('Failed to parse task lists'));
        }
      }
    });
  });
}

// ── IPC handlers — Notes ──
ipcMain.handle('note:getAll', () => store.getAll());
ipcMain.handle('note:get', (_, id: string) => store.get(id));
ipcMain.handle('note:create', (_, note) => store.create(note));
ipcMain.handle('note:update', (_, note) => store.update(note));
ipcMain.handle('note:delete', (_, id: string) => store.delete(id));
ipcMain.handle('note:archive', (_, id: string) => store.archive(id));
ipcMain.handle('note:unarchive', (_, id: string) => store.unarchive(id));
ipcMain.handle('note:trash', (_, id: string) => store.trash(id));
ipcMain.handle('note:restore', (_, id: string) => store.restore(id));
ipcMain.handle('note:pin', (_, id: string) => store.togglePin(id));
ipcMain.handle('note:search', (_, query: string) => store.search(query));
ipcMain.handle('note:getByLabel', (_, label: string) => store.getByLabel(label));
ipcMain.handle('note:getByColor', (_, color: string) => store.getByColor(color));
ipcMain.handle('note:getLabels', () => store.getAllLabels());
ipcMain.handle('note:getReminders', () => store.getReminders());
ipcMain.handle('note:saveTemplate', (_, template) => store.saveTemplate(template));
ipcMain.handle('note:getTemplates', () => store.getTemplates());
ipcMain.handle('note:deleteTemplate', (_, id: string) => store.deleteTemplate(id));

// ── IPC handlers — Sync (Markdown) ──
ipcMain.handle('sync:exportToMarkdown', async (_, targetPath: string) => {
  try {
    await store.exportToMarkdown(targetPath);
    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('sync:importFromMarkdown', async (_, sourcePath: string) => {
  try {
    const imported = await store.importFromMarkdown(sourcePath);
    return { success: true, imported };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

// IPC handlers — Google Tasks (Reminders)
ipcMain.handle('tasks:create', async (_, { title, due, notes }: { title: string; due?: string; notes?: string }) => {
  try {
    const tasklistId = await getDefaultTaskListId();
    const jsonBody: any = { title };
    if (due) jsonBody.due = due;
    if (notes) jsonBody.notes = notes;
    const result = await gwsTasks('insert', ['--params', JSON.stringify({ tasklist: tasklistId }), '--json', JSON.stringify(jsonBody)]);
    return { success: true, task: result };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('tasks:list', async () => {
  try {
    const tasklistId = await getDefaultTaskListId();
    const result = await gwsTasks('list', ['--params', JSON.stringify({ tasklist: tasklistId, maxResults: 100 })]);
    return { success: true, tasks: result.items || result };
  } catch (error) {
    return { success: true, tasks: [] };
  }
});

ipcMain.handle('tasks:delete', async (_, taskId: string) => {
  try {
    const tasklistId = await getDefaultTaskListId();
    await gwsTasks('delete', ['--params', JSON.stringify({ tasklist: tasklistId, task: taskId })]);
    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('tasks:update', async (_, { taskId, updates }: { taskId: string; updates: any }) => {
  try {
    const tasklistId = await getDefaultTaskListId();
    const result = await gwsTasks('update', ['--params', JSON.stringify({ tasklist: tasklistId, task: taskId }), '--json', JSON.stringify(updates)]);
    return { success: true, task: result };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('tasks:checkAuth', async () => {
  try {
    await getDefaultTaskListId();
    return { authenticated: true };
  } catch {
    return { authenticated: false };
  }
});

// ── IPC handlers — Dialog & App ──
// ── IPC handlers — Dialog & App ──
ipcMain.handle('dialog:selectFolder', async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ['openDirectory'],
  });
  return result.filePaths[0] || null;
});

ipcMain.handle('app:getPath', (_, name: string) => {
  return app.getPath(name as any);
});

ipcMain.handle('app:getVersion', () => {
  return app.getVersion();
});

// GitHub Sync
ipcMain.handle('git:sync', async () => {
  try {
    const { spawn } = require('child_process');
    const path = require('path');
    
    const scriptPath = path.join(__dirname, '..', '..', 'git-sync.mjs');
    const repoUrl = 'https://github.com/Gestalt360/lifeos-keep-notes.git';
    // Clone into personal_docs/GitHub-Keep-Notes (inside the personal_docs folder)
    const clonePath = path.join(__dirname, '..', '..', 'GitHub-Keep-Notes');
    
    return new Promise((resolve) => {
      const proc = spawn('node', [scriptPath, repoUrl, clonePath], {
        cwd: path.join(__dirname, '..', '..'),
        env: { ...process.env }
      });
      
      let stdout = '';
      let stderr = '';
      proc.stdout.on('data', (data) => { stdout += data.toString(); });
      proc.stderr.on('data', (data) => { stderr += data.toString(); });
      
      proc.on('close', (code) => {
        if (code !== 0) {
          resolve({ success: false, error: stderr || `Git sync failed with code ${code}` });
        } else {
          resolve({ success: true, message: stdout });
        }
      });
    });
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});
