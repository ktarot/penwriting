/**
 * IndexedDB 저장소 (계획서 12장).
 * Phase 2에서는 settings만 사용한다. 나머지 저장소는 Phase 3에서 채운다.
 */
export const DB_NAME = "penwriting";
export const DB_VERSION = 1;
export const STORES = ["settings", "practiceRecords", "customLessons", "progress"] as const;
export type StoreName = (typeof STORES)[number];

let dbPromise: Promise<IDBDatabase> | null = null;

export function openDatabase(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB unavailable"));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("settings")) db.createObjectStore("settings");
      if (!db.objectStoreNames.contains("practiceRecords")) {
        const s = db.createObjectStore("practiceRecords", { keyPath: "id" });
        s.createIndex("createdAt", "createdAt");
        s.createIndex("learningItemId", "learningItemId");
      }
      if (!db.objectStoreNames.contains("customLessons")) {
        const s = db.createObjectStore("customLessons", { keyPath: "id" });
        s.createIndex("updatedAt", "updatedAt");
      }
      if (!db.objectStoreNames.contains("progress")) db.createObjectStore("progress", { keyPath: "learningItemId" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    req.onblocked = () => reject(new Error("IndexedDB blocked"));
  });
  dbPromise.catch(() => (dbPromise = null));
  return dbPromise;
}

function wrap<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function dbGet<T>(store: StoreName, key: IDBValidKey): Promise<T | undefined> {
  const db = await openDatabase();
  return wrap(db.transaction(store, "readonly").objectStore(store).get(key)) as Promise<T | undefined>;
}

export async function dbPut(store: StoreName, value: unknown, key?: IDBValidKey): Promise<void> {
  const db = await openDatabase();
  await wrap(db.transaction(store, "readwrite").objectStore(store).put(value, key));
}
