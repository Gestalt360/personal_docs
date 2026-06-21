import React, { useState, useEffect } from 'react';
import { useNoteStore } from '../store/noteStore';
import { CheckSquare, Bell, Calendar, Clock, X, ExternalLink, RefreshCw, AlertCircle } from 'lucide-react';

export default function TasksPanel() {
  const { listTasks, createTask, deleteTask, updateTask, checkAuth } = useNoteStore();
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [authStatus, setAuthStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');
  const [newTaskTitle, setNewTaskTitle] = useState('');

  const checkAuthStatus = async () => {
    const result = await checkAuth();
    setAuthStatus(result.authenticated ? 'connected' : 'disconnected');
  };

  const loadTasks = async () => {
    setLoading(true);
    const result = await listTasks();
    if (result.success && result.tasks) {
      setTasks(Array.isArray(result.tasks) ? result.tasks : []);
    }
    setLoading(false);
  };

  useEffect(() => {
    checkAuthStatus();
  }, []);

  useEffect(() => {
    if (authStatus === 'connected') loadTasks();
  }, [authStatus]);

  const handleAddTask = async () => {
    if (!newTaskTitle.trim()) return;
    await createTask({ title: newTaskTitle.trim() });
    setNewTaskTitle('');
    loadTasks();
  };

  const handleToggleTask = async (task: any) => {
    const newStatus = task.status === 'completed' ? 'needsAction' : 'completed';
    await updateTask(task.id, { status: newStatus });
    loadTasks();
  };

  const handleDelete = async (taskId: string) => {
    await deleteTask(taskId);
    loadTasks();
  };

  if (authStatus === 'disconnected') {
    return (
      <div className="px-4 py-4 border-t border-gray-100">
        <div className="flex items-center gap-2 text-amber-600 mb-2">
          <AlertCircle size={14} />
          <span className="text-xs font-semibold uppercase">Google Tasks</span>
        </div>
        <p className="text-xs text-gray-500 mb-2">
          Authenticate gws to sync reminders with Google Tasks
        </p>
        <button
          onClick={checkAuth}
          className="text-xs px-3 py-1.5 bg-amber-50 text-amber-700 rounded-lg hover:bg-amber-100 transition-colors"
        >
          <RefreshCw size={12} className="inline mr-1" />
          Check Connection
        </button>
      </div>
    );
  }

  return (
    <div className="px-4 py-4 border-t border-gray-100">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-gray-600">
          <CheckSquare size={14} />
          <span className="text-xs font-semibold uppercase">Google Tasks</span>
        </div>
        <button
          onClick={loadTasks}
          className="p-1 hover:bg-gray-100 rounded text-gray-400"
          title="Refresh"
        >
          <RefreshCw size={12} />
        </button>
      </div>

      {/* Add task */}
      <div className="flex items-center gap-1 mb-2">
        <input
          type="text"
          value={newTaskTitle}
          onChange={(e) => setNewTaskTitle(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
          placeholder="Add task..."
          className="flex-1 text-xs px-2 py-1.5 border border-gray-200 rounded outline-none focus:border-amber-300"
        />
      </div>

      {/* Task list */}
      <div className="max-h-40 overflow-y-auto space-y-1">
        {tasks.length === 0 && !loading && (
          <p className="text-xs text-gray-400 italic">No tasks</p>
        )}
        {loading && (
          <p className="text-xs text-gray-400 italic">Loading...</p>
        )}
        {tasks.slice(0, 10).map((task: any) => (
          <div key={task.id} className="flex items-center gap-2 group">
            <button
              onClick={() => handleToggleTask(task)}
              className={`shrink-0 w-3.5 h-3.5 rounded border ${
                task.status === 'completed'
                  ? 'bg-green-500 border-green-500'
                  : 'border-gray-400 hover:border-gray-600'
              } flex items-center justify-center`}
            >
              {task.status === 'completed' && (
                <span className="text-white text-[8px]">✓</span>
              )}
            </button>
            <span className={`flex-1 text-xs truncate ${
              task.status === 'completed' ? 'line-through text-gray-400' : 'text-gray-700'
            }`}>
              {task.title}
            </span>
            {task.due && (
              <span className="text-[10px] text-amber-600 shrink-0">
                {new Date(task.due).toLocaleDateString()}
              </span>
            )}
            <button
              onClick={() => handleDelete(task.id)}
              className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-gray-100 rounded text-gray-400 transition-all"
            >
              <X size={10} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
