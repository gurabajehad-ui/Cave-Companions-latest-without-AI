// IndexedDB Wrapper for Deep Offline Quran Storage
const DB_NAME = 'cave_companions_quran_db';
const DB_VERSION = 1;
const STORE_NAME = 'surah_details';

let dbInstance: IDBDatabase | null = null;

const initDb = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (dbInstance) {
      resolve(dbInstance);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'number' });
      }
    };

    request.onsuccess = (event) => {
      dbInstance = (event.target as IDBOpenDBRequest).result;
      resolve(dbInstance);
    };

    request.onerror = (event) => {
      reject((event.target as IDBOpenDBRequest).error);
    };
  });
};

export const quranIndexedDb = {
  async saveSurah(surahNumber: number, detail: any): Promise<void> {
    try {
      const db = await initDb();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const data = { number: surahNumber, detail };
        const request = store.put(data);

        request.onsuccess = () => resolve();
        request.onerror = (event) => reject((event.target as IDBRequest).error);
      });
    } catch (e) {
      console.error('[IndexedDB Save Error]', e);
    }
  },

  async getSurah(surahNumber: number): Promise<any | null> {
    try {
      const db = await initDb();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(surahNumber);

        request.onsuccess = () => {
          resolve(request.result ? request.result.detail : null);
        };
        request.onerror = (event) => reject((event.target as IDBRequest).error);
      });
    } catch (e) {
      console.error('[IndexedDB Get Error]', e);
      return null;
    }
  },

  async getCachedSurahNumbers(): Promise<number[]> {
    try {
      const db = await initDb();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAllKeys();

        request.onsuccess = () => {
          resolve((request.result || []) as number[]);
        };
        request.onerror = (event) => reject((event.target as IDBRequest).error);
      });
    } catch (e) {
      console.error('[IndexedDB Keys Error]', e);
      return [];
    }
  },

  async clearAll(): Promise<void> {
    try {
      const db = await initDb();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.clear();

        request.onsuccess = () => resolve();
        request.onerror = (event) => reject((event.target as IDBRequest).error);
      });
    } catch (e) {
      console.error('[IndexedDB Clear Error]', e);
    }
  }
};
