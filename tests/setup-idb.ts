/**
 * A fresh IndexedDB for the calling test file.
 *
 * fake-indexeddb is a module-level singleton, so importing it once per file is
 * not enough — a test that opens the database at v5 would otherwise be handed a
 * connection another file already upgraded to v7, and the migration under test
 * would never run. `resetIndexedDB` swaps in a brand new backing store.
 */
export const resetIndexedDB = async () => {
  // Imported from the package root, which is the entry that ships type
  // declarations; the ./lib/* subpaths resolve to untyped JS under this
  // project's module resolution and break `tsc --noEmit`.
  const { IDBFactory, IDBKeyRange } = await import('fake-indexeddb');
  (globalThis as any).indexedDB = new IDBFactory();
  (globalThis as any).IDBKeyRange = IDBKeyRange;
};

/** Promise wrapper for an IDBRequest, so tests can await instead of nest. */
export const req = <T>(r: IDBRequest<T>): Promise<T> =>
  new Promise((resolve, reject) => {
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });

/** Promise wrapper for a transaction completing. */
export const done = (tx: IDBTransaction): Promise<void> =>
  new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });

/**
 * Build a database at an older schema version and seed it, so a migration can
 * be tested against data shaped the way real installs actually hold it.
 */
export const seedLegacyDb = (
  name: string,
  version: number,
  seed: (db: IDBDatabase, tx: IDBTransaction) => void,
): Promise<void> =>
  new Promise((resolve, reject) => {
    const open = indexedDB.open(name, version);
    open.onupgradeneeded = () => {
      const db = open.result;
      const tx = open.transaction!;
      ['aac_items', 'aac_categories', 'aac_boards', 'aac_profiles'].forEach(s => {
        if (!db.objectStoreNames.contains(s)) db.createObjectStore(s, { keyPath: 'id' });
      });
      seed(db, tx);
    };
    open.onsuccess = () => { open.result.close(); resolve(); };
    open.onerror = () => reject(open.error);
  });

/** Open the database as-is (no version bump) to inspect what a migration produced. */
export const openForRead = (name: string): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    const r = indexedDB.open(name);
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
