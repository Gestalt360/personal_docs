import React, { useState } from 'react';
import { useNoteStore } from '../store/noteStore';
import { NoteTemplate, DEFAULT_TEMPLATES, COLOR_MAP, NoteColor } from '../types/note';
import { X, Plus, FileText, Layout, Star } from 'lucide-react';

interface TemplateModalProps {
  onClose: () => void;
}

export default function TemplateModal({ onClose }: TemplateModalProps) {
  const { createNote, saveTemplate, getTemplates } = useNoteStore();
  const [templates, setTemplates] = useState<NoteTemplate[]>([]);
  const [showCustom, setShowCustom] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customTitle, setCustomTitle] = useState('');
  const [customContent, setCustomContent] = useState('');
  const [customType, setCustomType] = useState<'text' | 'checklist'>('text');
  const [customColor, setCustomColor] = useState<string>('white');

  React.useEffect(() => {
    const load = async () => {
      const t = await getTemplates();
      setTemplates(t);
    };
    load();
  }, [getTemplates]);

  const useTemplate = (template: Omit<NoteTemplate, 'id' | 'createdAt'>) => {
    createNote({
      title: template.title,
      content: template.content,
      type: template.type,
      color: template.color,
      labels: template.labels,
      items: template.items,
    });
    onClose();
  };

  const allTemplates = [...DEFAULT_TEMPLATES, ...templates];

  const handleSaveCustom = async () => {
    if (!customName.trim()) return;
    await saveTemplate({
      name: customName,
      title: customTitle,
      content: customContent,
      type: customType,
      color: customColor as any,
      labels: [],
      items: [],
    });
    setCustomName('');
    setCustomTitle('');
    setCustomContent('');
    setShowCustom(false);
    const t = await getTemplates();
    setTemplates(t);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg keep-shadow w-full max-w-[700px] max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800">Choose a Template</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full text-gray-500">
            <X size={18} />
          </button>
        </div>

        {/* Templates grid */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-2 gap-4">
            {allTemplates.map((template, idx) => (
              <button
                key={idx}
                onClick={() => useTemplate(template)}
                className="text-left rounded-lg border border-gray-200 hover:border-amber-300 hover:shadow-md transition-all p-4"
                style={{ backgroundColor: COLOR_MAP[template.color as NoteColor] }}
              >
                <div className="flex items-center gap-2 mb-2">
                  {template.type === 'checklist' ? <Layout size={16} /> : <FileText size={16} />}
                  <span className="font-medium text-sm text-gray-800">{template.name}</span>
                </div>
                <p className="text-xs text-gray-600 line-clamp-2">
                  {template.title || template.content || 'Empty template'}
                </p>
              </button>
            ))}

            {/* Add custom */}
            <button
              onClick={() => setShowCustom(true)}
              className="text-left rounded-lg border-2 border-dashed border-gray-300 hover:border-amber-300 hover:bg-amber-50 transition-all p-4 flex flex-col items-center justify-center gap-2"
            >
              <Plus size={24} className="text-gray-400" />
              <span className="text-sm font-medium text-gray-500">Create Template</span>
            </button>
          </div>

          {/* Custom template form */}
          {showCustom && (
            <div className="mt-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
              <h3 className="font-medium text-sm mb-3">New Template</h3>
              <div className="space-y-3">
                <input
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="Template name"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-amber-300"
                />
                <input
                  type="text"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  placeholder="Default title"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-amber-300"
                />
                <textarea
                  value={customContent}
                  onChange={(e) => setCustomContent(e.target.value)}
                  placeholder="Default content"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-amber-300 resize-none"
                />
                <div className="flex items-center gap-3">
                  <select
                    value={customType}
                    onChange={(e) => setCustomType(e.target.value as any)}
                    className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  >
                    <option value="text">Text</option>
                    <option value="checklist">Checklist</option>
                  </select>
                  <select
                    value={customColor}
                    onChange={(e) => setCustomColor(e.target.value)}
                    className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  >
                    <option value="white">White</option>
                    <option value="red">Red</option>
                    <option value="orange">Orange</option>
                    <option value="yellow">Yellow</option>
                    <option value="green">Green</option>
                    <option value="teal">Teal</option>
                    <option value="blue">Blue</option>
                    <option value="darkblue">Dark Blue</option>
                    <option value="purple">Purple</option>
                    <option value="pink">Pink</option>
                    <option value="brown">Brown</option>
                    <option value="gray">Gray</option>
                  </select>
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setShowCustom(false)}
                    className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveCustom}
                    className="px-4 py-2 text-sm bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors"
                  >
                    Save Template
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
