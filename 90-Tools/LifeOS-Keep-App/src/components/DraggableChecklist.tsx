import React, { useState, useCallback } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Check, Plus, X, ChevronRight, ChevronDown, GripVertical } from 'lucide-react';
import type { NoteItem } from '../types/note';

interface DraggableChecklistProps {
  items: NoteItem[];
  onChange: (items: NoteItem[]) => void;
}

export default function DraggableChecklist({ items, onChange }: DraggableChecklistProps) {
  const [newItemText, setNewItemText] = useState('');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleItem = (id: string) => {
    const updated = items.map(item =>
      item.id === id ? { ...item, checked: !item.checked } : item
    );
    onChange(updated);
  };

  const addItem = () => {
    if (!newItemText.trim()) return;
    const newItem: NoteItem = {
      id: `item-${Date.now()}`,
      text: newItemText,
      checked: false,
      parentId: null,
      children: [],
      collapsed: false,
      depth: 0,
    };
    onChange([...items, newItem]);
    setNewItemText('');
  };

  const addSubItem = (parentId: string) => {
    const parent = items.find(i => i.id === parentId);
    if (!parent) return;
    const newItem: NoteItem = {
      id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      text: 'New sub-task',
      checked: false,
      parentId,
      children: [],
      collapsed: false,
      depth: (parent.depth || 0) + 1,
    };
    onChange([...items, newItem]);
    setExpandedIds(prev => new Set(prev).add(parentId));
  };

  const removeItem = (id: string) => {
    const updated = items.filter(item => item.id !== id && item.parentId !== id);
    onChange(updated);
  };

  const updateText = (id: string, text: string) => {
    const updated = items.map(item =>
      item.id === id ? { ...item, text } : item
    );
    onChange(updated);
  };

  const onDragEnd = (result: any) => {
    if (!result.destination) return;
    const sourceIdx = result.source.index;
    const destIdx = result.destination.index;
    if (sourceIdx === destIdx) return;

    const reordered = Array.from(items);
    const [removed] = reordered.splice(sourceIdx, 1);
    reordered.splice(destIdx, 0, removed);
    onChange(reordered);
  };

  const topLevelItems = items.filter(i => !i.parentId);
  const getChildren = (parentId: string) => items.filter(i => i.parentId === parentId);

  const renderItem = (item: NoteItem, index: number) => {
    const children = getChildren(item.id);
    const isExpanded = expandedIds.has(item.id);
    const indentClass = item.depth ? `ml-${Math.min(item.depth * 4, 12)}` : '';

    return (
      <Draggable key={item.id} draggableId={item.id} index={index}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            className={`${snapshot.isDragging ? 'opacity-50' : ''}`}
          >
            <div className={`flex items-center gap-1 group py-1 ${indentClass}`}>
              <div {...provided.dragHandleProps} className="cursor-grab text-gray-400 hover:text-gray-600">
                <GripVertical size={14} />
              </div>
              {children.length > 0 && (
                <button
                  onClick={() => toggleExpand(item.id)}
                  className="text-gray-400 hover:text-gray-600 p-0.5"
                >
                  {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </button>
              )}
              <button
                onClick={() => toggleItem(item.id)}
                className={`shrink-0 w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                  item.checked ? 'bg-gray-600 border-gray-600' : 'border-gray-400 hover:border-gray-600'
                }`}
              >
                {item.checked && <Check size={10} className="text-white" />}
              </button>
              <input
                type="text"
                value={item.text}
                onChange={(e) => updateText(item.id, e.target.value)}
                className={`flex-1 bg-transparent outline-none text-sm ${
                  item.checked ? 'strikethrough text-gray-500' : 'text-gray-800'
                }`}
              />
              <button
                onClick={() => addSubItem(item.id)}
                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-black/5 rounded text-gray-400 transition-all"
                title="Add sub-task"
              >
                <Plus size={12} />
              </button>
              <button
                onClick={() => removeItem(item.id)}
                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-black/5 rounded text-gray-400 transition-all"
              >
                <X size={12} />
              </button>
            </div>
            {isExpanded && children.map((child, ci) => renderItem(child, ci))}
          </div>
        )}
      </Draggable>
    );
  };

  return (
    <div className="space-y-1">
      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="checklist">
          {(provided) => (
            <div ref={provided.innerRef} {...provided.droppableProps}>
              {topLevelItems.map((item, i) => renderItem(item, i))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
      <div className="flex items-center gap-2 mt-2">
        <button
          onClick={addItem}
          className="p-1 rounded-full hover:bg-black/5 text-gray-500"
        >
          <Plus size={16} />
        </button>
        <input
          type="text"
          value={newItemText}
          onChange={(e) => setNewItemText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addItem()}
          placeholder="Add item"
          className="flex-1 bg-transparent outline-none text-sm text-gray-800 placeholder-gray-500"
        />
      </div>
    </div>
  );
}
