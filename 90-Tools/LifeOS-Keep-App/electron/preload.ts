import { contextBridge, ipcRenderer } from 'electron';

export interface IElectronAPI {
  note: {
    getAll: () => Promise<any[]>;
    get: (id: string) => Promise<any>;
    create: (note: any) => Promise<any>;
    update: (note: any) => Promise<any>;
    delete: (id: string) => Promise<any>;
    archive: (id: string) => Promise<any>;
    unarchive: (id: string) => Promise<any>;
    trash: (id: string) => Promise<any>;
    restore: (id: string) => Promise<any>;
    pin: (id: string) => Promise<any>;
    search: (query: string) => Promise<any[]>;
    getByLabel: (label: string) => Promise<any[]>;
    getByColor: (color: string) => Promise<any[]>;
    getLabels: () => Promise<string[]>;
    saveTemplate: (template: any) => Promise<any>;
    getTemplates: () => Promise<any[]>;
    deleteTemplate: (id: string) => Promise<any>;
    getReminders: () => Promise<any[]>;
  };
  sync: {
    exportToMarkdown: (targetPath: string) => Promise<{ success: boolean; error?: string }>;
    importFromMarkdown: (sourcePath: string) => Promise<{ success: boolean; imported?: number; error?: string }>;
  };
  tasks: {
    create: (params: { title: string; due?: string; notes?: string }) => Promise<{ success: boolean; task?: any; error?: string }>;
    list: () => Promise<{ success: boolean; tasks?: any[]; error?: string }>;
    delete: (taskId: string) => Promise<{ success: boolean; error?: string }>;
    update: (taskId: string, updates: any) => Promise<{ success: boolean; task?: any; error?: string }>;
    checkAuth: () => Promise<{ authenticated: boolean }>;
  };
  dialog: {
    selectFolder: () => Promise<string | null>;
  };
  app: {
    getPath: (name: string) => Promise<string>;
    getVersion: () => Promise<string>;
  };
}

const api: IElectronAPI = {
  note: {
    getAll: () => ipcRenderer.invoke('note:getAll'),
    get: (id) => ipcRenderer.invoke('note:get', id),
    create: (note) => ipcRenderer.invoke('note:create', note),
    update: (note) => ipcRenderer.invoke('note:update', note),
    delete: (id) => ipcRenderer.invoke('note:delete', id),
    archive: (id) => ipcRenderer.invoke('note:archive', id),
    unarchive: (id) => ipcRenderer.invoke('note:unarchive', id),
    trash: (id) => ipcRenderer.invoke('note:trash', id),
    restore: (id) => ipcRenderer.invoke('note:restore', id),
    pin: (id) => ipcRenderer.invoke('note:pin', id),
    search: (query) => ipcRenderer.invoke('note:search', query),
    getByLabel: (label) => ipcRenderer.invoke('note:getByLabel', label),
    getByColor: (color) => ipcRenderer.invoke('note:getByColor', color),
    getLabels: () => ipcRenderer.invoke('note:getLabels'),
    saveTemplate: (template) => ipcRenderer.invoke('note:saveTemplate', template),
    getTemplates: () => ipcRenderer.invoke('note:getTemplates'),
    deleteTemplate: (id) => ipcRenderer.invoke('note:deleteTemplate', id),
    getReminders: () => ipcRenderer.invoke('note:getReminders'),
  },
  sync: {
    exportToMarkdown: (targetPath) => ipcRenderer.invoke('sync:exportToMarkdown', targetPath),
    importFromMarkdown: (sourcePath) => ipcRenderer.invoke('sync:importFromMarkdown', sourcePath),
  },
  tasks: {
    create: (params) => ipcRenderer.invoke('tasks:create', params),
    list: () => ipcRenderer.invoke('tasks:list'),
    delete: (taskId) => ipcRenderer.invoke('tasks:delete', taskId),
    update: (taskId, updates) => ipcRenderer.invoke('tasks:update', { taskId, updates }),
    checkAuth: () => ipcRenderer.invoke('tasks:checkAuth'),
  },
  dialog: {
    selectFolder: () => ipcRenderer.invoke('dialog:selectFolder'),
  },
  app: {
    getPath: (name) => ipcRenderer.invoke('app:getPath', name),
    getVersion: () => ipcRenderer.invoke('app:getVersion'),
  },
};

contextBridge.exposeInMainWorld('electronAPI', api);
