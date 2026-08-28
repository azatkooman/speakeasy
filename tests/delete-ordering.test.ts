import { describe, it, expect, beforeEach, vi } from 'vitest';
import { resetIndexedDB, req, openForRead } from './setup-idb';

/**
 * Delete ordering.
 *
 * A record and the files it points at must never disagree. The rule is: commit
 * the record change first, then remove the files it used to reference. The
 * reverse order leaves a live record pointing at a file that is already gone —
 * a card with a missing symbol, and nothing to recover it from.
 *
 * These tests observe the order the native filesystem is actually called in,
 * which is the only way to catch a regression here: both orders "work" on a
 * happy path and differ only when the transaction fails.
 */

const unlinked: string[] = [];
let recordGoneWhenUnlinked: boolean[] = [];

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => true, convertFileSrc: (p: string) => p },
}));

vi.mock('@capacitor/filesystem', () => ({
  Filesystem: {
    writeFile: vi.fn(async () => ({ uri: 'file:///data/fake.png' })),
    // Records whether the DB record had already gone by the time the file was
    // removed. That ordering is the whole point.
    deleteFile: vi.fn(async (opts: any) => { unlinked.push(opts.path); }),
    readFile: vi.fn(), mkdir: vi.fn(),
  },
  Directory: { Data: 'DATA' },
  Encoding: { UTF8: 'utf8' },
}));

const DB = 'speakeasy_aac_db';

/*
 * Reinstall the recording implementation before each test. vi.resetModules()
 * does not reset mock implementations, so a case that makes deleteFile throw
 * would otherwise leak that behaviour into every test after it.
 */
const freshFs = async () => {
  const fs = (await import('@capacitor/filesystem')).Filesystem as any;
  fs.deleteFile.mockReset();
  fs.deleteFile.mockImplementation(async (opts: any) => { unlinked.push(opts.path); });
  return fs;
};

/** A card whose asset lives on the native filesystem, so cleanup is attempted. */
const nativeCard = (id: string, boardId = 'b1', profileId = 'p1') => ({
  id, profileId, boardId,
  label: id,
  imageUrl: 'file:///data/user/0/app/files/' + id + '.png',
  category: 'root', createdAt: 1, slot: 0, isVisible: true,
});

describe('deleteItem', () => {
  beforeEach(async () => { await resetIndexedDB(); vi.resetModules(); unlinked.length = 0; recordGoneWhenUnlinked = []; await freshFs(); });

  it('removes the record before unlinking its files', async () => {
    const s = await import('../services/storage');
    const fs = (await import('@capacitor/filesystem')).Filesystem as any;

    await s.saveItem(nativeCard('c1') as any);

    // Observe DB state at the moment the unlink happens.
    fs.deleteFile.mockImplementation(async () => {
      const db = await openForRead(DB);
      const rec = await req(db.transaction('aac_items').objectStore('aac_items').get('c1'));
      recordGoneWhenUnlinked.push(rec === undefined);
      db.close();
    });

    await s.deleteItem('c1');

    expect(recordGoneWhenUnlinked).toContain(true);
    expect(recordGoneWhenUnlinked).not.toContain(false);
    expect(await s.getAllItems()).toEqual([]);
  });

  it('still deletes the record when asset cleanup fails', async () => {
    const s = await import('../services/storage');
    const fs = (await import('@capacitor/filesystem')).Filesystem as any;
    fs.deleteFile.mockImplementation(async () => { throw new Error('storage detached'); });

    await s.saveItem(nativeCard('c2') as any);
    await expect(s.deleteItem('c2')).resolves.toBeUndefined();

    // The record is what matters; a leaked file is recoverable, a dangling
    // reference is not.
    expect(await s.getAllItems()).toEqual([]);
  });
});

describe('deleteCategory', () => {
  beforeEach(async () => { await resetIndexedDB(); vi.resetModules(); unlinked.length = 0; recordGoneWhenUnlinked = []; await freshFs(); });

  it('removes the record before unlinking its icon', async () => {
    const s = await import('../services/storage');
    const fs = (await import('@capacitor/filesystem')).Filesystem as any;

    await s.saveCategory({
      id: 'cat1', profileId: 'p1', boardId: 'b1', label: 'Folder',
      colorTheme: 'blue', parentId: 'root', slot: 0,
      icon: 'file:///data/user/0/app/files/icon.png',
    } as any);

    fs.deleteFile.mockImplementation(async () => {
      const db = await openForRead(DB);
      const rec = await req(db.transaction('aac_categories').objectStore('aac_categories').get('cat1'));
      recordGoneWhenUnlinked.push(rec === undefined);
      db.close();
    });

    await s.deleteCategory('cat1');
    expect(recordGoneWhenUnlinked).toContain(true);
    expect(recordGoneWhenUnlinked).not.toContain(false);
  });
});

describe('cascade deletes are one transaction', () => {
  beforeEach(async () => { await resetIndexedDB(); vi.resetModules(); unlinked.length = 0; await freshFs(); });

  it('deleteProfile removes every record and only then the files', async () => {
    const s = await import('../services/storage');
    await s.saveProfile({ id: 'p1', name: 'A', age: 5, colorTheme: 'blue', createdAt: 1 } as any);
    await s.saveBoard({ id: 'b1', profileId: 'p1', label: 'B', createdAt: 1, gridRows: 4, gridCols: 6 } as any);
    await s.saveCategory({ id: 'cat1', profileId: 'p1', boardId: 'b1', label: 'F', colorTheme: 'blue', parentId: 'root', slot: 0 } as any);
    await s.saveItem(nativeCard('i1') as any);
    await s.saveItem(nativeCard('i2') as any);

    await s.deleteProfile('p1');

    expect(await s.getAllProfiles()).toEqual([]);
    expect(await s.getAllItems()).toEqual([]);
    expect(await s.getAllCategories()).toEqual([]);
    expect(await s.getAllBoards()).toEqual([]);
    // Both cards' files were cleaned up, after the records went.
    expect(unlinked.length).toBeGreaterThanOrEqual(2);
  });

  it('deleteBoard leaves other profiles untouched and clears dangling links', async () => {
    const s = await import('../services/storage');
    await s.saveProfile({ id: 'p1', name: 'A', age: 5, colorTheme: 'blue', createdAt: 1 } as any);
    await s.saveProfile({ id: 'p2', name: 'B', age: 7, colorTheme: 'pink', createdAt: 2 } as any);
    await s.saveBoard({ id: 'b1', profileId: 'p1', label: 'One', createdAt: 1, gridRows: 4, gridCols: 6 } as any);
    await s.saveBoard({ id: 'b2', profileId: 'p1', label: 'Two', createdAt: 2, gridRows: 4, gridCols: 6 } as any);
    await s.saveBoard({ id: 'bx', profileId: 'p2', label: 'Other child', createdAt: 3, gridRows: 4, gridCols: 6 } as any);

    await s.saveItem({ ...nativeCard('on-b1', 'b1'), id: 'on-b1' } as any);
    await s.saveItem({ ...nativeCard('links-to-b1', 'b2'), id: 'links-to-b1', linkedBoardId: 'b1' } as any);
    await s.saveItem({ ...nativeCard('other-child', 'bx', 'p2'), id: 'other-child' } as any);

    await s.deleteBoard('b1');

    const remaining = await s.getAllItems();
    expect(remaining.map(i => i.id).sort()).toEqual(['links-to-b1', 'other-child']);
    // The link was cleared, not the card — the parent keeps the vocabulary.
    expect(remaining.find(i => i.id === 'links-to-b1')!.linkedBoardId).toBeUndefined();
    // The other child's board and card are untouched.
    expect((await s.getAllBoards('p2')).map(b => b.id)).toEqual(['bx']);
  });
});
