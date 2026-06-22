import { openDB, DBSchema, IDBPDatabase } from 'idb';
import type { Note } from '../types/note';
import { githubSync } from '../services/githubSync';
import { getAllNotes } from '../store/storage';


/**
 * Offline sync queue schema.
 * Actions are stored in order and replayed when the network becomes available.
 */
interface SyncDB extends DBSchema {
  queue: {
    key: number; // auto‑increment
    value: { type: 'create' | 'update' | 'delete'; note: Note };
    indexes: { type: 'type' };
  };
}

let dbPromise: Promise<IDBPDatabase<SyncDB>> | null = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<SyncDB>('lifeos-sync-db', 1, {
      upgrade(db) {
        const store = db.createObjectStore('queue', { keyPath: 'id', autoIncrement: true });
        store.createIndex('type', 'type');
      },
    });
  }
  return dbPromise;
}

export async function enqueue(action: 'create' | 'update' | 'delete', note: Note) {
  const db = await getDB();
  await db.add('queue', { type: action, note });
}

export async function processQueue(): Promise<void> {
  if (!navigator.onLine) return; // wait for connectivity

  const db = await getDB();
  const all = await db.getAll('queue');
  if (all.length === 0) return;

  // Pull all notes from storage – the latest local state
  const localNotes = await getAllNotes();

  // Use the existing GitHub sync service to push the *current* note set.
  // This is simpler than trying to replay each CRUD individually.
  await githubSync.syncNotes(localNotes);

  // Clear the queue after a successful push.
  const tx = db.transaction('queue', 'readwrite');
  await tx.objectStore('queue').clear();
  await tx.done;
}

// Helper to listen for online/offline events and trigger processing.
export function setupOnlineListener(callback?: () => void) {
  const handler = async () => {
    await processQueue();
    if (callback) callback();
  };
  window.addEventListener('online', handler);
  // Return a cleanup function
  return () => window.removeEventListener('online', handler);
}
