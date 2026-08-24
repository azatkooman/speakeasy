import { describe, it, expect, beforeEach, vi } from 'vitest';
import { resetIndexedDB } from './setup-idb';

/**
 * Profile isolation.
 *
 * One device is often shared — siblings, or a classroom set. A read that leaks
 * across profiles does not just show the wrong cards, it puts another child's
 * photographs and recorded voice in front of the wrong family. A delete that
 * leaks is worse: it takes a board that belonged to someone else.
 */

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => false, convertFileSrc: (p: string) => p },
}));
vi.mock('@capacitor/filesystem', () => ({
  Filesystem: { writeFile: vi.fn(), deleteFile: vi.fn(), readFile: vi.fn(), mkdir: vi.fn() },
  Directory: { Data: 'DATA' },
  Encoding: { UTF8: 'utf8' },
}));

const seedTwoProfiles = async (s: typeof import('../services/storage')) => {
  await s.saveProfile({ id: 'pA', name: 'Ada', age: 6, colorTheme: 'blue', createdAt: 1 } as any);
  await s.saveProfile({ id: 'pB', name: 'Bo',  age: 9, colorTheme: 'pink', createdAt: 2 } as any);

  await s.saveBoard({ id: 'bA', profileId: 'pA', label: 'A board', createdAt: 1, gridRows: 4, gridCols: 6 } as any);
  await s.saveBoard({ id: 'bB', profileId: 'pB', label: 'B board', createdAt: 2, gridRows: 4, gridCols: 6 } as any);

  await s.saveCategory({ id: 'cA', profileId: 'pA', boardId: 'bA', label: 'A folder', colorTheme: 'blue', parentId: 'root', slot: 0 } as any);
  await s.saveCategory({ id: 'cB', profileId: 'pB', boardId: 'bB', label: 'B folder', colorTheme: 'pink', parentId: 'root', slot: 0 } as any);

  await s.saveItem({ id: 'iA', profileId: 'pA', boardId: 'bA', label: 'A card', imageUrl: '/pictograms/2462.png', category: 'root', createdAt: 1, slot: 1 } as any);
  await s.saveItem({ id: 'iB', profileId: 'pB', boardId: 'bB', label: 'B card', imageUrl: '/pictograms/5441.png', category: 'root', createdAt: 2, slot: 1 } as any);
};

describe('reads are scoped to one profile', () => {
  beforeEach(async () => { await resetIndexedDB(); vi.resetModules(); });

  it('returns only that profile’s items, folders and boards', async () => {
    const s = await import('../services/storage');
    await seedTwoProfiles(s);

    expect((await s.getAllItems('pA')).map(i => i.id)).toEqual(['iA']);
    expect((await s.getAllItems('pB')).map(i => i.id)).toEqual(['iB']);
    expect((await s.getAllCategories('pA')).map(c => c.id)).toEqual(['cA']);
    expect((await s.getAllBoards('pB')).map(b => b.id)).toEqual(['bB']);
  });

  it('returns everything when no profile is given, so migrations can still see it all', async () => {
    const s = await import('../services/storage');
    await seedTwoProfiles(s);

    expect((await s.getAllItems()).map(i => i.id).sort()).toEqual(['iA', 'iB']);
  });
});

describe('deleting a profile takes only its own data', () => {
  beforeEach(async () => { await resetIndexedDB(); vi.resetModules(); });

  it('leaves the other profile completely intact', async () => {
    const s = await import('../services/storage');
    await seedTwoProfiles(s);

    await s.deleteProfile('pA');

    expect((await s.getAllProfiles()).map(p => p.id)).toEqual(['pB']);
    expect((await s.getAllItems()).map(i => i.id)).toEqual(['iB']);
    expect((await s.getAllCategories()).map(c => c.id)).toEqual(['cB']);
    expect((await s.getAllBoards()).map(b => b.id)).toEqual(['bB']);
  });

  it('removes every trace of the deleted profile', async () => {
    const s = await import('../services/storage');
    await seedTwoProfiles(s);

    await s.deleteProfile('pA');

    expect(await s.getAllItems('pA')).toEqual([]);
    expect(await s.getAllCategories('pA')).toEqual([]);
    expect(await s.getAllBoards('pA')).toEqual([]);
  });
});
