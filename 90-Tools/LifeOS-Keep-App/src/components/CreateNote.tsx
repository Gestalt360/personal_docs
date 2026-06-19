import React, { useState, useRef, useEffect } from 'react';
import { useNoteStore } from '../store/noteStore';
import { COLOR_MAP, NoteColor } from '../types/note';
import ColorPicker from './ColorPicker';
import LabelManager from './LabelManager';
import { Plus, Pin, Bell, Palette, Tag, CheckSquare, Type, Image as ImageIcon } from 'lucide-react';

export default function CreateNote() {
  const { createNote } = useNoteStore();
  const [isExpanded, setIsExpanded] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [type, setType] = useState<'text' | 'checklist'>('text');
  const [color, setColor] = useState<NoteColor>('white');
  const [labels, setLabels] = useState<string[]>([]);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showLabelManager, setShowLabelManager] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        if (title || content) {
          handleSave();
        } else {
          setIsExpanded(false);
        }
      }
    }
    if (isExpanded) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isExpanded, title, content, type, color, labels]);

  const handleSave = () => {
    if (!title.trim() && !content.trim()) {
      setIsExpanded(false);
      return;
    }
    createNote({
      title,
      content,
      type,
      color,
      labels,
      items: type === 'checklist' ? [] : undefined,
    });
    setTitle('');
    setContent('');
    setType('text');
    setColor('white');
    setLabels([]);
    setIsExpanded(false);
  };

  if (!isExpanded) {
    return (
      <div
        onClick={() => setIsExpanded(true)}
        className="bg-white rounded-lg px-4 py-3 keep-shadow cursor-text hover:keep-shadow-hover transition-shadow"
      >
        <span className="text-gray-500 text-sm">Take a note...</span>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="rounded-lg keep-shadow transition-shadow"
      style={{ backgroundColor: COLOR_MAP[color] }}
    >
      {/* Title */}
      <div className="px-4 pt-3">
        <input
          type="text"
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full bg-transparent outline-none text-sm font-medium text-gray-900 placeholder-gray-500"
          autoFocus
        />
      </div>

      {/* Content */}
      <div className="px-4 py-2">
        {type === 'text' ? (
          <textarea
            placeholder="Take a note..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full bg-transparent outline-none text-sm text-gray-800 placeholder-gray-500 resize-none min-h-[80px]"
            rows={3}
          />
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-gray-500 italic">Checklist items will be added after saving</p>
            <textarea
              placeholder="Add description..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full bg-transparent outline-none text-sm text-gray-800 placeholder-gray-500 resize-none min-h-[40px]"
              rows={2}
            />
          </div>
        )}
      </div>

      {/* Labels display */}
      {labels.length > 0 && (
        <div className="px-4 pb-1 flex flex-wrap gap-1">
          {labels.map(label => (
            <span key={label} className="text-xs px-2 py-0.5 bg-gray-200/60 rounded-full text-gray-700">
              {label}
            </span>
          ))}
        </div>
      )}

      {/* Toolbar */}
      <div className="px-2 py-2 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setType(type === 'text' ? 'checklist' : 'text')}
            className="p-2 rounded-full hover:bg-black/5 text-gray-600 transition-colors"
            title={type === 'text' ? 'Switch to checklist' : 'Switch to text'}
          >
            {type === 'text' ? <CheckSquare size={16} /> : <Type size={16} />}
          </button>
          <button
            onClick={() => setShowColorPicker(!showColorPicker)}
            className="p-2 rounded-full hover:bg-black/5 text-gray-600 transition-colors relative"
            title="Change color"
          >
            <Palette size={16} />
            {showColorPicker && (
              <div className="absolute top-full left-0 mt-1 z-50">
                <ColorPicker
                  selected={color}
                  onSelect={(c) => { setColor(c); setShowColorPicker(false); }}
                  onClose={() => setShowColorPicker(false)}
                />
              </div>
            )}
          </button>
          <button
            onClick={() => setShowLabelManager(!showLabelManager)}
            className="p-2 rounded-full hover:bg-black/5 text-gray-600 transition-colors relative"
            title="Add label"
          >
            <Tag size={16} />
            {showLabelManager && (
              <div className="absolute top-full left-0 mt-1 z-50">
                <LabelManager
                  selected={labels}
                  onChange={setLabels}
                  onClose={() => setShowLabelManager(false)}
                />
              </div>
            )}
          </button>
        </div>

        <button
          onClick={handleSave}
          className="px-4 py-1.5 text-sm font-medium text-gray-700 hover:bg-black/5 rounded-lg transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  );
}
