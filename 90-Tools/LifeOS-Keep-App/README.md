# LifeOS Keep App

A Google Keep clone built for your LifeOS system. Desktop app with bidirectional sync to your `personal_docs` folder.

## Features

- **Masonry grid** — all notes visible in one canvas, just like Google Keep
- **Text & checklist notes** — with strikethrough on checked items
- **12 colors** — full Keep color palette
- **Labels** — matches your actual Google Keep taxonomy (01–14 + sub-labels)
- **Pin, archive, trash** — full lifecycle management
- **Templates** — pre-built templates matching your system (10 Daily Questions, Daily Priorities, Gratitude List, etc.)
- **Search** — real-time search across titles, content, labels
- **Bidirectional sync** — export notes to `personal_docs` as Markdown, import from Markdown
- **Offline-first** — works without internet, syncs when you choose

## Tech Stack

- Electron 28 + Vite + React 18 + TypeScript
- Tailwind CSS
- JSON file storage (no database needed)
- Markdown export/import for `personal_docs` sync

## Your Label Taxonomy (from Google Keep)

| Number | Area | Sub-areas |
|--------|------|-----------|
| 00 | Daily System | Templates, Daily Pressing Needs, Gratitude Lists, Daily Events & Appointments, Daily Priorities |
| 01 | Goals & Plans | |
| 02 | Readiness (Educ., Skills, & Traits) | |
| 03 | Wellness Indicators | |
| 04 | Execution | |
| 05 | Overcoming | |
| 06 | Performance Tracking | |
| 07 | Guidance & Oversight | |
| 08 | Spiritual | Conversion, Character, Doctrinal Purity |
| 09 | Material | Basic Needs, Safety & Health, Relational, Achievements, Self-Expression |
| 10 | Financial | Income Generation, Stewardship, Budgeting, Spending Tracking, Net Worth, Credit, Tithes, True Riches |
| 12 | Business | Product Development, Marketing, Sales, Order Fulfillment, Customer Support, Customer Satisfaction, Customer Success, Finance Management, HR, Operations, Strategic Management, Admin, Legal, Corporate Governance |
| 13 | Project Reference Materials | |
| 14 | General Reference Material | |

## Installation

```bash
cd "C:\Users\SiphoH\source\personal_docs\90-Tools\LifeOS-Keep-App"
npm install
npm run dev
```

## Building for Production

```bash
npm run build
```

Outputs:
- Windows: `.exe` installer in `dist/`
- macOS: `.dmg` in `dist/`
- Linux: `.AppImage` in `dist/`

## Sync with personal_docs

The app can export all notes to Markdown files in your `personal_docs` structure:

1. Click **Sync** in the sidebar
2. Select **Export to Markdown** — saves to your chosen folder
3. Select **Sync to personal_docs** — directly exports to `20-Areas/` with your label structure

## File Structure

```
LifeOS-Keep-App/
├── electron/          # Main process, IPC, storage
│   ├── main.ts        # Window, IPC handlers
│   ├── preload.ts     # Secure bridge
│   └── db.ts          # JSON storage + Markdown sync
├── src/
│   ├── components/    # React UI components
│   ├── store/         # Note context + actions
│   └── types/         # TypeScript types
└── package.json
```

## Data Storage

Notes are stored in Electron's `userData` folder:
- Windows: `%APPDATA%/lifeos-keep/notes.json`
- macOS: `~/Library/Application Support/lifeos-keep/notes.json`
- Linux: `~/.config/lifeos-keep/notes.json`

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Escape` | Close note editor |
| `Ctrl+F` | Focus search |

---
*Built for LifeOS — your personal productivity system*
