import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Note, COLOR_MAP } from '../types/note';
import { Pin, Bell, CheckSquare } from 'lucide-react';

interface NoteCardProps {
  note: Note;
  onEdit: (id: string) => void;
}

export default function NoteCard({ note, onEdit }: NoteCardProps) {
  const bgColor = COLOR_MAP[note.color];

  return (
    <div
      onClick={() => onEdit(note.id)}
      className="group relative rounded-lg keep-shadow hover:keep-shadow-hover note-transition cursor-pointer"
      style={{ backgroundColor: bgColor }}
    >
      {note.isPinned && (
        <div className="absolute top-2 right-2 text-gray-500">
          <Pin size={14} fill="currentColor" />
        </div>
      )}
      {note.reminder && (
        <div className="absolute top-2 left-2 text-amber-600">
          <Bell size={14} fill="currentColor" />
        </div>
      )}

      <div className="p-3">
        {note.title && (
          <h3 className="text-sm font-medium mb-1 text-gray-900 line-clamp-2">
            {note.title}
          </h3>
        )}

        {note.type === 'text' && note.content && (
          <div className="prose prose-sm max-w-none text-gray-800 line-clamp-6">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {note.content}
            </ReactMarkdown>
          </div>
        )}

        {note.type === 'checklist' && note.items.length > 0 && (
          <div className="space-y-1">
            {note.items.slice(0, 5).map((item) => (
              <div key={item.id} className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-sm border ${
                  item.checked ? 'bg-gray-600 border-gray-600' : 'border-gray-400'
                }`} />
                <span className={`text-sm ${item.checked ? 'strikethrough text-gray-500' : 'text-gray-800'} truncate`}>
                  {item.text}
                </span>
              </div>
            ))}
            {note.items.length > 5 && (
              <p className="text-xs text-gray-500 pl-5">
                +{note.items.length - 5} more items
              </p>
            )}
          </div>
        )}

        {note.type === 'checklist' && note.items.length === 0 && (
          <p className="text-sm text-gray-500 opacity-60 italic">
            Empty checklist
          </p>
        )}

        {note.labels.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {note.labels.map(label => (
              <span key={label} className="text-xs px-2 py-0.5 bg-gray-200/60 rounded-full text-gray-700">
                {label}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
