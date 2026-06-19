# 📋 LifeOS — Personal Docs

PARA-based knowledge management system synced with Google Keep.

## 🗂️ Folder Structure (PARA + Your Keep Labels)

| Prefix | Category | Contents |
|--------|----------|----------|
| `00-` | **Inbox** | Landing zone for new, uncategorized items |
| `10-` | **Projects** | Active, time-bound efforts with a clear goal & deadline |
| `20-` | **Areas** | Ongoing responsibilities & roles (matches your Keep labels) |
| `30-` | **Resources** | Reference material, notes, articles, bookmarks |
| `40-` | **Archive** | Completed projects & inactive areas |
| `90-` | **Tools** | Scripts, utilities, the LifeOS Keep app |
| `99-` | **Meta** | Config, README, templates, manifests |

### 20-Areas — Your Keep Label Taxonomy

| # | Area | Sub-areas (A–M) |
|---|------|-----------------|
| 20-00 | Daily System | Templates, Daily Pressing Needs, Gratitude Lists, Daily Important Events & Appointments, Daily Priorities |
| 20-01 | Goals & Plans | |
| 20-02 | Readiness (Educ., Skills, & Traits) | |
| 20-03 | Wellness Indicators | |
| 20-04 | Execution | |
| 20-05 | Overcoming | |
| 20-06 | Performance Tracking | |
| 20-07 | Guidance & Oversight | |
| 20-08 | Spiritual | A-Conversion, B-Character, C-Doctrinal Purity |
| 20-09 | Material | A-Basic Needs, B-Safety & Health Needs, C-Relational Needs, D-Achievements Needs, E-Self-Expression Needs |
| 20-10 | Financial | A-Income Generation & Management, B-Financial Stewardship, C-Budgeting, D-Spending Tracking, E-Net Worth Statement, F-Credit Management, G-Tithes & Offerings, H-True Riches |
| 20-12 | Business | A-Product Development, B-Marketing, C-Sales, D-Order Fulfillment, E-Customer Support, F-Customer Satisfaction, G-Customer Success, G2-Finance Management, H-Human Resources Management, I-Operations Management, J-Strategic Management, K-Admin Operations, L-Legal Affairs, M-Corporate Governance |
| 20-13 | Project Reference Materials | |
| 20-14 | General Reference Material | |

## 📥 What Was Imported

**Google Keep Takeout** → `393 notes` imported into `20-Areas/` organized by your actual labels.

| Folder | Notes |
|--------|-------|
| 20-00-Daily-System/A-Daily-Pressing-Needs | 157 |
| 20-00-Daily-System/A-Templates | 72 |
| 20-08-Spiritual | 61 |
| 20-00-Daily-System/B-Daily-Important-Events-and-Appointments | 39 |
| 20-00-Daily-System/D-Daily-Priorities | 19 |
| 20-00-Daily-System/A-Gratitude-Lists | 18 |
| 20-06-Performance-Tracking | 11 |
| 20-12-Business/B-Marketing | 4 |
| 20-12-Business/A-Product-Development | 2 |
| 20-05-Overcoming | 2 |
| 20-10-Financial | 2 |
| *(+ other areas)* | |

## 🔧 LifeOS Keep App

A desktop Google Keep clone lives in `90-Tools/LifeOS-Keep-App/`:

```bash
cd "90-Tools/LifeOS-Keep-App"
npm install
npm run dev
```

**Features:** masonry grid, checklists with strikethrough, 12 colors, labels, pin/archive/trash, templates, search, sync to Markdown.

## 🔄 Sync

- **Export** from the app → Markdown files in `20-Areas/`
- **Import** from `20-Areas/` → app database
- Each note is a `.md` file with YAML frontmatter (title, labels, color, pinned, archived, timestamps)

## 🏷️ How Categorization Works

Notes are sorted by their **Keep label** into the matching `20-Areas` subfolder. Unlabeled notes land in `20-00-Daily-System/A-Daily-Pressing-Needs` for manual triage.

---
*LifeOS Setup — your Google Keep, now organized*
