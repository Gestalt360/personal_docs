import React from 'react';
import { Note, NoteColor, COLOR_MAP, COLOR_NAMES } from '../types/note';

interface ColorPickerProps {
  selected: NoteColor;
  onSelect: (color: NoteColor) => void;
  onClose: () => void;
}

const COLORS: NoteColor[] = [
  'white', 'red', 'orange', 'yellow', 'green', 'teal',
  'blue', 'darkblue', 'purple', 'pink', 'brown', 'gray',
];

export default function ColorPicker({ selected, onSelect, onClose }: ColorPickerProps) {
  return (
    <div className="bg-white rounded-lg keep-shadow p-2">
      <div className="grid grid-cols-4 gap-1">
        {COLORS.map(color => (
          <button
            key={color}
            onClick={() => onSelect(color)}
            className={`w-8 h-8 rounded-full border-2 transition-all hover:scale-110 ${
              selected === color ? 'border-gray-800' : 'border-transparent'
            }`}
            style={{ backgroundColor: COLOR_MAP[color] }}
            title={COLOR_NAMES[color]}
          />
        ))}
      </div>
    </div>
  );
}
