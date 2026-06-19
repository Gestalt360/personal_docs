#!/usr/bin/env python3
"""
Import Google Keep Takeout JSON files into personal_docs
Folder names match Keep labels exactly.
"""
import json, re
from pathlib import Path
from datetime import datetime

TAKEOUT_DIR = Path(".takeout/Takeout/Keep")
REPO_ROOT = Path("C:/Users/SiphoH/source/personal_docs")
AREAS_ROOT = REPO_ROOT / "20-Areas"

# Mapping from label name to exact folder path
# Number + letter labels get subfolders under the parent number
LABEL_TO_FOLDER = {
    # 00 — Daily System
    "00. Templates": "20-Areas/20-00-Daily-System/A-Templates",
    "00a. Daily Pressing Needs": "20-Areas/20-00-Daily-System/A-Daily-Pressing-Needs",
    "00a Gratitude Lists": "20-Areas/20-00-Daily-System/A-Gratitude-Lists",
    "00b. Daily Important Events & Appointments": "20-Areas/20-00-Daily-System/B-Daily-Important-Events-and-Appointments",
    "00d. Daily Priorities": "20-Areas/20-00-Daily-System/D-Daily-Priorities",
    # 01
    "01. Goals & Plans": "20-Areas/20-01-Goals-and-Plans",
    # 02
    "02. Readiness (Educ., Skills, & Traits)": "20-Areas/20-02-Readiness",
    # 03
    "03. Wellness Indicators": "20-Areas/20-03-Wellness-Indicators",
    # 04
    "04. Execution": "20-Areas/20-04-Execution",
    # 05
    "05. Overcoming": "20-Areas/20-05-Overcoming",
    # 06
    "06. Performance Tracking": "20-Areas/20-06-Performance-Tracking",
    # 07
    "07. Guidance & Oversight": "20-Areas/20-07-Guidance-and-Oversight",
    # 08
    "08. Spiritual": "20-Areas/20-08-Spiritual",
    "08a. Conversion": "20-Areas/20-08-Spiritual/A-Conversion",
    "08b. Character": "20-Areas/20-08-Spiritual/B-Character",
    "08c. Doctrinal Purity": "20-Areas/20-08-Spiritual/C-Doctrinal-Purity",
    # 09
    "09. Material": "20-Areas/20-09-Material",
    "09a. Basic Needs": "20-Areas/20-09-Material/A-Basic-Needs",
    "09b. Safety & Health Needs": "20-Areas/20-09-Material/B-Safety-and-Health-Needs",
    "09c. Relational Needs": "20-Areas/20-09-Material/C-Relational-Needs",
    "09d. Achievements Needs": "20-Areas/20-09-Material/D-Achievements-Needs",
    "09e. Self-Expression Needs": "20-Areas/20-09-Material/E-Self-Expression-Needs",
    # 10
    "10. Financial": "20-Areas/20-10-Financial",
    "10a. Income Generation & Management": "20-Areas/20-10-Financial/A-Income-Generation-and-Management",
    "10b. Financial Stewardship": "20-Areas/20-10-Financial/B-Financial-Stewardship",
    "10c. Budgeting": "20-Areas/20-10-Financial/C-Budgeting",
    "10d. Spending Tracking": "20-Areas/20-10-Financial/D-Spending-Tracking",
    "10e. Net Worth Statement": "20-Areas/20-10-Financial/E-Net-Worth-Statement",
    "10f. Credit Management": "20-Areas/20-10-Financial/F-Credit-Management",
    "10g. Tithes & Offerings": "20-Areas/20-10-Financial/G-Tithes-and-Offerings",
    "10h. True Riches": "20-Areas/20-10-Financial/H-True-Riches",
    # 12
    "12. Business": "20-Areas/20-12-Business",
    "12a. Product Development": "20-Areas/20-12-Business/A-Product-Development",
    "12b. Marketing": "20-Areas/20-12-Business/B-Marketing",
    "12c. Sales": "20-Areas/20-12-Business/C-Sales",
    "12d. Order Fulfillment": "20-Areas/20-12-Business/D-Order-Fulfillment",
    "12e. Customer Support": "20-Areas/20-12-Business/E-Customer-Support",
    "12f. Customer Satisfaction": "20-Areas/20-12-Business/F-Customer-Satisfaction",
    "12g. Customer Success": "20-Areas/20-12-Business/G-Customer-Success",
    "12g. Finance Management": "20-Areas/20-12-Business/G2-Finance-Management",
    "12h. Human Resources Management": "20-Areas/20-12-Business/H-Human-Resources-Management",
    "12i. Operations Management": "20-Areas/20-12-Business/I-Operations-Management",
    "12j. Strategic Management": "20-Areas/20-12-Business/J-Strategic-Management",
    "12k. Admin Operations": "20-Areas/20-12-Business/K-Admin-Operations",
    "12l. Legal Affairs": "20-Areas/20-12-Business/L-Legal-Affairs",
    "12m. Corporate Governance": "20-Areas/20-12-Business/M-Corporate-Governance",
    # 13
    "13. Project Reference Materials": "20-Areas/20-13-Project-Reference-Materials",
    # 14
    "14. General Reference Material": "20-Areas/20-14-General-Reference-Material",
}

COLOR_MAP = {
    "DEFAULT": "white", "RED": "red", "ORANGE": "orange", "YELLOW": "yellow",
    "GREEN": "green", "TEAL": "teal", "BLUE": "blue", "DARK_BLUE": "darkblue",
    "PURPLE": "purple", "PINK": "pink", "BROWN": "brown", "GRAY": "gray",
}

def sanitize(name):
    name = re.sub(r'[\r\n]', " ", name)
    name = re.sub(r'[<>:"/\\|?*]', "", name)
    return name[:80] or "untitled"

def get_folder(label_names):
    if not label_names:
        return "20-Areas/20-00-Daily-System/A-Daily-Pressing-Needs"
    # Find most specific label (longest / most specific match)
    for label in label_names:
        if label in LABEL_TO_FOLDER:
            return LABEL_TO_FOLDER[label]
    # Fallback: match by number prefix
    for label in label_names:
        parts = label.split(".")
        if len(parts) >= 1:
            prefix = parts[0]
            for known, folder in LABEL_TO_FOLDER.items():
                if known.startswith(prefix + "."):
                    return folder
    return "20-Areas/20-00-Daily-System/A-Daily-Pressing-Needs"

def main():
    stats = {"total": 0, "imported": 0, "errors": 0, "by_folder": {}}
    json_files = sorted(TAKEOUT_DIR.glob("*.json"))
    print(f"Found {len(json_files)} JSON files")

    for json_path in json_files:
        try:
            data = json.loads(json_path.read_text(encoding="utf-8"))
        except Exception:
            stats["errors"] += 1
            continue

        stats["total"] += 1
        if data.get("isTrashed", False):
            continue

        title = data.get("title", "") or "Untitled"
        color = COLOR_MAP.get(data.get("color", "DEFAULT"), "white")
        # Extract label names from dicts
        labels_raw = data.get("labels", [])
        label_names = [l["name"] for l in labels_raw if isinstance(l, dict) and "name" in l]

        created = data.get("createdTimestampUsec", 0)
        updated = data.get("userEditedTimestampUsec", 0)
        created_dt = datetime.fromtimestamp(created / 1_000_000).isoformat() if created else ""
        updated_dt = datetime.fromtimestamp(updated / 1_000_000).isoformat() if updated else ""

        list_content = data.get("listContent", [])
        text_content = data.get("textContent", "")

        if list_content:
            note_type = "checklist"
            items = [{"text": i.get("text", ""), "checked": i.get("isChecked", False)} for i in list_content]
        else:
            note_type = "text"
            items = []

        folder_rel = get_folder(label_names)
        folder_path = REPO_ROOT / folder_rel
        folder_path.mkdir(parents=True, exist_ok=True)

        safe_title = sanitize(title)
        filename = f"{safe_title}.md"
        filepath = folder_path / filename
        counter = 1
        while filepath.exists():
            filepath = folder_path / f"{safe_title}_{counter}.md"
            counter += 1

        # Build markdown
        lines = ["---", f'type: {note_type}', f'color: {color}', f'labels: {json.dumps(label_names)}',
                 f'pinned: {data.get("isPinned", False)}', f'archived: {data.get("isArchived", False)}',
                 f'created: {created_dt}', f'updated: {updated_dt}', "---", "", f'# {title}', ""]
        if note_type == "checklist":
            for item in items:
                checked = "x" if item["checked"] else " "
                lines.append(f'- [{checked}] {item["text"]}')
        else:
            lines.append(text_content)
        lines.append("")

        filepath.write_text("\n".join(lines), encoding="utf-8")
        stats["imported"] += 1
        stats["by_folder"][folder_rel] = stats["by_folder"].get(folder_rel, 0) + 1

    # Summary
    print(f"\n{'='*50}")
    print(f"IMPORT COMPLETE")
    print(f"  Total JSON files: {stats['total']}")
    print(f"  Imported notes:   {stats['imported']}")
    print(f"  Errors:           {stats['errors']}")
    print(f"\nBy folder:")
    for folder, count in sorted(stats["by_folder"].items(), key=lambda x: -x[1]):
        print(f"  {folder:55s} {count:4d}")
    print(f"{'='*50}")

if __name__ == "__main__":
    main()
