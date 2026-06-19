#!/usr/bin/env python3
"""
Google Keep → Personal Docs Sync Script

Usage:
    1. Set credentials via environment variables or .env file:
        export KEEP_EMAIL=lifeosapp@gmail.com
        export KEEP_APP_PASSWORD=your_app_password_here
    
    2. Run the script:
        python sync_keep.py

Requirements:
    pip install gkeepapi python-dotenv

For Google Keep API access with a personal Gmail account, you need an App Password:
    1. Enable 2-Step Verification on your Google account
    2. Go to https://myaccount.google.com/apppasswords
    3. Generate an app password for "Keep Sync"
    4. Use that password as KEEP_APP_PASSWORD

For Google Workspace accounts, you can also use gws CLI with OAuth instead.
"""

import os
import sys
import re
import json
import datetime
from pathlib import Path
from typing import Optional

def install_requirements():
    """Auto-install required packages if missing."""
    try:
        import gkeepapi
        import dotenv
        return True
    except ImportError:
        print("[INFO] Installing required packages: gkeepapi, python-dotenv...")
        import subprocess
        subprocess.check_call([sys.executable, "-m", "pip", "install", "-q", "gkeepapi", "python-dotenv"])
        print("[INFO] Packages installed. Please restart the script.")
        return False

if not install_requirements():
    sys.exit(0)

import gkeepapi
from dotenv import load_dotenv

# ──────────────────────────────────────────────────────────────────────────────
# Configuration
# ──────────────────────────────────────────────────────────────────────────────

SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parent if SCRIPT_DIR.name == "90-Tools" else Path("C:/Users/SiphoH/source/personal_docs")
KEEP_NOTES_DIR = REPO_ROOT / "30-Resources" / "30-01-Keep-Notes"
ENV_FILE = REPO_ROOT / "99-Meta" / ".env"

# Load .env if present
if ENV_FILE.exists():
    load_dotenv(dotenv_path=ENV_FILE)

KEEP_EMAIL = os.environ.get("KEEP_EMAIL", "lifeosapp@gmail.com")
KEEP_APP_PASSWORD = os.environ.get("KEEP_APP_PASSWORD", "")

# Subfolders mapping (label → folder)
LABEL_MAP = {
    "ideas": "30-01-02-Ideas",
    "idea": "30-01-02-Ideas",
    "list": "30-01-03-Lists",
    "lists": "30-01-03-Lists",
    "todo": "30-01-03-Lists",
    "meeting": "30-01-04-Meeting-Notes",
    "meetings": "30-01-04-Meeting-Notes",
    "reference": "30-01-05-References",
    "references": "30-01-05-References",
    "bookmark": "30-01-05-References",
    "bookmarks": "30-01-05-References",
    "project": "30-01-06-Projects",
    "projects": "30-01-06-Projects",
}

# ──────────────────────────────────────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────────────────────────────────────

def sanitize_filename(name: str) -> str:
    """Make a string safe for use as a filename."""
    name = name.strip().replace("/", "-").replace("\\", "-")
    # Remove or replace invalid chars
    name = re.sub(r'[<>|:"?*]', "", name)
    # Limit length
    if len(name) > 80:
        name = name[:80]
    return name or "untitled"

def note_to_markdown(note) -> str:
    """Convert a gkeepapi note to Markdown string."""
    lines = []
    # Title as H1
    title = note.title.strip() if note.title else "Untitled Note"
    lines.append(f"# {title}")
    lines.append("")
    # Metadata frontmatter
    lines.append("---")
    lines.append(f"keep_id: {note.id}")
    lines.append(f"created: {note.timestamps.created.isoformat() if note.timestamps.created else 'unknown'}")
    lines.append(f"updated: {note.timestamps.updated.isoformat() if note.timestamps.updated else 'unknown'}")
    lines.append(f"trashed: {note.trashed}")
    lines.append(f"archived: {note.archived}")
    lines.append(f"pinned: {note.pinned}")
    lines.append(f"color: {note.color.value if note.color else 'unknown'}")
    if note.labels:
        labels = [lbl.name for lbl in note.labels]
        lines.append(f"labels: {json.dumps(labels)}")
    lines.append("---")
    lines.append("")
    # Content
    if note.text:
        lines.append(note.text)
    elif note.unchecked or note.checked:
        # List items
        for item in note.unchecked:
            lines.append(f"- [ ] {item}")
        for item in note.checked:
            lines.append(f"- [x] {item}")
    lines.append("")
    # Attachments / URLs
    if note.blobs:
        lines.append("## Attachments")
        for blob in note.blobs:
            lines.append(f"- {blob.type}: {blob}")
        lines.append("")
    return "\n".join(lines)

def categorize_note(note) -> str:
    """Determine which subfolder a note should go into."""
    # Check labels first
    if note.labels:
        for label in note.labels:
            label_name = label.name.lower()
            if label_name in LABEL_MAP:
                return LABEL_MAP[label_name]
    # Check title/content heuristics
    title_lower = (note.title or "").lower()
    text_lower = (note.text or "").lower()[:200]
    combined = title_lower + " " + text_lower
    if any(k in combined for k in ["todo", "shopping", "list", "checklist", "buy", "get"]):
        return "30-01-03-Lists"
    if any(k in combined for k in ["meeting", "discussed", "agenda", "minutes", "call"]):
        return "30-01-04-Meeting-Notes"
    if any(k in combined for k in ["idea", "thought", "brainstorm", "concept", "maybe"]):
        return "30-01-02-Ideas"
    if any(k in combined for k in ["link", "url", "http", "reference", "bookmark", "read later", "article"]):
        return "30-01-05-References"
    if any(k in combined for k in ["project", "task", "milestone", "deliverable"]):
        return "30-01-06-Projects"
    # Default to Inbox
    return "30-01-01-Inbox"

# ──────────────────────────────────────────────────────────────────────────────
# Main
# ──────────────────────────────────────────────────────────────────────────────

def main():
    if not KEEP_APP_PASSWORD:
        print("[ERROR] KEEP_APP_PASSWORD not set.")
        print(f"""
Please set your credentials in: {ENV_FILE}

Create that file with:
    KEEP_EMAIL=lifeosapp@gmail.com
    KEEP_APP_PASSWORD=your_app_password_here

To get an App Password:
    1. Enable 2-Step Verification: https://myaccount.google.com/signinoptions/two-step-verification
    2. Generate app password: https://myaccount.google.com/apppasswords
    3. Select app = 'Other', name it 'Keep Sync', copy the 16-char password
""")
        sys.exit(1)

    print(f"[INFO] Logging in as {KEEP_EMAIL} ...")
    keep = gkeepapi.Keep()
    try:
        keep.login(KEEP_EMAIL, KEEP_APP_PASSWORD)
    except Exception as e:
        print(f"[ERROR] Login failed: {e}")
        print("[HINT] Make sure you've enabled 2-Step Verification and generated an App Password.")
        sys.exit(1)

    print("[INFO] Fetching notes...")
    keep.sync()
    all_notes = keep.all()
    print(f"[INFO] Found {len(all_notes)} notes.")

    # Stats
    stats = {"new": 0, "updated": 0, "skipped": 0, "errors": 0}
    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    manifest = {
        "sync_timestamp": timestamp,
        "account": KEEP_EMAIL,
        "notes": [],
    }

    for note in all_notes:
        try:
            folder_name = categorize_note(note)
            folder_path = KEEP_NOTES_DIR / folder_name
            folder_path.mkdir(parents=True, exist_ok=True)

            safe_title = sanitize_filename(note.title or "untitled")
            filename = f"{safe_title}.md"
            filepath = folder_path / filename

            # Handle duplicates by appending a short hash of the ID
            if filepath.exists():
                # Check if content changed by comparing keep_id
                existing_content = filepath.read_text(encoding="utf-8", errors="ignore")
                if note.id in existing_content:
                    # Already exists, check if updated
                    # Simple approach: always update if newer
                    pass
                else:
                    # Different note with same title
                    short_id = note.id[:8]
                    filename = f"{safe_title}_{short_id}.md"
                    filepath = folder_path / filename

            md_content = note_to_markdown(note)
            filepath.write_text(md_content, encoding="utf-8")

            action = "updated" if filepath.stat().st_mtime > (datetime.datetime.now() - datetime.timedelta(minutes=1)).timestamp() else "new"
            stats[action] += 1

            manifest["notes"].append({
                "id": note.id,
                "title": note.title,
                "folder": folder_name,
                "file": str(filepath.relative_to(REPO_ROOT)),
                "updated": note.timestamps.updated.isoformat() if note.timestamps.updated else None,
            })

            print(f"  [{action}] {note.title or 'Untitled'} → {folder_name}/{filename}")

        except Exception as e:
            print(f"  [ERROR] Failed to export note '{note.title}': {e}")
            stats["errors"] += 1

    # Save manifest
    manifest_path = REPO_ROOT / "99-Meta" / f"keep_sync_manifest_{timestamp}.json"
    manifest_path.parent.mkdir(parents=True, exist_ok=True)
    manifest_path.write_text(json.dumps(manifest, indent=2, default=str), encoding="utf-8")

    # Summary
    print("\n" + "=" * 50)
    print(f"SYNC COMPLETE — {timestamp}")
    print(f"  New notes:      {stats['new']}")
    print(f"  Updated notes:  {stats['updated']}")
    print(f"  Skipped:        {stats['skipped']}")
    print(f"  Errors:         {stats['errors']}")
    print(f"  Manifest:       {manifest_path}")
    print("=" * 50)

    # Git commit suggestion
    git_dir = REPO_ROOT / ".git"
    if git_dir.exists() or (REPO_ROOT / ".gitignore").exists():
        print(f"\n[GIT] To commit changes:")
        print(f"    cd {REPO_ROOT}")
        print(f"    git add 30-Resources/30-01-Keep-Notes/ 99-Meta/")
        print(f"    git commit -m 'keep-sync: {timestamp} ({stats['new']} new, {stats['updated']} updated)'")

if __name__ == "__main__":
    main()
