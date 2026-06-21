# LifeOS Keep — Cross-Platform Unification Plan

**Goal:** A single codebase that runs everywhere: web (online/offline), desktop (Windows/Mac/Linux), and mobile (iOS/Android), sharing all features.

---

## Architecture Vision

```
                    ┌─────────────────────────┐
                    │   Shared React App (UI) │
                    │   src/components/*       │
                    │   src/App.tsx            │
                    └──────────┬──────────────┘
                               │
          ┌────────────────────┼────────────────────┐
          │                    │                     │
          ▼                    ▼                     ▼
   ┌──────────────┐   ┌──────────────┐   ┌──────────────────┐
   │   Browser    │   │   Electron   │   │  Capacitor (mobile)│
   │   (PWA)      │   │   (Desktop)  │   │  iOS / Android    │
   │ online+offline│   │ tray+FS+git │   │  native APIs      │
   └──────────────┘   └──────────────┘   └──────────────────┘
          │                    │                     │
          └────────────────────┼────────────────────┘
                               │
                    ┌──────────▼──────────┐
                    │   Storage Layer     │
                    │   IndexedDB (idb)   │
                    │   + optional JSON   │
                    │   + optional SQLite │
                    └─────────────────────┘
```

---

## 🔴 Phase 0 — Foundation: PWA + IndexedDB (2–3 days)

The biggest single change. Makes the app work **in any browser** without requiring Electron at all.

### 0.1 Add PWA support

```bash
npm install vite-plugin-pwa
```

**`vite.config.ts` changes:**

```ts
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['assets/icon.png'],
      manifest: {
        name: 'LifeOS Keep',
        short_name: 'Keep',
        description: 'LifeOS note-taking with PARA sync',
        theme_color: '#50b478',
        background_color: '#f3f4f6',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          { src: 'assets/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'assets/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,ico,svg}'],
        runtimeCaching: [
          {
            urlPattern: /^https?:\/\/tasks\.googleapis\.com\/.*/i,
            handler: 'NetworkFirst',
            options: { cacheName: 'google-tasks' },
          },
        ],
      },
    }),
    electron([...]),  // still available for desktop builds
    renderer(),
  ],
})
```

**Generate PWA icons:**
```bash
python -c "
from PIL import Image
img = Image.open('assets/icon.png')
for size in [(192,192), (512,512)]:
    img.resize(size, Image.LANCZOS).save(f'assets/icon-{size[0]}.png')
"
```

### 0.2 Replace JSON file store with IndexedDB

This is the **core migration**. The current `NoteStore` in `electron/db.ts` uses `fs` (Electron-specific). We need a shared storage abstraction.

**Install:**
```bash
npm install idb
```

**Create `src/store/storage.ts` — storage abstraction layer:**

```ts
// src/store/storage.ts — cross-platform storage abstraction
import { openDB, IDBPDatabase } from 'idb';
import type { Note, NoteTemplate } from '../types/note';

interface KeepDB {
  notes: Note[];
  templates: NoteTemplate[];
  meta: { key: string; value: any }[];
}

let dbPromise: Promise<IDBPDatabase<KeepDB>> | null = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<KeepDB>('lifeos-keep', 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('notes')) {
          const notes = db.createObjectStore('notes', { keyPath: 'id' });
          notes.createIndex('type', 'type');
          notes.createIndex('isArchived', 'isArchived');
          notes.createIndex('isTrashed', 'isTrashed');
          notes.createIndex('parentId', 'parentId');
          notes.createIndex('labels', 'labels', { multiEntry: true });
        }
        if (!db.objectStoreNames.contains('templates')) {
          db.createObjectStore('templates', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('meta')) {
          db.createObjectStore('meta', { keyPath: 'key' });
        }
      },
    });
  }
  return dbPromise;
}

// CRUD operations
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

// ... more operations mirroring current NoteStore API
```

**Then provide platform-aware adapters via a Provider pattern:**

```tsx
// src/store/platform.ts — platform abstraction
export interface PlatformAPI {
  storage: {
    getAllNotes: () => Promise<Note[]>;
    getNote: (id: string) => Promise<Note | undefined>;
    createNote: (note: Note) => Promise<Note>;
    updateNote: (note: Note) => Promise<Note>;
    deleteNote: (id: string) => Promise<void>;
    // ... all storage ops
  };
  tasks?: {
    create: (params: any) => Promise<any>;
    list: () => Promise<any>;
    update: (id: string, updates: any) => Promise<any>;
    delete: (id: string) => Promise<any>;
  };
  sync?: {
    exportToMarkdown: (path: string) => Promise<any>;
    importFromMarkdown: (path: string) => Promise<any>;
    gitSync: () => Promise<any>;
  };
  dialog?: {
    selectFolder: () => Promise<string | null>;
  };
  app?: {
    getPath: (name: string) => Promise<string>;
    getVersion: () => Promise<string>;
  };
}

// Two implementations:

// 1. BrowserPlatform — uses IndexedDB, REST APIs
class BrowserPlatform implements PlatformAPI {
  storage = {
    getAllNotes: () => storage.getAllNotes(),
    // ...
  };
  tasks = new GoogleTasksREST();  // directly calls Google Tasks API via OAuth
  // no git sync in browser (can use GitHub REST API via octokit)
}

// 2. ElectronPlatform — wraps current electronAPI
class ElectronPlatform implements PlatformAPI {
  constructor(private api: IElectronAPI) {}
  storage = {
    getAllNotes: () => this.api.note.getAll(),
    // ...
  };
  tasks = new ElectronTasksAdapter(this.api.tasks);
  sync = {
    exportToMarkdown: (p) => this.api.sync.exportToMarkdown(p),
    importFromMarkdown: (p) => this.api.sync.importFromMarkdown(p),
    gitSync: () => this.api.app.gitSync(),
  };
}
```

**Auto-detect platform:**

```tsx
// src/store/PlatformProvider.tsx
function getPlatform(): PlatformAPI {
  if ((window as any).electronAPI) {
    return new ElectronPlatform((window as any).electronAPI);
  }
  return new BrowserPlatform();
}
```

### 0.3 Rework the store to use the abstraction

The current `noteStore.tsx` directly calls `(window as any).electronAPI`. Replace it with the PlatformProvider context:

```tsx
// Inside noteStore.tsx
const platform = usePlatform();  // from PlatformProvider

const createNote = useCallback(async (note: Partial<Note>) => {
  const created = await platform.storage.createNote({ ...defaults, ...note });
  await loadNotes();
  return created;
}, [platform, loadNotes]);
```

---

## 🟡 Phase 1 — Cloud Services Integration (3–5 days)

Replace Electron-only backends with cloud-native equivalents.

### 1.1 Google Tasks via REST (instead of gws CLI)

Current: spawns `gws.exe` child_process  
Future: direct Google Tasks REST API

```bash
npm install @googleapis/tasks
```

```ts
// src/services/googleTasks.ts
import { tasks } from '@googleapis/tasks';

const auth = new google.auth.OAuth2(
  import.meta.env.VITE_GOOGLE_CLIENT_ID,
  import.meta.env.VITE_GOOGLE_CLIENT_SECRET,
  `${window.location.origin}/oauth/callback`
);

export async function createTask(title: string, due?: string) {
  const client = await auth.getAccessToken();
  const tasksApi = tasks({ version: 'v1', auth: client });
  const listRes = await tasksApi.tasklists.list({ maxResults: 1 });
  const tasklistId = listRes.data.items?.[0]?.id || '@default';
  return tasksApi.tasks.insert({ tasklist: tasklistId, requestBody: { title, due } });
}
```

On Electron, you can still use gws CLI as a fallback. On web, OAuth popup flow.

### 1.2 GitHub sync via REST (instead of git child_process)

Current: spawns git CLI  
Future: use octokit to commit via GitHub REST API

```bash
npm install @octokit/rest
```

```ts
// src/services/githubSync.ts
import { Octokit } from '@octokit/rest';

export async function syncToGitHub(notes: Note[]) {
  const token = await getGITHUBPAT();  // from user input or env
  const octokit = new Octokit({ auth: token });
  
  // Generate markdown files from notes
  const markdownFiles = notes.map(note => ({
    path: `90-Tools/LifeOS-Keep-App/data/${note.id}.md`,
    content: `# ${note.title}\n\n${note.content}`,
  }));
  
  // Commit via GitHub API (no local git needed!)
  for (const file of markdownFiles) {
    await octokit.repos.createOrUpdateFileContents({
      owner: 'Gestalt360',
      repo: 'personal_docs',
      path: file.path,
      message: `LifeOS Keep sync ${new Date().toISOString()}`,
      content: Buffer.from(file.content).toString('base64'),
    });
  }
}
```

### 1.3 OAuth flow for web

```bash
npm install @react-oauth/google
```

```tsx
// src/components/GoogleAuth.tsx
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';

function GoogleAuth() {
  return (
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
      <GoogleLogin
        onSuccess={cred => {
          // Store credential, enable Google Tasks sync
          localStorage.setItem('google_token', cred.credential);
        }}
      />
    </GoogleOAuthProvider>
  );
}
```

---

## 🟢 Phase 2 — Mobile Support via Capacitor (3–4 days)

```bash
npm install @capacitor/core @capacitor/cli @capacitor/android @capacitor/ios
npx cap init LifeOSKeep com.lifeos.keep
npx cap add android
npx cap add ios
```

### Adapt the build

`vite.config.ts` already outputs to `dist/`. Capacitor consumes that:

```bash
# Build web, then sync to native
npm run build
npx cap copy
npx cap open android   # opens Android Studio
npx cap open ios       # opens Xcode
```

### Capacitor plugins for native features

```bash
npm install @capacitor/filesystem    # file read/write (replaces Electron FS)
npm install @capacitor/share         # share notes
npm install @capacitor/local-notifications  # reminders (replaces tray)
npm install @capacitor/network       # offline detection
```

### Use Capacitor APIs in the platform adapter

```ts
// src/store/platform.capacitor.ts
import { Filesystem, Directory } from '@capacitor/filesystem';
import { LocalNotifications } from '@capacitor/local-notifications';

class CapacitorPlatform implements PlatformAPI {
  storage = {
    // Use the same idb storage (shared with web)
    // Capacitor apps support IndexedDB
    getAllNotes: () => storage.getAllNotes(),
    // ...
  };
  notifications = {
    scheduleReminder: async (noteId: string, date: Date, text: string) => {
      await LocalNotifications.schedule({
        notifications: [{
          title: 'LifeOS Keep Reminder',
          body: text,
          id: parseInt(noteId.replace(/\D/g, '').slice(0, 8), 10),
          schedule: { at: date },
        }],
      });
    },
  };
}
```

---

## 🔵 Phase 3 — Shared Component Improvements (1–2 days)

Once the platform layer is in place, polish the React components to be responsive on all screen sizes:

### 3.1 Responsive masonry grid

```tsx
// src/components/MasonryGrid.tsx — already uses react-masonry-css
// Just ensure breakpoints cover mobile:
const breakpointCols = {
  default: 4,
  1400: 3,
  1100: 2,
  700: 2,
  500: 1,  // mobile
};
```

### 3.2 Mobile sidebar (slide-over drawer)

```tsx
function Sidebar({ ... }) {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <>
      {/* Hamburger button for mobile */}
      <button onClick={() => setIsOpen(true)} className="md:hidden p-2">
        <Menu size={24} />
      </button>
      
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-64 ...">
        {sidebarContent}
      </aside>
      
      {/* Mobile drawer overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/30" onClick={() => setIsOpen(false)} />
          <aside className="relative w-72 h-full bg-white shadow-xl animate-slide-in">
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
}
```

### 3.3 PWA install prompt

```tsx
// src/components/InstallPrompt.tsx
import { useEffect, useState } from 'react';

function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);
  
  if (!deferredPrompt) return null;
  
  return (
    <button onClick={() => { deferredPrompt.prompt(); }} className="...">
      Install App
    </button>
  );
}
```

---

## 🟣 Phase 4 — Conditional Electron Build (1 day)

Keep the Electron build but make it optional. When running as a PWA in a browser, don't load `electron` or `electron-builder`.

```ts
// vite.config.ts — conditional electron plugin
const isElectron = process.env.BUILD_TARGET === 'electron';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({ /* ... */ }),
    isElectron && electron([
      { entry: 'electron/main.ts', /* ... */ },
      { entry: 'electron/preload.ts', /* ... */ },
    ]),
    isElectron && renderer(),
  ].filter(Boolean),
});
```

Build commands:
```bash
npm run build:web    # vite build (PWA output → dist/)
npm run build:electron  # BUILD_TARGET=electron vite build + electron-builder
npm run build:mobile    # vite build → npx cap sync
```

---

## 📊 Effort Estimate

| Phase | Days | Dependencies |
|-------|------|-------------|
| **0: PWA + IndexedDB** | 2–3 | None (foundational) |
| **1: Cloud Services** | 3–5 | Phase 0 |
| **2: Mobile (Capacitor)** | 3–4 | Phase 0 |
| **3: Responsive UI** | 1–2 | Phase 0 |
| **4: Conditional Build** | 1 | Phase 0 |
| **Total** | **10–15** | Parallelizable: 3+4 can overlap / 2 after 0 |

---

## ✅ Migration Benefits

| Before (Electron-only) | After (Unified) |
|------------------------|-----------------|
| ❌ Desktop only (Win/Mac/Linux) | ✅ Browser PWA (any device) + Desktop + Mobile |
| ❌ JSON file via `fs` / `electron` | ✅ IndexedDB (works everywhere, syncable) |
| ❌ Google Tasks via `gws.exe` binary | ✅ Google Tasks REST API (OAuth) |
| ❌ Git sync via `git` CLI | ✅ GitHub REST API (`octokit`) |
| ❌ System tray only | ✅ PWA install + push notifications |
| ❌ 68 MB desktop EXE | ✅ PWA: zero install, ~500 KB cache |
| ❌ Manual npm install | ✅ Instant web access (shareable link) |

---

## 🚫 What Stays the Same

All **React components**, **types**, **store actions** (noteStore.tsx), **Tailwind styles**, and **icons** are 100% portable. The platform abstraction layer is the only new code — the UI doesn't change.
