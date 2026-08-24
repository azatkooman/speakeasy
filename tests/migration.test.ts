import { describe, it, expect, beforeEach, vi } from 'vitest';
import { resetIndexedDB, req, seedLegacyDb, openForRead } from './setup-idb';

/**
 * Storage migration tests.
 *
 * This release carries a v5 install straight through v6 and v7 on first launch,
 * on devices that have never seen either step. There is no export/import yet,
 * so a migration that loses or reshuffles a board loses months of a parent's
 * work with no way back. These tests exist to make that path repeatable rather
 * than hopeful.
 */

// Capacitor is a native module; the storage layer only reaches for it when it
// thinks it is on a device, but importing it in Node must not explode.
vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => false, convertFileSrc: (p: string) => p },
}));
vi.mock('@capacitor/filesystem', () => ({
  Filesystem: {
    writeFile: vi.fn(), deleteFile: vi.fn(), readFile: vi.fn(), mkdir: vi.fn(),
  },
  Directory: { Data: 'DATA' },
  Encoding: { UTF8: 'utf8' },
}));

const DB = 'speakeasy_aac_db';

describe('v6 → v7: compacted order becomes absolute slot', () => {
  beforeEach(async () => {
    await resetIndexedDB();
    vi.resetModules();
  });

  it('preserves the arrangement a parent built, in the same order', async () => {
    await seedLegacyDb(DB, 6, (_db, tx) => {
      const items = tx.objectStore('aac_items');
      const cats = tx.objectStore('aac_categories');
      const boards = tx.objectStore('aac_boards');
      boards.put({ id: 'b1', profileId: 'p1', label: 'Board', createdAt: 1 });
      // Deliberately out of insertion order: the migration must sort by `order`,
      // not by whatever order getAll happens to return.
      items.put({ id: 'i3', profileId: 'p1', boardId: 'b1', category: 'root', label: 'third',  order: 2, createdAt: 30 });
      items.put({ id: 'i1', profileId: 'p1', boardId: 'b1', category: 'root', label: 'first',  order: 0, createdAt: 10 });
      cats.put({ id: 'c2',  profileId: 'p1', boardId: 'b1', parentId: 'root', label: 'second', order: 1 });
    });

    // getAllItems is a normal read; opening the database is what runs the
    // upgrade, so the migration is exercised through the public surface.
    const storage = await import('../services/storage');
    await storage.getAllItems();
    const db = await openForRead(DB);
    expect(db.version).toBe(7);

    const tx = db.transaction(['aac_items', 'aac_categories'], 'readonly');
    const items = await req(tx.objectStore('aac_items').getAll());
    const cats = await req(tx.objectStore('aac_categories').getAll());

    const bySlot = [...items, ...cats]
      .sort((a: any, b: any) => a.slot - b.slot)
      .map((r: any) => [r.slot, r.label]);

    // Cards and folders share one slot space per container, so the folder that
    // was order:1 sits between the two cards rather than in a separate list.
    expect(bySlot).toEqual([[0, 'first'], [1, 'second'], [2, 'third']]);
  });

  it('gives every board explicit grid dimensions', async () => {
    await seedLegacyDb(DB, 6, (_db, tx) => {
      tx.objectStore('aac_boards').put({ id: 'b1', profileId: 'p1', label: 'No grid', createdAt: 1 });
    });

    const storage = await import('../services/storage');
    await storage.getAllBoards();
    const db = await openForRead(DB);
    const board: any = await req(db.transaction('aac_boards').objectStore('aac_boards').get('b1'));

    expect(typeof board.gridRows).toBe('number');
    expect(typeof board.gridCols).toBe('number');
    expect(board.gridRows).toBeGreaterThan(0);
    expect(board.gridCols).toBeGreaterThan(0);
  });

  it('keeps separate folders in separate slot spaces', async () => {
    await seedLegacyDb(DB, 6, (_db, tx) => {
      const items = tx.objectStore('aac_items');
      tx.objectStore('aac_boards').put({ id: 'b1', profileId: 'p1', label: 'B', createdAt: 1 });
      items.put({ id: 'a1', profileId: 'p1', boardId: 'b1', category: 'folderA', label: 'a1', order: 0 });
      items.put({ id: 'a2', profileId: 'p1', boardId: 'b1', category: 'folderA', label: 'a2', order: 1 });
      items.put({ id: 'b1x', profileId: 'p1', boardId: 'b1', category: 'folderB', label: 'b1', order: 0 });
    });

    const storage = await import('../services/storage');
    await storage.getAllItems();
    const db = await openForRead(DB);
    const all: any[] = await req(db.transaction('aac_items').objectStore('aac_items').getAll());
    const slotOf = (id: string) => all.find(i => i.id === id).slot;

    // Slot 0 exists once per folder, not once per board.
    expect(slotOf('a1')).toBe(0);
    expect(slotOf('a2')).toBe(1);
    expect(slotOf('b1x')).toBe(0);
  });

  it('does not collapse two cards onto one slot', async () => {
    await seedLegacyDb(DB, 6, (_db, tx) => {
      const items = tx.objectStore('aac_items');
      tx.objectStore('aac_boards').put({ id: 'b1', profileId: 'p1', label: 'B', createdAt: 1 });
      // No `order` at all — the legacy fallback sorts these by createdAt.
      for (let n = 0; n < 6; n++) {
        items.put({ id: `n${n}`, profileId: 'p1', boardId: 'b1', category: 'root', label: `n${n}`, createdAt: n });
      }
    });

    const storage = await import('../services/storage');
    await storage.getAllItems();
    const db = await openForRead(DB);
    const all: any[] = await req(db.transaction('aac_items').objectStore('aac_items').getAll());
    const slots = all.map(i => i.slot);

    expect(slots).toHaveLength(6);
    expect(new Set(slots).size).toBe(6);          // every card reachable
  });
});

describe('v6: query indices', () => {
  beforeEach(async () => { await resetIndexedDB(); vi.resetModules(); });

  it('creates the profile and board indices reads depend on', async () => {
    const { getAllItems, IDX_PROFILE, IDX_BOARD } = await import('../services/storage');
    await getAllItems();
    const db = await openForRead(DB);
    const tx = db.transaction(['aac_items', 'aac_categories', 'aac_boards'], 'readonly');

    expect([...tx.objectStore('aac_items').indexNames]).toContain(IDX_PROFILE);
    expect([...tx.objectStore('aac_items').indexNames]).toContain(IDX_BOARD);
    expect([...tx.objectStore('aac_categories').indexNames]).toContain(IDX_PROFILE);
    expect([...tx.objectStore('aac_boards').indexNames]).toContain(IDX_PROFILE);
  });
});
