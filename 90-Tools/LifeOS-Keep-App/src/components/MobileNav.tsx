import React from 'react';
import { useNoteStore } from '../store/noteStore';
import { LayoutGrid, Target, Flame, CheckSquare, Bell } from 'lucide-react';

const items = [
  { id: 'notes', icon: LayoutGrid, label: 'Notes' },
  { id: 'goals', icon: Target, label: 'Goals' },
  { id: 'habits', icon: Flame, label: 'Habits' },
  { id: 'projects', icon: CheckSquare, label: 'Projects' },
  { id: 'reminders', icon: Bell, label: 'Reminders' },
];

export default function MobileNav() {
  const { view, setView, setActiveLabel } = useNoteStore();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-gray-200 safe-area-bottom">
      <div className="flex items-center justify-around h-14 px-2">
        {items.map(item => {
          const isActive = view === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => {
                setView(item.id as any);
                setActiveLabel(null);
              }}
              className={`flex flex-col items-center justify-center gap-0.5 px-3 py-1 rounded-lg min-w-[56px] transition-colors ${
                isActive
                  ? 'text-amber-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon size={20} className={isActive ? 'fill-amber-100' : ''} />
              <span className={`text-[10px] font-medium ${isActive ? 'font-semibold' : ''}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
