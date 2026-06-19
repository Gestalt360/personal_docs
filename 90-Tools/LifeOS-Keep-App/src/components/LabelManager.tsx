import React, { useState } from 'react';
import { useNoteStore } from '../store/noteStore';
import { X, Plus, Tag } from 'lucide-react';

interface LabelManagerProps {
  selected: string[];
  onChange: (labels: string[]) => void;
  onClose: () => void;
}

export default function LabelManager({ selected, onChange, onClose }: LabelManagerProps) {
  const { labels: allLabels } = useNoteStore();
  const [newLabel, setNewLabel] = useState('');

  const toggleLabel = (label: string) => {
    if (selected.includes(label)) {
      onChange(selected.filter(l => l !== label));
    } else {
      onChange([...selected, label]);
    }
  };

  const addNewLabel = () => {
    if (!newLabel.trim()) return;
    const label = newLabel.trim();
    if (!selected.includes(label)) {
      onChange([...selected, label]);
    }
    setNewLabel('');
  };

  return (
    <div className="bg-white rounded-lg keep-shadow p-3 w-48">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-gray-500 uppercase">Label note</span>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <X size={14} />
        </button>
      </div>

      <div className="flex items-center gap-1 mb-2">
        <input
          type="text"
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addNewLabel()}
          placeholder="New label"
          className="flex-1 text-xs px-2 py-1 border border-gray-200 rounded outline-none focus:border-amber-300"
        />
        <button onClick={addNewLabel} className="p-1 hover:bg-gray-100 rounded text-gray-600">
          <Plus size={14} />
        </button>
      </div>

      <div className="max-h-32 overflow-y-auto space-y-0.5">
        {allLabels.map(label => (
          <button
            key={label}
            onClick={() => toggleLabel(label)}
            className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm transition-colors ${
              selected.includes(label) ? 'bg-amber-50 text-amber-900' : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Tag size={12} />
            <span className="truncate">{label}</span>
          </button>
        ))}
        {allLabels.length === 0 && (
          <p className="text-xs text-gray-400 px-2 py-1">No existing labels</p>
        )}
      </div>
    </div>
  );
}
