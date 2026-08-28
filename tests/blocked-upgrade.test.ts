import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { resetIndexedDB } from './setup-idb';

/**
 * A blocked schema upgrade must fail, not hang.
 *
 * `blocked` fires when another connection still holds the old version. Normally
 * that connection's onversionchange handler closes it and the upgrade proceeds
 * within milliseconds. When it does not — a second tab wedged mid-write, a
 * WebView that never fired the event — the open request simply never settles.
 *
 * That used to only log a warning. Nothing rejected, so initialisation never
 * finished and the app sat on its loading spinner indefinitely, which for a
 * communication device means a child with no words and nobody told why.
 */

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => false, convertFileSrc: (p: string) => p },
}));
vi.mock('@capacitor/filesystem', () => ({
  Filesystem: { writeFile: vi.fn(), deleteFile: vi.fn(), readFile: vi.fn(), mkdir: vi.fn() },
  Directory: { Data: 'DATA' },
  Encoding: { UTF8: 'utf8' },
}));

const DB = 'speakeasy_aac_db';

/**
 * Hold a connection open at an older version, without the onversionchange
 * handler that would close it. Any attempt to open at the current version then
 * needs an upgrade it cannot get, which is exactly the blocked state.
 */
const wedgeOldVersion = (version: number): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    const open = indexedDB.open(DB, version);
    open.onupgradeneeded = () => {
      const db = open.result;
      ['aac_items', 'aac_categories', 'aac_boards', 'aac_profiles'].forEach(name => {
        if (!db.objectStoreNames.contains(name)) db.createObjectStore(name, { keyPath: 'id' });
      });
    };
    open.onsuccess = () => resolve(open.result);   // deliberately left open
    open.onerror = () => reject(open.error);
  });

describe('blocked upgrade', () => {
  let wedged: IDBDatabase | null = null;

  beforeEach(async () => { await resetIndexedDB(); vi.resetModules(); });
  afterEach(() => { wedged?.close(); wedged = null; vi.useRealTimers(); });

  it('rejects with an actionable message instead of never settling', async () => {
    wedged = await wedgeOldVersion(6);          // v6 held open, app wants v7
    const s = await import('../services/storage');

    vi.useFakeTimers();
    const pending = s.getAllItems();             // any read opens the database
    const asserted = expect(pending).rejects.toThrow(/another copy of the app is open/i);

    await vi.advanceTimersByTimeAsync(s.DB_OPEN_TIMEOUT_MS + 100);
    await asserted;
  });

  it('does not give up before the timeout has elapsed', async () => {
    wedged = await wedgeOldVersion(6);
    const s = await import('../services/storage');

    vi.useFakeTimers();
    let settled = false;
    const pending = s.getAllItems().then(() => { settled = true; }, () => { settled = true; });

    // Well short of the timeout: a blocking tab usually closes itself in far
    // less than this, and giving up early would turn a transient block into an
    // error screen the user did not need to see.
    await vi.advanceTimersByTimeAsync(s.DB_OPEN_TIMEOUT_MS - 1000);
    expect(settled).toBe(false);

    await vi.advanceTimersByTimeAsync(2000);
    await pending;
    expect(settled).toBe(true);
  });

  it('succeeds normally once the blocking connection closes', async () => {
    wedged = await wedgeOldVersion(6);
    const s = await import('../services/storage');

    const pending = s.getAllItems();
    wedged.close();                              // the other tab goes away
    wedged = null;

    await expect(pending).resolves.toEqual([]);
  });

  it('makes a fresh attempt after a rejection instead of replaying it', async () => {
    wedged = await wedgeOldVersion(6);
    const s = await import('../services/storage');

    vi.useFakeTimers();
    const first = s.getAllItems();
    const firstAsserted = expect(first).rejects.toThrow();
    await vi.advanceTimersByTimeAsync(s.DB_OPEN_TIMEOUT_MS + 100);
    await firstAsserted;

    /*
     * The cached promise must have been cleared on rejection. If it had not
     * been, this second call would settle immediately with the same rejection,
     * and the error screen's "Try again" button would be a lie. Instead it
     * should open a new request, which is still blocked and therefore still
     * pending until its own timeout.
     */
    let settled = false;
    const second = s.getAllItems().then(() => { settled = true; }, () => { settled = true; });
    await vi.advanceTimersByTimeAsync(100);
    expect(settled).toBe(false);

    await vi.advanceTimersByTimeAsync(s.DB_OPEN_TIMEOUT_MS);
    await second;
    expect(settled).toBe(true);
  });
});
