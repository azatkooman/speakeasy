import { describe, it, expect, beforeEach, vi } from 'vitest';
import { resetIndexedDB } from './setup-idb';

/**
 * Export and import.
 *
 * This is the recovery path for the whole app: without it, a family's entire
 * vocabulary lives in one device's IndexedDB and a replaced tablet takes it.
 * That makes two properties worth more than the feature itself.
 *
 * **Positions.** A child reaches for a word without looking. A restore that
 * brings back the right words in the wrong cells has destroyed the thing worth
 * restoring, and would look like a success.
 *
 * **Non-destructiveness.** Import creates a new profile and never writes over
 * an existing one. Getting that wrong means destroying a working board while
 * trying to protect it.
 */

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => false, convertFileSrc: (p: string) => p },
}));
vi.mock('@capacitor/filesystem', () => ({
  Filesystem: { writeFile: vi.fn(), deleteFile: vi.fn(), readFile: vi.fn(), mkdir: vi.fn() },
  Directory: { Data: 'DATA' },
  Encoding: { UTF8: 'utf8' },
}));

const PHOTO = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==';
const VOICE = 'data:audio/webm;base64,GkXfo0AgQoaBAULygQ==';

/**
 * A board with the shapes that actually break: a nested folder, a card in it, a
 * core-rail card, a gap in the slot sequence, a parent photo, a recording, a
 * localised default card, and a link to a second board.
 */
const seed = async (s: typeof import('../services/storage')) => {
  await s.saveProfile({
    id: 'p1', name: 'Ada', age: 6, colorTheme: 'blue', createdAt: 10,
    settings: { voicePitch: 1, voiceRate: 1.3, gridColumns: 'large', language: 'ru', maxSentenceLength: 3, autoClearSentence: true },
  } as any);

  await s.saveBoard({ id: 'b1', profileId: 'p1', label: 'Home', createdAt: 10, gridRows: 4, gridCols: 6 } as any);
  await s.saveBoard({ id: 'b2', profileId: 'p1', label: 'School', createdAt: 11, gridRows: 5, gridCols: 8 } as any);

  await s.saveCategory({ id: 'c1', profileId: 'p1', boardId: 'b1', label: 'Food', colorTheme: 'orange', parentId: 'root', slot: 2, icon: PHOTO } as any);
  await s.saveCategory({ id: 'c2', profileId: 'p1', boardId: 'b1', label: 'Fruit', colorTheme: 'orange', parentId: 'c1', slot: 5 } as any);

  // slot 0 and 1 deliberately empty: gaps are meaningful, not compressible.
  await s.saveItem({ id: 'i1', profileId: 'p1', boardId: 'b1', label: 'apple', labelKey: 'vocab.apple', imageUrl: '/pictograms/2462.png', category: 'c2', createdAt: 10, slot: 7 } as any);
  await s.saveItem({ id: 'i2', profileId: 'p1', boardId: 'b1', label: 'my photo', imageUrl: PHOTO, audioUrl: VOICE, category: 'root', createdAt: 11, slot: 23, imageFit: 'cover' } as any);
  await s.saveItem({ id: 'i3', profileId: 'p1', boardId: 'b1', label: 'more', imageUrl: '/pictograms/5508.png', category: 'root', createdAt: 12, slot: 3, isCore: true } as any);
  await s.saveItem({ id: 'i4', profileId: 'p1', boardId: 'b1', label: 'school', imageUrl: '/pictograms/32446.png', category: 'root', createdAt: 13, slot: 11, linkedBoardId: 'b2' } as any);
  await s.saveItem({ id: 'i5', profileId: 'p1', boardId: 'b2', label: 'teacher', imageUrl: '/pictograms/6165.png', category: 'root', createdAt: 14, slot: 0, isVisible: false } as any);
};

const load = async () => ({
  storage: await import('../services/storage'),
  backup: await import('../services/backup'),
});

describe('export', () => {
  beforeEach(async () => { await resetIndexedDB(); vi.resetModules(); });

  it('carries the whole child: profile, settings, boards, folders and cards', async () => {
    const { storage, backup } = await load();
    await seed(storage);

    const { backup: file, missingAssets } = await backup.exportProfile('p1');

    expect(file.format).toBe(backup.BACKUP_FORMAT);
    expect(file.version).toBe(backup.BACKUP_VERSION);
    expect(missingAssets).toBe(0);
    expect(file.profile.name).toBe('Ada');
    // Settings travel with the child, or a restored board sounds wrong.
    expect(file.profile.settings?.voiceRate).toBe(1.3);
    expect(file.profile.settings?.language).toBe('ru');
    expect(file.boards).toHaveLength(2);
    expect(file.categories).toHaveLength(2);
    expect(file.items).toHaveLength(5);
  });

  it('inlines a parent’s photo and recording, and leaves bundled symbols as paths', async () => {
    const { storage, backup } = await load();
    await seed(storage);

    const { backup: file } = await backup.exportProfile('p1');
    const photo = file.items.find(i => i.id === 'i2')!;
    const symbol = file.items.find(i => i.id === 'i1')!;

    expect(photo.imageUrl).toBe(PHOTO);
    expect(photo.audioUrl).toBe(VOICE);
    // Inlining the 90 bundled pictograms would add megabytes for nothing.
    expect(symbol.imageUrl).toBe('/pictograms/2462.png');
  });

  it('refuses to export a profile that is gone', async () => {
    const { backup } = await load();
    await expect(backup.exportProfile('nope')).rejects.toThrow(backup.BackupError);
  });

  it('names the file so a parent can recognise it later', async () => {
    const { backup } = await load();
    expect(backup.backupFilename('Ada', Date.UTC(2026, 7, 28))).toMatch(/^speakeasy-Ada-2026-08-\d\d\.json$/);
    // A name with characters a filesystem dislikes must not produce a path.
    expect(backup.backupFilename('../../etc/passwd')).not.toContain('/');
  });
});

describe('round trip', () => {
  beforeEach(async () => { await resetIndexedDB(); vi.resetModules(); });

  const roundTrip = async () => {
    const { storage, backup } = await load();
    await seed(storage);
    const { backup: file } = await backup.exportProfile('p1');
    const reparsed = backup.parseBackup(backup.serializeBackup(file));
    const result = await backup.importProfile(reparsed);
    return { storage, backup, result };
  };

  it('restores every slot exactly, gaps included', async () => {
    const { storage, result } = await roundTrip();

    const items = await storage.getAllItems(result.profileId);
    const cats = await storage.getAllCategories(result.profileId);

    // Keyed by label, since ids are deliberately regenerated.
    const slotOf = (label: string) => items.find(i => i.label === label)?.slot;
    expect(slotOf('apple')).toBe(7);
    expect(slotOf('my photo')).toBe(23);
    expect(slotOf('more')).toBe(3);
    expect(slotOf('school')).toBe(11);
    expect(slotOf('teacher')).toBe(0);
    expect(cats.find(c => c.label === 'Food')?.slot).toBe(2);
    expect(cats.find(c => c.label === 'Fruit')?.slot).toBe(5);
  });

  it('keeps the per-card details a child depends on', async () => {
    const { storage, result } = await roundTrip();
    const items = await storage.getAllItems(result.profileId);

    const apple = items.find(i => i.label === 'apple')!;
    // labelKey is what lets a restored board still switch language in place.
    expect(apple.labelKey).toBe('vocab.apple');

    const photo = items.find(i => i.label === 'my photo')!;
    expect(photo.imageUrl).toBe(PHOTO);
    expect(photo.audioUrl).toBe(VOICE);
    expect(photo.imageFit).toBe('cover');

    expect(items.find(i => i.label === 'more')!.isCore).toBe(true);
    expect(items.find(i => i.label === 'teacher')!.isVisible).toBe(false);
    expect(await storage.getAllBoards(result.profileId)).toHaveLength(2);
  });

  it('rebuilds the folder tree and the board link with the new ids', async () => {
    const { storage, result } = await roundTrip();
    const items = await storage.getAllItems(result.profileId);
    const cats = await storage.getAllCategories(result.profileId);
    const boards = await storage.getAllBoards(result.profileId);

    const food = cats.find(c => c.label === 'Food')!;
    const fruit = cats.find(c => c.label === 'Fruit')!;
    const apple = items.find(i => i.label === 'apple')!;
    const link = items.find(i => i.label === 'school')!;
    const school = boards.find(b => b.label === 'School')!;

    // Nesting survives, pointing at the *new* ids.
    expect(fruit.parentId).toBe(food.id);
    expect(apple.category).toBe(fruit.id);
    expect(food.parentId).toBe('root');            // sentinel, never remapped
    expect(link.linkedBoardId).toBe(school.id);
    expect(result.droppedLinks).toBe(0);

    // Nothing kept an old id.
    for (const c of cats) expect(['c1', 'c2']).not.toContain(c.id);
    for (const i of items) expect(['i1', 'i2', 'i3', 'i4', 'i5']).not.toContain(i.id);
    for (const b of boards) expect(['b1', 'b2']).not.toContain(b.id);
  });

  it('leaves the original child completely untouched', async () => {
    const { storage, result } = await roundTrip();

    expect(result.profileId).not.toBe('p1');

    // The original still has exactly what it had, and none of it moved.
    const original = await storage.getAllItems('p1');
    expect(original).toHaveLength(5);            // 4 on the home board + 1 on School
    expect(original.map(i => i.id).sort()).toEqual(['i1', 'i2', 'i3', 'i4', 'i5']);
    expect(original.find(i => i.id === 'i2')?.slot).toBe(23);

    const profiles = await storage.getAllProfiles();
    expect(profiles).toHaveLength(2);
    expect(profiles.find(p => p.id === 'p1')?.name).toBe('Ada');
    // Same name already taken, so the import is distinguishable in the picker.
    expect(profiles.find(p => p.id === result.profileId)?.name).toBe('Ada (2)');
  });

  it('survives being imported twice without the two colliding', async () => {
    const { storage, backup } = await load();
    await seed(storage);
    const { backup: file } = await backup.exportProfile('p1');

    const first = await backup.importProfile(backup.parseBackup(backup.serializeBackup(file)));
    const second = await backup.importProfile(backup.parseBackup(backup.serializeBackup(file)));

    expect(first.profileId).not.toBe(second.profileId);
    expect((await storage.getAllProfiles()).map(p => p.name).sort()).toEqual(['Ada', 'Ada (2)', 'Ada (3)']);
    // Each copy has its own cards; neither absorbed the other's.
    expect(await storage.getAllItems(first.profileId)).toHaveLength(5);
    expect(await storage.getAllItems(second.profileId)).toHaveLength(5);
    expect(await storage.getAllItems('p1')).toHaveLength(5);
  });
});

describe('a file chosen by a parent is untrusted', () => {
  beforeEach(async () => { await resetIndexedDB(); vi.resetModules(); });

  const valid = async () => {
    const { storage, backup } = await load();
    await seed(storage);
    const { backup: file } = await backup.exportProfile('p1');
    return { backup, file: JSON.parse(backup.serializeBackup(file)) };
  };

  it('rejects something that is not a backup', async () => {
    const { backup } = await load();
    expect(() => backup.parseBackup('not json at all')).toThrow(/not readable as JSON/);
    expect(() => backup.parseBackup('{"hello":"world"}')).toThrow(/not a SpeakEasy backup/);
    expect(() => backup.parseBackup('[]')).toThrow(/not a SpeakEasy backup/);
  });

  it('refuses a backup from a newer app rather than half-reading it', async () => {
    const { backup, file } = await valid();
    file.version = backup.BACKUP_VERSION + 1;
    expect(() => backup.parseBackup(JSON.stringify(file))).toThrow(/newer version/);
  });

  it('rejects a file whose references do not resolve', async () => {
    const { backup, file } = await valid();

    const missingBoard = structuredClone(file);
    missingBoard.items[0].boardId = 'ghost';
    expect(() => backup.parseBackup(JSON.stringify(missingBoard))).toThrow(/board that is not in the file/);

    const missingFolder = structuredClone(file);
    missingFolder.items.find((i: any) => i.label === 'apple').category = 'ghost';
    expect(() => backup.parseBackup(JSON.stringify(missingFolder))).toThrow(/folder that is not in the file/);

    const missingParent = structuredClone(file);
    missingParent.categories.find((c: any) => c.label === 'Fruit').parentId = 'ghost';
    expect(() => backup.parseBackup(JSON.stringify(missingParent))).toThrow(/folder inside a folder/);
  });

  it('rejects duplicates and empty or missing sections', async () => {
    const { backup, file } = await valid();

    const dupes = structuredClone(file);
    dupes.boards.push(structuredClone(dupes.boards[0]));
    expect(() => backup.parseBackup(JSON.stringify(dupes))).toThrow(/duplicate boards/);

    const noBoards = structuredClone(file);
    noBoards.boards = [];
    expect(() => backup.parseBackup(JSON.stringify(noBoards))).toThrow(/no boards/);

    const noProfile = structuredClone(file);
    delete noProfile.profile;
    expect(() => backup.parseBackup(JSON.stringify(noProfile))).toThrow(/missing its child profile/);

    const noItems = structuredClone(file);
    delete noItems.items;
    expect(() => backup.parseBackup(JSON.stringify(noItems))).toThrow(/missing its items/);
  });

  it('drops a board link that points outside the file, and says how many', async () => {
    const { storage, backup } = await load();
    await seed(storage);
    const { backup: file } = await backup.exportProfile('p1');

    // Simulate a hand-edited or partial file: the linked board is absent.
    const trimmed = structuredClone(file);
    trimmed.boards = trimmed.boards.filter(b => b.label !== 'School');
    trimmed.items = trimmed.items.filter(i => i.label !== 'teacher');

    const result = await backup.importProfile(backup.parseBackup(JSON.stringify(trimmed)));
    expect(result.droppedLinks).toBe(1);

    const link = (await storage.getAllItems(result.profileId)).find(i => i.label === 'school')!;
    // Better a card that says its word than one that navigates nowhere.
    expect(link.linkedBoardId).toBeUndefined();
    expect(link.label).toBe('school');
  });
});

describe('encoding the file for a device', () => {
  it('round-trips UTF-8, including the Cyrillic labels this app actually stores', async () => {
    const { encodeUtf8Base64 } = await import('../utils/fileTransfer');
    const decode = (b64: string) =>
      new TextDecoder().decode(Uint8Array.from(atob(b64), c => c.charCodeAt(0)));

    for (const sample of [
      'plain ascii',
      'Я хочу — ещё раз',            // ru labels, em dash
      "J'aime · por la mañana",      // fr/es with accents and a middle dot
      '{"emoji":"🙂","tab":"\t"}',
    ]) {
      expect(decode(encodeUtf8Base64(sample))).toBe(sample);
    }
  });

  it('handles a payload larger than one chunk without overflowing', async () => {
    const { encodeUtf8Base64 } = await import('../utils/fileTransfer');
    // Comfortably past the 0x8000 chunk boundary, in multi-byte characters.
    const big = 'ё'.repeat(200_000);
    const out = encodeUtf8Base64(big);
    const decoded = new TextDecoder().decode(Uint8Array.from(atob(out), c => c.charCodeAt(0)));
    expect(decoded).toBe(big);
    expect(decoded.length).toBe(200_000);
  });
});
