# LifeOS Keep App v1.1.0

A **full-featured Google Keep clone** with PARA folder sync, goal hierarchy, habit tracking, project management, and Google Tasks integration. Desktop app for the LifeOS productivity system.

Built with Electron 28 + React 18 + TypeScript + Vite + Tailwind CSS.

---

## ✨ Features

### 📝 Core Note-Taking
- **Masonry grid** — all notes visible in a canvas, pinned notes first
- **Text & checklist notes** — with strikethrough on completed items
- **Draggable checklists** — reorder items, nest sub-tasks (@hello-pangea/dnd)
- **12 Google Keep colors** — full color palette with picker
- **50+ PARA-compatible labels** — matches your Google Keep taxonomy (00–14 + sub-labels)
- **Pin, archive, trash** — full lifecycle management
- **Inline Markdown preview** — renders headings, lists, links, checkboxes via react-markdown + GFM
- **Search** — real-time by title, content, labels

### 🎯 Goal Hierarchy (Visual Goal Tree)
- **Vision → 3-5 Year → Annual → Quarterly → Monthly → Weekly → Daily** cascade
- Collapsible tree view of all goals
- Progress rollup (children auto-summarize to parent)
- Dependency tracking (blockers)
- Completion ratings (orange/yellow/lightgreen/darkgreen)
- Templates for every level

### 🔥 Habit Tracker
- Daily habit logging with streak counting
- Best streak tracking
- Completion status: pending / done / not done

### 📋 Project Management
- Projects with task checklists
- Auto-complete children option
- Progress percentage (manual or auto from checklists)

### 🔔 Google Tasks Reminders
- Create reminders with date/time picker
- List view of all upcoming reminders
- Bidirectional sync via `gws` CLI

### 🔄 Bidirectional Markdown Sync
- Export notes as individual `.md` files to `personal_docs` PARA structure
- Import Markdown files back into Keep
- Folder structure: `Inbox`, `Areas`, `Projects`, `Resources`, `Archive`

### 🖥️ System Tray
- Minimize to tray — app stays running in background
- Quick Note hotkey: `Ctrl+Shift+N`
- Context menu: Open, Quick Note, Quit

### 🤖 Git Auto-Sync (Hermes Cron)
- Cron job pushes note changes to GitHub every 30 minutes
- `git-sync.mjs` — pull → commit → push pipeline
- `auto-sync.mjs` — export notes to PARA Markdown structure
- Falls back through `~/.bashrc` → `.env` for GITHUB_PAT

---

## 🧰 Tech Stack

| Layer | Technology |
|-------|-----------|
| Desktop shell | Electron 28 |
| UI | React 18 + TypeScript |
| Build | Vite 5 + vite-plugin-electron |
| Styling | Tailwind CSS 3 |
| Storage | JSON file (Electron userData) |
| Drag & drop | @hello-pangea/dnd |
| Markdown | react-markdown + remark-gfm |
| Task sync | gws CLI (Google Tasks) |
| Icons | lucide-react |
| Packaging | electron-builder 24 |

---

## 📦 Quick Start

```bash
cd C:\Users\SiphoH\source\personal_docs\90-Tools\LifeOS-Keep-App

# Install dependencies
npm install

# Development (Electron + Vite hot-reload on port 5175)
npm run dev

# Production build (Vite + electron-builder)
npm run build
```

---

## 📁 Project Structure

```
LifeOS-Keep-App/
├── electron/              # Main process
│   ├── main.ts            # Window, IPC handlers, tray, gTasks, git sync
│   ├── preload.ts         # Secure context bridge (electronAPI)
│   └── db.ts              # JSON NoteStore + Markdown export/import
├── src/                   # Renderer (React)
│   ├── App.tsx            # Main app layout + view routing
│   ├── main.tsx           # Entry point
│   ├── index.css          # Tailwind + custom styles
│   ├── components/        # 14 React components
│   │   ├── Sidebar.tsx    # Navigation + quick actions
│   │   ├── SearchBar.tsx  # Real-time search
│   │   ├── CreateNote.tsx # Note creation (text/checklist)
│   │   ├── MasonryGrid.tsx# Responsive masonry layout
│   │   ├── NoteCard.tsx   # Note preview card
│   │   ├── NoteEditor.tsx # Full note editor modal
│   │   ├── DraggableChecklist.tsx # Drag-reorderable checklist
│   │   ├── TasksPanel.tsx # Google Tasks reminders panel
│   │   ├── GoalsTree.tsx  # Visual goal hierarchy tree
│   │   ├── HabitTracker.tsx # Habit streak tracker
│   │   ├── TemplateModal.tsx # Templates browser
│   │   ├── ColorPicker.tsx # 12-color picker
│   │   └── LabelManager.tsx # Label management
│   ├── store/
│   │   └── noteStore.tsx  # React Context store (40+ actions)
│   └── types/
│       └── note.ts        # TypeScript types + constants
├── assets/
│   ├── icon.png           # App icon (512x512)
│   └── icon.ico           # Windows icon
├── dist/                  # Vite build output
├── dist-electron/         # Electron build output
├── release/               # electron-builder artifacts
│   ├── LifeOS Keep 1.1.0.exe         # Portable Windows exe
│   ├── LifeOS Keep-1.1.0-win.zip     # Windows ZIP distribution
│   └── win-unpacked/                  # Unpacked app
├── git-sync.mjs           # Git auto-sync script
├── auto-sync.mjs          # PARA markdown auto-sync
├── electron-builder.yml   # Cross-platform packaging config
├── vite.config.ts         # Vite + Electron plugin config
├── tailwind.config.js     # Tailwind configuration
├── postcss.config.js      # PostCSS configuration
└── tsconfig.json          # TypeScript configuration
```

---

## 🏗️ Build Artifacts

| Platform | File | Size |
|----------|------|------|
| Windows (portable) | `release/LifeOS Keep 1.1.0.exe` | ~68 MB |
| Windows (ZIP) | `release/LifeOS Keep-1.1.0-win.zip` | ~103 MB |
| macOS | `release/LifeOS Keep-1.1.0.dmg` | via electron-builder |
| Linux | `release/LifeOS Keep-1.1.0.AppImage` | via electron-builder |

---

## 🔑 Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GITHUB_PAT` | For auto-sync | GitHub Personal Access Token with repo scope |

---

## ⏰ Cron Job (Hermes)

The auto-sync cron job (`lifeos-keep-auto-sync`) runs `lifeos-keep-sync.sh` every 30 minutes:
1. Sources `~/.bashrc` and `.env` for `GITHUB_PAT`
2. Runs `git-sync.mjs` to pull → commit → push changes
3. Silent when nothing has changed (no-agent mode)

To re-enable after adding your PAT:
```bash
hermes cron list                         # find the job ID
hermes cron run --job-id <id>            # test it
hermes cron update --job-id <id> --pause false  # if paused
```

---

## 🖥️ System Requirements

- **OS:** Windows 10+, macOS 12+, Linux (x64)
- **RAM:** 256 MB minimum
- **Storage:** 250 MB for app + data

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Escape` | Close note editor |
| `Ctrl+Shift+N` | Quick Note (global hotkey) |
| `Ctrl+F` | Focus search |
| *(more to come)* | |

---

## 🔧 Configuration

### Google Tasks Sync
The app uses `gws` CLI (`google-workspace` CLI tool) for Google Tasks integration. The binary is auto-detected:
1. `../../.tools/gws.exe` (relative to project)
2. Electron userData
3. Bundled in production
4. System PATH

### Data Location
Notes stored in Electron's `userData`:
- **Windows:** `%APPDATA%/lifeos-keep/notes.json`
- **macOS:** `~/Library/Application Support/lifeos-keep/notes.json`
- **Linux:** `~/.config/lifeos-keep/notes.json`

---

## 📜 License

MIT — Built for LifeOS / Gestalt360

---

*Last updated: June 2026 · Version 1.1.0*
