import React, { useState, useMemo } from 'react';
import { useNoteStore } from '../store/noteStore';
import { Flame, CheckCircle, Circle, Plus, Trash2, Calendar } from 'lucide-react';

export default function HabitTracker() {
  const { notes, createNote, toggleHabitCompletion, deleteNote } = useNoteStore();
  const [newHabitTitle, setNewHabitTitle] = useState('');
  const [showArchived, setShowArchived] = useState(false);

  const habits = useMemo(() =>
    notes.filter(n => n.type === 'habit' && !n.isTrashed && !n.isArchived)
      .sort((a, b) => (b.streak || 0) - (a.streak || 0)),
    [notes]
  );

  const archivedHabits = useMemo(() =>
    notes.filter(n => n.type === 'habit' && n.isArchived),
    [notes]
  );

  const handleAddHabit = async () => {
    if (!newHabitTitle.trim()) return;
    await createNote({
      title: newHabitTitle.trim(),
      type: 'habit',
      color: 'green',
      labels: ['03. Wellness Indicators'],
      recurrence: { rule: 'FREQ=DAILY' },
      streak: 0,
      bestStreak: 0,
    });
    setNewHabitTitle('');
  };

  const today = new Date().toISOString().split('T')[0];

  const isDoneToday = (note: any): boolean => {
    if (!note.completedAt) return false;
    return note.completedAt.includes(today);
  };

  const getStreakFlames = (streak: number) => {
    if (streak === 0) return '🔥';
    if (streak < 3) return '🔥';
    if (streak < 7) return '🔥🔥';
    if (streak < 14) return '🔥🔥🔥';
    if (streak < 30) return '🔥🔥🔥🔥';
    if (streak < 60) return '🔥🔥🔥🔥🔥';
    return '🔥🔥🔥🔥🔥🔥';
  };

  const getStreakColor = (streak: number) => {
    if (streak === 0) return 'text-gray-400';
    if (streak < 3) return 'text-orange-400';
    if (streak < 7) return 'text-orange-500';
    if (streak < 14) return 'text-orange-600';
    if (streak < 30) return 'text-orange-700';
    return 'text-red-500';
  };

  return (
    <div className="w-full">
      {/* Add habit */}
      <div className="flex items-center gap-2 mb-4">
        <input
          type="text"
          value={newHabitTitle}
          onChange={(e) => setNewHabitTitle(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAddHabit()}
          placeholder="New habit..."
          className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-green-300 focus:ring-1 focus:ring-green-200"
        />
        <button
          onClick={handleAddHabit}
          className="p-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors"
        >
          <Plus size={16} />
        </button>
      </div>

      {/* Habits list */}
      {habits.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <Flame size={48} strokeWidth={1} className="mx-auto mb-3 text-gray-300" />
          <p className="text-sm font-medium">No habits tracked yet</p>
          <p className="text-xs mt-1">Add a habit above to start tracking your streaks</p>
        </div>
      )}

      <div className="space-y-2">
        {habits.map(habit => {
          const done = isDoneToday(habit);
          const streak = habit.streak || 0;
          const bestStreak = habit.bestStreak || 0;

          return (
            <div
              key={habit.id}
              className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-100 hover:border-green-200 hover:shadow-sm transition-all group"
            >
              {/* Check-in button */}
              <button
                onClick={() => toggleHabitCompletion(habit.id)}
                className={`shrink-0 transition-all ${done ? 'scale-110' : 'hover:scale-110'}`}
                title={done ? 'Mark as not done today' : 'Mark as done today'}
              >
                {done ? (
                  <CheckCircle size={24} className="text-green-500" fill="#22c55e" />
                ) : (
                  <Circle size={24} className="text-gray-300 hover:text-green-400" />
                )}
              </button>

              {/* Habit info */}
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium truncate ${done ? 'text-gray-500 line-through' : 'text-gray-800'}`}>
                  {habit.title}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  {/* Streak */}
                  <span className={`flex items-center gap-0.5 text-xs font-semibold ${getStreakColor(streak)}`}>
                    {getStreakFlames(streak)}
                    <span>{streak} day{streak !== 1 ? 's' : ''}</span>
                  </span>
                  {/* Best streak */}
                  {bestStreak > 0 && (
                    <span className="text-[10px] text-gray-400">
                      Best: {bestStreak}
                    </span>
                  )}
                  {/* Frequency */}
                  <span className="text-[10px] text-gray-400 ml-auto">
                    {habit.recurrence?.rule === 'FREQ=DAILY' ? 'Daily' : habit.recurrence?.rule || 'Daily'}
                  </span>
                </div>
              </div>

              {/* Delete */}
              <button
                onClick={() => deleteNote(habit.id)}
                className="p-1 text-gray-200 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                title="Delete habit"
              >
                <Trash2 size={14} />
              </button>
            </div>
          );
        })}
      </div>

      {/* Archived habits toggle */}
      {archivedHabits.length > 0 && (
        <div className="mt-4 pt-3 border-t border-gray-100">
          <button
            onClick={() => setShowArchived(!showArchived)}
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            {showArchived ? 'Hide' : 'Show'} archived habits ({archivedHabits.length})
          </button>
          {showArchived && archivedHabits.map(habit => (
            <div key={habit.id} className="flex items-center gap-2 py-1.5 opacity-50">
              <CheckCircle size={14} className="text-gray-400" />
              <span className="text-xs text-gray-500 line-through">{habit.title}</span>
              <span className="text-[10px] text-gray-400">Streak: {habit.streak || 0}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
