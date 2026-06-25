import React from 'react';
import { render, screen } from '@testing-library/react';
import { NoteStoreProvider } from '../store/noteStore';
import type { PlatformAPI } from '../store/platform';

// Minimal mock platform
const mockPlatform = {
  storage: {
    getAll: vi.fn().mockResolvedValue([]),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    archive: vi.fn(),
    unarchive: vi.fn(),
    trash: vi.fn(),
    restore: vi.fn(),
    pin: vi.fn(),
    search: vi.fn(),
    getByLabel: vi.fn(),
    getByColor: vi.fn(),
    getLabels: vi.fn().mockResolvedValue([]),
    getReminders: vi.fn().mockResolvedValue([]),
    getChildren: vi.fn(),
    getDescendants: vi.fn(),
    getAncestors: vi.fn(),
    saveTemplate: vi.fn(),
    getTemplates: vi.fn().mockResolvedValue([]),
    deleteTemplate: vi.fn(),
  },
  tasks: {
    create: vi.fn(),
    list: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    checkAuth: vi.fn(),
  },
  sync: {
    exportToMarkdown: vi.fn(),
    importFromMarkdown: vi.fn(),
  },
  dialog: {
    selectFolder: vi.fn(),
    getAppPath: vi.fn(),
    getVersion: vi.fn(),
  },
} as unknown as PlatformAPI;

test('NoteStoreProvider renders children without error', async () => {
  render(
    <NoteStoreProvider platform={mockPlatform}>
      <div data-testid="inner">inner</div>
    </NoteStoreProvider>
  );
  expect(screen.getByTestId('inner')).toBeInTheDocument();
});
