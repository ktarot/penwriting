/**
 * IndexedDB 저장소 (계획서 12장).
 * v1: settings, practiceRecords, customLessons, progress
 * v2: drafts (진행 중인 필기 임시 저장)
 */
export const DB_NAME = "penwriting";
export const DB_VERSION = 2;
export const STORES = ["settings", "practiceRecords", "customLessons", "progress", "drafts"] as const;
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
      if (!db.objectStoreNames.contains("drafts")) db.createObjectStore("drafts", { keyPath: "learningItemId" });
    };
    req.onsuccess = () => {
      const db = req.result;
      // 다른 탭이 새 버전으로 열면 이 연결을 닫아 업그레이드를 막지 않는다
      db.onversionchange = () => {
        db.close();
        dbPromise = null;
      };
      resolve(db);
    };
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

/** 구조화 복제가 가능한 순수 데이터로 만든다 */
const plain = <T>(v: T): T => JSON.parse(JSON.stringify(v));

export async function dbGet<T>(store: StoreName, key: IDBValidKey): Promise<T | undefined> {
  const db = await openDatabase();
  return wrap(db.transaction(store, "readonly").objectStore(store).get(key)) as Promise<T | undefined>;
}

export async function dbGetAll<T>(store: StoreName): Promise<T[]> {
  const db = await openDatabase();
  return wrap(db.transaction(store, "readonly").objectStore(store).getAll()) as Promise<T[]>;
}

export async function dbPut(store: StoreName, value: unknown, key?: IDBValidKey): Promise<void> {
  const db = await openDatabase();
  await wrap(db.transaction(store, "readwrite").objectStore(store).put(plain(value), key));
}

export async function dbDelete(store: StoreName, key: IDBValidKey): Promise<void> {
  const db = await openDatabase();
  await wrap(db.transaction(store, "readwrite").objectStore(store).delete(key));
}

export async function dbClear(store: StoreName): Promise<void> {
  const db = await openDatabase();
  await wrap(db.transaction(store, "readwrite").objectStore(store).clear());
}

/** 브라우저가 저장소를 임의로 비우지 않도록 요청한다 (지원 브라우저만) */
export async function requestPersistentStorage(): Promise<boolean> {
  try {
    if (navigator.storage?.persisted && (await navigator.storage.persisted())) return true;
    return (await navigator.storage?.persist?.()) ?? false;
  } catch {
    return false;
  }
}

export function newId(prefix: string): string {
  const rand = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID().slice(0, 8) : Math.random().toString(36).slice(2, 10);
  return `${prefix}${Date.now().toString(36)}${rand}`.replace(/[^a-z0-9]/gi, "").toLowerCase();
}
