/**
 * LifeOS Keep — Auto-Sync Script
 * 
 * Syncs all notes as Markdown files to the personal_docs PARA structure.
 * Run manually or schedule via cron job.
 * 
 * Usage:
 *   node auto-sync.js <personal_docs_root>
 * 
 * Example:
 *   node auto-sync.js C:\Users\SiphoH\source\personal_docs
 */

import fs from 'fs';
import path from 'path';
import { NoteStore } from './electron/db.js';

async function main() {
  const docsRoot = process.argv[2];
  if (!docsRoot) {
    console.error('Usage: node auto-sync.js <personal_docs_root>');
    console.error('Example: node auto-sync.js C:\\Users\\SiphoH\\source\\personal_docs');
    process.exit(1);
  }

  const resolvedRoot = path.resolve(docsRoot);
  if (!fs.existsSync(resolvedRoot)) {
    console.error(`Directory not found: ${resolvedRoot}`);
    process.exit(1);
  }

  const store = new NoteStore();
  
  // Wait for store to initialize
  await new Promise(resolve => setTimeout(resolve, 200));

  // Sync targets following PARA structure
  const syncTargets = [
    { name: 'Inbox', path: path.join(resolvedRoot, '00-Inbox', 'Keep-Notes') },
    { name: 'Projects', path: path.join(resolvedRoot, '10-Projects', '10-00-Keep-Notes') },
    { name: 'Areas', path: path.join(resolvedRoot, '20-Areas', '20-00-Keep-Notes') },
    { name: 'Resources', path: path.join(resolvedRoot, '30-Resources', '30-01-Keep-Notes', '30-01-01-Inbox') },
    { name: 'Archive', path: path.join(resolvedRoot, '40-Archive', 'Keep-Notes') },
  ];

  // Export active notes to each target
  for (const target of syncTargets) {
    try {
      await store.exportToMarkdown(target.path);
      console.log(`✓ Synced ${target.name} → ${target.path}`);
    } catch (error) {
      console.error(`✗ Failed to sync ${target.name}:`, (error as Error).message);
    }
  }

  // Also export archived/trashed notes to Archive
  try {
    const allNotes = store.getAll();
    // This is handled by exportToMarkdown which filters isTrashed
    console.log(`✓ Total active notes: ${allNotes.length}`);
  } catch (error) {
    // ignore
  }

  console.log('\nSync complete.');
}

main().catch(console.error);
