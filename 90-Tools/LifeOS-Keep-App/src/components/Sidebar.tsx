import React from 'react';
import { useNoteStore } from '../store/noteStore';
import TasksPanel from './TasksPanel';
import {
  Lightbulb,
  Bell,
  Archive,
  Trash2,
  Settings,
  Plus,
  LayoutGrid,
  Tag,
  ChevronDown,
  ChevronRight,
  Download,
  Upload,
  FolderOpen,
} from 'lucide-react';

interface SidebarProps {
  onTemplateClick: () => void;
}

export default function Sidebar({ onTemplateClick }: SidebarProps) {
  const { view, labels, activeLabel, setView, setActiveLabel, selectFolder, exportToMarkdown, importFromMarkdown, gitSync } = useNoteStore();
  const [showLabels, setShowLabels] = React.useState(true);
  const [showSync, setShowSync] = React.useState(false);

  const handleExport = async () => {
    const path = await selectFolder();
    if (path) {
      const result = await exportToMarkdown(path);
      if (result.success) {
        alert('Notes exported successfully!');
      } else {
        alert('Export failed: ' + result.error);
      }
    }
  };

  const handleImport = async () => {
    const path = await selectFolder();
    if (path) {
      const result = await importFromMarkdown(path);
      if (result.success) {
        alert(`Imported ${result.imported} notes!`);
      } else {
        alert('Import failed: ' + result.error);
      }
    }
  };

  const navItem = (id: string, icon: React.ReactNode, label: string, isActive: boolean, onClick: () => void) => (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
        isActive
          ? 'bg-amber-100 text-amber-900'
          : 'text-gray-700 hover:bg-gray-200'
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );

  return (
    <div className="w-[280px] bg-white border-r border-gray-200 flex flex-col h-full shrink-0">
      {/* Logo */}
      <div className="px-4 py-4 flex items-center gap-3">
        <div className="w-8 h-8 bg-amber-400 rounded-lg flex items-center justify-center">
          <Lightbulb size={18} className="text-white" />
        </div>
        <span className="font-bold text-lg text-gray-800">LifeOS Keep</span>
      </div>

      {/* New Note Button */}
      <div className="px-4 mb-2">
        <button
          onClick={onTemplateClick}
          className="w-full flex items-center justify-center gap-2 bg-white border border-gray-300 rounded-full py-2.5 px-4 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:shadow-sm transition-all keep-shadow"
        >
          <Plus size={16} />
          New Note
        </button>
      </div>

      {/* Navigation */}
      <div className="px-2 py-2 space-y-0.5">
        {navItem('notes', <LayoutGrid size={18} />, 'Notes', view === 'notes' && !activeLabel, () => { setView('notes'); setActiveLabel(null); })}
        {navItem('reminders', <Bell size={18} />, 'Reminders', view === 'reminders', () => setView('reminders'))}
        {navItem('archive', <Archive size={18} />, 'Archive', view === 'archive', () => setView('archive'))}
        {navItem('trash', <Trash2 size={18} />, 'Trash', view === 'trash', () => setView('trash'))}
      </div>

      {/* Labels */}
      <div className="px-2 py-2">
        <button
          onClick={() => setShowLabels(!showLabels)}
          className="w-full flex items-center justify-between px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:bg-gray-100 rounded-lg"
        >
          <span>Labels</span>
          {showLabels ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>
        {showLabels && (
          <div className="mt-1 space-y-0.5">
            {labels.length === 0 && (
              <p className="px-4 py-2 text-sm text-gray-400 italic">No labels yet</p>
            )}
            {labels.map(label => (
              <button
                key={label}
                onClick={() => setActiveLabel(activeLabel === label ? null : label)}
                className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg text-sm transition-colors ${
                  activeLabel === label
                    ? 'bg-amber-100 text-amber-900'
                    : 'text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Tag size={16} />
                <span className="truncate">{label}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Google Tasks */}
      <TasksPanel />

      {/* Sync */}
      <div className="px-2 py-2 mt-auto border-t border-gray-100">
        <button
          onClick={() => setShowSync(!showSync)}
          className="w-full flex items-center justify-between px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:bg-gray-100 rounded-lg"
        >
          <span>Sync</span>
          {showSync ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>
        {showSync && (
          <div className="mt-1 space-y-0.5">
            <button
              onClick={handleExport}
              className="w-full flex items-center gap-3 px-4 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-200 transition-colors"
            >
              <Download size={16} />
              Export to Markdown
            </button>
            <button
              onClick={handleImport}
              className="w-full flex items-center gap-3 px-4 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-200 transition-colors"
            >
              <Upload size={16} />
              Import from Markdown
            </button>
            <button
              onClick={async () => {
                const result = await gitSync();
                if (result.success) {
                  alert('Notes synced to GitHub successfully!\n' + (result.message || ''));
                } else {
                  alert('GitHub sync failed: ' + (result.error || 'Unknown error'));
                }
              }}
              className="w-full flex items-center gap-3 px-4 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-200 transition-colors"
            >
              <FolderOpen size={16} />
              Sync to GitHub
            </button>
          </div>
        )}
      </div>
    </div>
  );
}