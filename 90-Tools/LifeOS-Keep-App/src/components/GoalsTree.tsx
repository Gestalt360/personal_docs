import React, { useState, useMemo } from 'react';
import { useNoteStore } from '../store/noteStore';
import { COLOR_MAP, RATING_COLORS, type Note, type CompletionRating, type TaskStatus } from '../types/note';
import {
  Target, ChevronRight, ChevronDown, Plus, Circle, CheckCircle,
  XCircle, Clock, Flame, GripVertical, Trash2, Flag
} from 'lucide-react';

interface GoalsTreeProps {
  onEditNote: (id: string) => void;
}

const TYPE_ICONS: Record<string, React.ReactNode> = {
  'vision': <Target size={16} className="text-purple-600" />,
  '3-5-year-goal': <Flag size={16} className="text-blue-600" />,
  'annual-goal': <Flag size={16} className="text-teal-600" />,
  'quarterly-goal': <Clock size={16} className="text-orange-500" />,
  'monthly-goal': <Clock size={16} className="text-amber-500" />,
  'weekly-goal': <Clock size={16} className="text-yellow-500" />,
  'daily-goal': <Circle size={16} className="text-green-500" />,
  'project': <Target size={16} className="text-indigo-500" />,
  'task': <CheckCircle size={16} className="text-gray-500" />,
};

const TYPE_LABELS: Record<string, string> = {
  'vision': 'Vision / Mission',
  '3-5-year-goal': '3-5 Year Goal',
  'annual-goal': 'Annual Goal',
  'quarterly-goal': 'Quarterly Goal',
  'monthly-goal': 'Monthly Goal',
  'weekly-goal': 'Weekly Goal',
  'daily-goal': 'Daily Goal',
  'project': 'Project',
  'task': 'Task',
};

function CompletionBadge({ note, onToggle, onRate }: {
  note: Note;
  onToggle: () => void;
  onRate: (r: CompletionRating) => void;
}) {
  const ratings: CompletionRating[] = ['orange', 'yellow', 'lightgreen', 'darkgreen'];
  const colors = { orange: '#fbbc04', yellow: '#fff475', lightgreen: '#ccff90', darkgreen: '#4caf50' };

  if (note.status === 'completed') {
    return (
      <div className="flex items-center gap-1">
        <button onClick={onToggle} className="hover:opacity-70" title="Mark not done">
          <CheckCircle size={16} className="text-green-600" />
        </button>
        <div className="flex gap-0.5">
          {ratings.map(r => (
            <button
              key={r}
              onClick={(e) => { e.stopPropagation(); onRate(r); }}
              className={`w-3 h-3 rounded-full border border-gray-300 transition-transform hover:scale-125 ${note.completedRating === r ? 'ring-1 ring-gray-800 scale-110' : ''}`}
              style={{ backgroundColor: colors[r] }}
              title={`Rate: ${r}`}
            />
          ))}
        </div>
      </div>
    );
  }

  if (note.status === 'not_done') {
    return (
      <button onClick={onToggle} className="hover:opacity-70" title="Mark pending">
        <XCircle size={16} className="text-red-500" />
      </button>
    );
  }

  return (
    <button onClick={onToggle} className="hover:opacity-70" title="Mark complete">
      <Circle size={16} className="text-gray-400 hover:text-green-500" />
    </button>
  );
}

function ProgressBar({ progress }: { progress: number }) {
  const color = progress >= 100 ? 'bg-green-500' : progress >= 50 ? 'bg-amber-500' : 'bg-blue-500';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${Math.min(progress, 100)}%` }} />
      </div>
      <span className="text-[10px] font-mono text-gray-500 w-7 text-right">{progress}%</span>
    </div>
  );
}

function TreeNode({ note, depth = 0, onEditNote, onRefresh }: {
  note: Note;
  depth: number;
  onEditNote: (id: string) => void;
  onRefresh: () => void;
}) {
  const { updateStatus, updateRating, toggleCompletion, createNote, rollupProgress } = useNoteStore();
  const [expanded, setExpanded] = useState(depth < 3);
  const [showAddChild, setShowAddChild] = useState(false);
  const [childType, setChildType] = useState(getDefaultChildType(note.type));

  const children = useMemo(() => {
    // This would ideally come from a getChildren selector, but we use the flat notes array with filter
    return []; // Placeholder — we pass children via the tree structure from getTree()
  }, []);

  const progress = rollupProgress(note.id);
  const childTypes = getAvailableChildTypes(note.type);
  const indent = depth * 20;

  return (
    <div className="select-none">
      <div
        className={`flex items-center gap-1.5 py-1.5 px-2 rounded-lg hover:bg-gray-50 cursor-pointer group transition-colors ${depth === 0 ? 'bg-gray-50 border-l-2 border-amber-400' : ''}`}
        style={{ marginLeft: indent }}
        onClick={() => onEditNote(note.id)}
      >
        {/* Expand/collapse */}
        <button
          onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
          className="p-0.5 text-gray-400 hover:text-gray-700"
        >
          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>

        {/* Type icon */}
        <span className="shrink-0">{TYPE_ICONS[note.type] || TYPE_ICONS['task']}</span>

        {/* Title */}
        <span className={`flex-1 text-sm truncate ${note.status === 'completed' ? 'line-through text-gray-400' : note.status === 'not_done' ? 'text-red-600' : 'text-gray-800'}`}>
          {note.title || 'Untitled'}
        </span>

        {/* Type label */}
        <span className="text-[10px] text-gray-400 uppercase hidden md:inline">{TYPE_LABELS[note.type] || note.type}</span>

        {/* Due date */}
        {note.dueDate && (
          <span className="text-[10px] text-amber-600 ml-1">
            {new Date(note.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
          </span>
        )}

        {/* Completion badge */}
        <CompletionBadge note={note} onToggle={() => toggleCompletion(note.id)} onRate={(r) => updateRating(note.id, r)} />

        {/* Add child */}
        {childTypes.length > 0 && (
          <button
            onClick={(e) => { e.stopPropagation(); setShowAddChild(!showAddChild); }}
            className="p-0.5 text-gray-300 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-all"
            title={`Add ${childTypes[0].label}`}
          >
            <Plus size={14} />
          </button>
        )}
      </div>

      {/* Progress bar (indented) */}
      <div style={{ marginLeft: indent + 24 }} className="px-2 pb-1">
        <ProgressBar progress={progress} />
      </div>

      {/* Add child form */}
      {showAddChild && (
        <div style={{ marginLeft: indent + 24 }} className="px-2 pb-2">
          <div className="flex items-center gap-1 bg-white rounded-lg border border-gray-200 p-1">
            <select
              value={childType}
              onChange={(e) => setChildType(e.target.value)}
              className="text-xs px-1 py-1 border-0 outline-none bg-transparent text-gray-600"
            >
              {childTypes.map(ct => (
                <option key={ct.value} value={ct.value}>{ct.label}</option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Title..."
              className="flex-1 text-xs px-2 py-1 border-0 outline-none"
              onKeyDown={async (e) => {
                if (e.key === 'Enter' && (e.target as HTMLInputElement).value.trim()) {
                  await createNote({
                    title: (e.target as HTMLInputElement).value.trim(),
                    type: childType as any,
                    parentId: note.id,
                    color: 'white',
                    labels: [],
                  });
                  (e.target as HTMLInputElement).value = '';
                  setShowAddChild(false);
                  // Refresh the tree
                  setTimeout(onRefresh, 100);
                }
              }}
              autoFocus
            />
            <button
              onClick={() => setShowAddChild(false)}
              className="text-xs px-2 py-1 text-gray-400 hover:text-gray-600"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function getDefaultChildType(parentType: string): string {
  const hierarchy: Record<string, string> = {
    'vision': '3-5-year-goal',
    '3-5-year-goal': 'annual-goal',
    'annual-goal': 'quarterly-goal',
    'quarterly-goal': 'monthly-goal',
    'monthly-goal': 'weekly-goal',
    'weekly-goal': 'daily-goal',
    'daily-goal': 'task',
    'project': 'task',
    'task': 'task',
  };
  return hierarchy[parentType] || 'task';
}

function getAvailableChildTypes(parentType: string): { value: string; label: string }[] {
  const hierarchy: Record<string, { value: string; label: string }[]> = {
    'vision': [
      { value: '3-5-year-goal', label: '3-5 Year Goal' },
      { value: 'annual-goal', label: 'Annual Goal' },
      { value: 'project', label: 'Project' },
    ],
    '3-5-year-goal': [
      { value: 'annual-goal', label: 'Annual Goal' },
      { value: 'project', label: 'Project' },
      { value: 'task', label: 'Task' },
    ],
    'annual-goal': [
      { value: 'quarterly-goal', label: 'Quarterly Goal' },
      { value: 'project', label: 'Project' },
      { value: 'task', label: 'Task' },
    ],
    'quarterly-goal': [
      { value: 'monthly-goal', label: 'Monthly Goal' },
      { value: 'project', label: 'Project' },
      { value: 'task', label: 'Task' },
    ],
    'monthly-goal': [
      { value: 'weekly-goal', label: 'Weekly Goal' },
      { value: 'task', label: 'Task' },
    ],
    'weekly-goal': [
      { value: 'daily-goal', label: 'Daily Goal' },
      { value: 'task', label: 'Task' },
    ],
    'daily-goal': [
      { value: 'task', label: 'Task' },
    ],
    'project': [
      { value: 'task', label: 'Task' },
    ],
    'task': [],
  };
  return hierarchy[parentType] || [];
}

export default function GoalsTree({ onEditNote }: GoalsTreeProps) {
  const { getTree, createNote, loadNotes } = useNoteStore();
  const [refreshKey, setRefreshKey] = useState(0);

  const tree = useMemo(() => {
    return getTree().filter(n => n.type === 'vision' || n.type === '3-5-year-goal');
  }, [refreshKey, getTree]);

  const triggerRefresh = () => {
    loadNotes().then(() => setRefreshKey(k => k + 1));
  };

  const renderNode = (node: any, depth: number = 0) => {
    return (
      <div key={node.id}>
        <TreeNode note={node} depth={depth} onEditNote={onEditNote} onRefresh={triggerRefresh} />
        {node.children && node.children.length > 0 && (
          <div>
            {node.children.map((child: any) => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-full">
      {/* Quick-add top-level */}
      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={async () => {
            await createNote({
              title: 'New Vision / Mission',
              type: 'vision',
              color: 'white',
              labels: ['01. Goals & Plans'],
            });
            triggerRefresh();
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-purple-700 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
        >
          <Plus size={12} /> Vision
        </button>
        <button
          onClick={async () => {
            await createNote({
              title: 'New 3-5 Year Goal',
              type: '3-5-year-goal',
              color: 'blue',
              labels: ['01. Goals & Plans'],
            });
            triggerRefresh();
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
        >
          <Plus size={12} /> 3-5 Year Goal
        </button>
        <button
          onClick={async () => {
            await createNote({
              title: 'New Project',
              type: 'project',
              color: 'gray',
              labels: ['02. Readiness (Educ., Skills, & Traits)'],
            });
            triggerRefresh();
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-700 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
        >
          <Plus size={12} /> Project
        </button>
      </div>

      {/* Tree */}
      {tree.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <Target size={48} strokeWidth={1} className="mx-auto mb-3 text-gray-300" />
          <p className="text-sm font-medium">No goals defined yet</p>
          <p className="text-xs mt-1">Start by creating a Vision / Mission or a 3-5 Year Goal</p>
        </div>
      ) : (
        <div className="space-y-1">
          {tree.map((node: any) => renderNode(node))}
        </div>
      )}
    </div>
  );
}
