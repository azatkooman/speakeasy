import { AACItem, Category } from '../types';

const DB_NAME = 'speakeasy_aac_db';
const DB_VERSION = 2; 
const STORE_ITEMS = 'aac_items';
const STORE_CATEGORIES = 'aac_categories';

// Helper to clear old heavy history from localStorage to prevent QuotaExceededError
export const clearLegacyStorage = () => {
    if (localStorage.getItem('aac_history')) {
        localStorage.removeItem('aac_history');
        console.log("Cleared legacy bloated history storage");
    }
};

const DEFAULT_CATEGORIES: Category[] = [
  { id: 'NOUN', label: 'Things', colorTheme: 'yellow' },
  { id: 'VERB', label: 'Actions', colorTheme: 'green' },
  { id: 'ADJECTIVE', label: 'Desc.', colorTheme: 'blue' },
  { id: 'SOCIAL', label: 'Social', colorTheme: 'pink' },
  { id: 'OTHER', label: 'Other', colorTheme: 'orange' },
];

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      const transaction = (event.target as IDBOpenDBRequest).transaction;

      if (!db.objectStoreNames.contains(STORE_ITEMS)) {
        db.createObjectStore(STORE_ITEMS, { keyPath: 'id' });
      }

      if (!db.objectStoreNames.contains(STORE_CATEGORIES)) {
        const catStore = db.createObjectStore(STORE_CATEGORIES, { keyPath: 'id' });
        DEFAULT_CATEGORIES.forEach(cat => catStore.put(cat));
      }
    };

    request.onsuccess = (event) => {
      resolve((event.target as IDBOpenDBRequest).result);
    };

    request.onerror = (event) => {
      reject((event.target as IDBOpenDBRequest).error);
    };
  });
};

export const saveItem = async (item: AACItem): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_ITEMS, 'readwrite');
    const store = transaction.objectStore(STORE_ITEMS);
    const request = store.put(item);

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    request.onerror = () => reject(request.error);
  });
};

export const getAllItems = async (): Promise<AACItem[]> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_ITEMS, 'readonly');
    const store = transaction.objectStore(STORE_ITEMS);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const deleteItem = async (id: string): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_ITEMS, 'readwrite');
    const store = transaction.objectStore(STORE_ITEMS);
    const request = store.delete(id);

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    request.onerror = () => reject(request.error);
  });
};

export const saveCategory = async (category: Category): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_CATEGORIES, 'readwrite');
    const store = transaction.objectStore(STORE_CATEGORIES);
    const request = store.put(category);
    
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    request.onerror = () => reject(request.error);
  });
};

export const getAllCategories = async (): Promise<Category[]> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_CATEGORIES, 'readonly');
    const store = transaction.objectStore(STORE_CATEGORIES);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const deleteCategory = async (id: string): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_CATEGORIES, 'readwrite');
    const store = transaction.objectStore(STORE_CATEGORIES);
    const request = store.delete(id);
    
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    request.onerror = () => reject(request.error);
  });
};