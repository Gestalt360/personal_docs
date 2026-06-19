import json, sys
sys.path.insert(0, r'C:\Users\SiphoH\source\personal_docs\.toolsvenv\Lib\site-packages')

import gkeepapi
keep = gkeepapi.Keep()
keep.authenticate('lifeosapp@gmail.com', 'elsmgtwvlkxwvgcs')
keep.sync()

labels = []
for label in keep.labels():
    labels.append({"name": label.name, "id": label.id})

notes = []
for note in keep.all():
    note_labels = [l.name for l in note.labels] if note.labels else []
    notes.append({"title": note.title, "labels": note_labels})

result = {
    "labels": sorted(labels, key=lambda x: x["name"]),
    "total_notes": len(notes),
    "notes_with_labels": [n for n in notes if n["labels"]],
    "notes_without_labels": [n for n in notes if not n["labels"]],
}

print(json.dumps(result, indent=2, default=str))
