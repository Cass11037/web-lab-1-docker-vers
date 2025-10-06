
import { openDB, IDBPDatabase } from 'idb';

const DB_NAME = 'ClientServerAppDB';
const DB_VERSION = 1;
const STORE_NAME = 'historyStore';

let db: IDBPDatabase | null = null;

async function initDB() {
  if (db) {
    return db;
  }

  db = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      db.createObjectStore(STORE_NAME, {
        keyPath: 'key',
      });
    },
  });

  return db;
}

export async function setItem<T>(key: string, value: T): Promise<void> {
  const db = await initDB();
  await db.put(STORE_NAME, { key, value });
}

export async function getItem<T>(key: string): Promise<T | null> {
  const db = await initDB();
  const result = await db.get(STORE_NAME, key);
  return result ? result.value : null;
}

export async function clearStore(): Promise<void> {
  const db = await initDB();
  await db.clear(STORE_NAME);
}