/**
 * An in-memory localStorage for tests.
 *
 * Node 26 defines its own `localStorage` global and leaves it undefined unless
 * started with --localstorage-file, and that definition shadows the one
 * happy-dom installs. Rather than depending on a DOM environment for what is
 * really a key/value store, these tests bring their own.
 */
export const installMemoryStorage = () => {
  const store = new Map<string, string>();
  const mock: Storage = {
    get length() { return store.size; },
    clear: () => store.clear(),
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    key: (i: number) => [...store.keys()][i] ?? null,
    removeItem: (k: string) => { store.delete(k); },
    setItem: (k: string, v: string) => { store.set(k, String(v)); },
  };
  Object.defineProperty(globalThis, 'localStorage', {
    value: mock, configurable: true, writable: true,
  });
  return mock;
};
