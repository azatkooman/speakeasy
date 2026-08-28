// Native-platform behaviour of export. Separate file because the platform is
// decided by a module-level mock.
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { resetIndexedDB } from './setup-idb';

/**
 * On a device, assets are files and the record holds a URI, so export has to
 * read them back. The trap is that not every string in an asset field is a
 * path: a folder's `icon` is usually an ICON_MAP key like 'people'.
 *
 * The first version of this tried to read a file called 'people', failed, and
 * returned undefined — silently erasing the artwork of every default folder in
 * the backup. It passed every web test, because the web path returns early.
 * Found by exporting on an emulator and looking at the restored board.
 */

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => true, convertFileSrc: (p: string) => p },
}));

const FILE_URI = 'file:///data/user/0/com.example/files/abc123.png';
const PNG_BASE64 = 'iVBORw0KGgoAAAANSUhEUg==';

vi.mock('@capacitor/filesystem', () => ({
  Filesystem: {
    writeFile: vi.fn(async () => ({ uri: FILE_URI })),
    deleteFile: vi.fn(),
    mkdir: vi.fn(),
    readFile: vi.fn(async ({ path }: { path: string }) => {
      // Only the real asset exists. Anything else must never be asked for.
      if (path === 'abc123.png') return { data: PNG_BASE64 };
      throw new Error(`File does not exist: ${path}`);
    }),
  },
  Directory: { Data: 'DATA', Cache: 'CACHE' },
  Encoding: { UTF8: 'utf8' },
}));

describe('export on a device', () => {
  beforeEach(async () => { await resetIndexedDB(); vi.resetModules(); });

  const seed = async (s: typeof import('../services/storage')) => {
    await s.saveProfile({ id: 'p1', name: 'Ada', age: 6, colorTheme: 'blue', createdAt: 1 } as any);
    await s.saveBoard({ id: 'b1', profileId: 'p1', label: 'Home', createdAt: 1, gridRows: 4, gridCols: 6 } as any);
    // An ICON_MAP key, exactly as the seeded default folders store it.
    await s.saveCategory({ id: 'c1', profileId: 'p1', boardId: 'b1', label: 'People', labelKey: 'folder.default.people', colorTheme: 'yellow', parentId: 'root', slot: 0, icon: 'people' } as any);
    // A parent's photo, which really is a file and must be inlined.
    await s.saveItem({ id: 'i1', profileId: 'p1', boardId: 'b1', label: 'my photo', imageUrl: FILE_URI, category: 'root', createdAt: 1, slot: 1 } as any);
    // A bundled pictogram, which must stay a path.
    await s.saveItem({ id: 'i2', profileId: 'p1', boardId: 'b1', label: 'apple', imageUrl: '/pictograms/2462.png', category: 'root', createdAt: 2, slot: 2 } as any);
  };

  it('keeps a folder’s ICON_MAP key instead of trying to read it as a file', async () => {
    const storage = await import('../services/storage');
    const backup = await import('../services/backup');
    await seed(storage);

    const { backup: file, missingAssets } = await backup.exportProfile('p1');

    expect(file.categories[0].icon, 'the folder lost its artwork').toBe('people');
    expect(missingAssets).toBe(0);
  });

  it('inlines a real device file and leaves bundled paths alone', async () => {
    const storage = await import('../services/storage');
    const backup = await import('../services/backup');
    await seed(storage);

    const { backup: file } = await backup.exportProfile('p1');
    const photo = file.items.find(i => i.label === 'my photo')!;
    const apple = file.items.find(i => i.label === 'apple')!;

    expect(photo.imageUrl).toBe(`data:image/png;base64,${PNG_BASE64}`);
    expect(apple.imageUrl).toBe('/pictograms/2462.png');
  });

  it('reports a genuinely missing file rather than writing a dangling path', async () => {
    const storage = await import('../services/storage');
    const backup = await import('../services/backup');
    await seed(storage);
    await storage.saveItem({
      id: 'i3', profileId: 'p1', boardId: 'b1', label: 'gone',
      imageUrl: 'file:///data/user/0/com.example/files/deleted.png',
      category: 'root', createdAt: 3, slot: 3,
    } as any);

    const { backup: file, missingAssets } = await backup.exportProfile('p1');
    expect(missingAssets).toBe(1);
    expect(file.items.find(i => i.label === 'gone')!.imageUrl).toBe('');
  });
});
