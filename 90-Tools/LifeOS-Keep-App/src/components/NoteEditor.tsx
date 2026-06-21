import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useNoteStore } from '../store/noteStore';
import { Note, NoteColor, NoteItem, COLOR_MAP } from '../types/note';
import ColorPicker from './ColorPicker';
import LabelManager from './LabelManager';
import DraggableChecklist from './DraggableChecklist';
import {
  Pin, Bell, Palette, Tag, Archive, Trash2, X, CheckSquare, Type,
  Undo, Image as ImageIcon, Calendar, Clock
} from 'lucide-react';

interface NoteEditorProps {
  noteId: string;
  onClose: () => void;
}

export default function NoteEditor({ noteId, onClose }: NoteEditorProps) {
  const { getNote, updateNote, archiveNote, trashNote, restoreNote, deleteNote, createTask, updateTask, deleteTask } = useNoteStore();
  const [note, setNote] = useState<Note | null>(null);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showLabelManager, setShowLabelManager] = useState(false);
  const [showReminder, setShowReminder] = useState(false);
  const [reminderDate, setReminderDate] = useState('');
  const [reminderTime, setReminderTime] = useState('');
  const [taskStatus, setTaskStatus] = useState<string>('');
  const [isEditing, setIsEditing] = useState(true);

  useEffect(() => {
    const fetchNote = async () => {
      const n = await getNote(noteId);
      if (n) {
        setNote(n);
        if (n.reminder) {
          const dt = new Date(n.reminder);
          setReminderDate(dt.toISOString().split('T')[0]);
          setReminderTime(dt.toTimeString().slice(0, 5));
        }
      }
    };
    fetchNote();
  }, [noteId, getNote]);

  useEffect(() => {
    function handleEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  if (!note) return null;

  const handleUpdate = (updates: Partial<Note>) => {
    const updated = { ...note, ...updates, updatedAt: new Date().toISOString() };
    setNote(updated);
    updateNote(updated);
  };

  const handleSetReminder = async () => {
    if (!reminderDate || !reminderTime) return;
    const due = new Date(`${reminderDate}T${reminderTime}:00`).toISOString();

    setTaskStatus('Creating Google Task...');
    try {
      let result;
      if (note.taskId) {
        result = await updateTask(note.taskId, { due, title: note.title });
      } else {
        result = await createTask({
          title: note.title || 'LifeOS Reminder',
          due,
          notes: note.content || '',
        });
      }
      if (result.success) {
        handleUpdate({ reminder: due, taskId: result.task?.id || note.taskId });
        setTaskStatus('Reminder synced to Google Tasks!');
        setShowReminder(false);
      } else {
        setTaskStatus('Error: ' + result.error);
      }
    } catch (e: any) {
      setTaskStatus('Error: ' + e.message);
    }
  };

  const handleRemoveReminder = async () => {
    if (note.taskId) {
      await deleteTask(note.taskId);
    }
    handleUpdate({ reminder: undefined, taskId: undefined });
    setReminderDate('');
    setReminderTime('');
  };

  const handleArchive = () => {
    if (note.isTrashed) return;
    if (note.isArchived) restoreNote(note.id);
    else archiveNote(note.id);
    onClose();
  };

  const handleTrash = () => {
    if (note.isTrashed) {
      deleteNote(note.id);
    } else {
      trashNote(note.id);
    }
    onClose();
  };

  const handleRestore = () => {
    restoreNote(note.id);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/50">
      <div
        className="w-full max-w-[600px] rounded-lg keep-shadow"
        style={{ backgroundColor: COLOR_MAP[note.color] }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-3">
          <input
            type="text"
            value={note.title}
            onChange={(e) => handleUpdate({ title: e.target.value })}
            className="flex-1 bg-transparent outline-none text-sm font-medium text-gray-900 placeholder-gray-500"
            placeholder="Title"
          />
          <button
            onClick={() => handleUpdate({ isPinned: !note.isPinned })}
            className={`p-2 rounded-full hover:bg-black/5 transition-colors ${note.isPinned ? 'text-amber-600' : 'text-gray-500'}`}
          >
            <Pin size={16} fill={note.isPinned ? 'currentColor' : 'none'} />
          </button>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-black/5 text-gray-500 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Mode toggle: Edit / Preview */}
        <div className="px-4 pt-2 flex items-center gap-2">
          <button
            onClick={() => setIsEditing(true)}
            className={`text-xs px-2 py-1 rounded ${isEditing ? 'bg-gray-200 text-gray-800' : 'text-gray-500 hover:bg-gray-100'}`}
          >
            Edit
          </button>
          <button
            onClick={() => setIsEditing(false)}
            className={`text-xs px-2 py-1 rounded ${!isEditing ? 'bg-gray-200 text-gray-800' : 'text-gray-500 hover:bg-gray-100'}`}
          >
            Preview
          </button>
        </div>

        {/* Content */}
        <div className="px-4 py-2">
          {note.type === 'text' && isEditing && (
            <textarea
              value={note.content}
              onChange={(e) => handleUpdate({ content: e.target.value })}
              className="w-full bg-transparent outline-none text-sm text-gray-800 resize-none min-h-[100px]"
              rows={5}
            />
          )}
          {note.type === 'text' && !isEditing && (
            <div className="prose prose-sm max-w-none text-gray-800">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {note.content || '*No content*'}
              </ReactMarkdown>
            </div>
          )}
          {note.type === 'checklist' && (
            <DraggableChecklist
              items={note.items}
              onChange={(items) => handleUpdate({ items })}
            />
          )}
        </div>

        {/* Reminder */}
        {note.reminder && (
          <div className="px-4 pb-1">
            <span className="text-xs px-2 py-1 bg-amber-100 text-amber-800 rounded-full inline-flex items-center gap-1">
              <Bell size={10} />
              {new Date(note.reminder).toLocaleString()}
              <button onClick={handleRemoveReminder} className="ml-1 hover:text-amber-900">
                <X size={10} />
              </button>
            </span>
          </div>
        )}

        {/* Labels */}
        {note.labels.length > 0 && (
          <div className="px-4 pb-1 flex flex-wrap gap-1">
            {note.labels.map(label => (
              <span key={label} className="text-xs px-2 py-0.5 bg-gray-200/60 rounded-full text-gray-700">
                {label}
              </span>
            ))}
          </div>
        )}

        {/* Toolbar */}
        <div className="px-2 py-2 flex items-center justify-between border-t border-black/5">
          <div className="flex items-center gap-0.5">
            <button
              onClick={() => setShowColorPicker(!showColorPicker)}
              className="p-2 rounded-full hover:bg-black/5 text-gray-600 transition-colors relative"
            >
              <Palette size={16} />
              {showColorPicker && (
                <div className="absolute top-full left-0 mt-1 z-50">
                  <ColorPicker
                    selected={note.color}
                    onSelect={(c) => { handleUpdate({ color: c }); setShowColorPicker(false); }}
                    onClose={() => setShowColorPicker(false)}
                  />
                </div>
              )}
            </button>
            <button
              onClick={() => setShowLabelManager(!showLabelManager)}
              className="p-2 rounded-full hover:bg-black/5 text-gray-600 transition-colors relative"
            >
              <Tag size={16} />
              {showLabelManager && (
                <div className="absolute top-full left-0 mt-1 z-50">
                  <LabelManager
                    selected={note.labels}
                    onChange={(labels) => { handleUpdate({ labels }); setShowLabelManager(false); }}
                    onClose={() => setShowLabelManager(false)}
                  />
                </div>
              )}
            </button>
            <button
              onClick={() => setShowReminder(!showReminder)}
              className={`p-2 rounded-full hover:bg-black/5 transition-colors ${note.reminder ? 'text-amber-600' : 'text-gray-600'}`}
              title="Set reminder"
            >
              <Bell size={16} fill={note.reminder ? 'currentColor' : 'none'} />
            </button>
            {!note.isTrashed && (
              <button
                onClick={handleArchive}
                className="p-2 rounded-full hover:bg-black/5 text-gray-600 transition-colors"
                title={note.isArchived ? 'Unarchive' : 'Archive'}
              >
                <Archive size={16} />
              </button>
            )}
            {note.isTrashed && (
              <button
                onClick={handleRestore}
                className="p-2 rounded-full hover:bg-black/5 text-gray-600 transition-colors"
                title="Restore"
              >
                <Undo size={16} />
              </button>
            )}
            <button
              onClick={handleTrash}
              className="p-2 rounded-full hover:bg-black/5 text-gray-600 transition-colors"
              title={note.isTrashed ? 'Delete forever' : 'Trash'}
            >
              <Trash2 size={16} />
            </button>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 text-sm font-medium text-gray-700 hover:bg-black/5 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>

        {/* Reminder panel */}
        {showReminder && (
          <div className="px-4 pb-3 border-t border-black/5">
            <div className="flex items-center gap-2 mt-2">
              <Calendar size={14} className="text-gray-500" />
              <input
                type="date"
                value={reminderDate}
                onChange={(e) => setReminderDate(e.target.value)}
                className="text-sm px-2 py-1 border border-gray-200 rounded outline-none focus:border-amber-300"
              />
              <Clock size={14} className="text-gray-500" />
              <input
                type="time"
                value={reminderTime}
                onChange={(e) => setReminderTime(e.target.value)}
                className="text-sm px-2 py-1 border border-gray-200 rounded outline-none focus:border-amber-300"
              />
              <button
                onClick={handleSetReminder}
                className="px-3 py-1 text-xs bg-amber-500 text-white rounded hover:bg-amber-600 transition-colors"
              >
                Set
              </button>
            </div>
            {taskStatus && (
              <p className="text-xs text-gray-500 mt-1">{taskStatus}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
