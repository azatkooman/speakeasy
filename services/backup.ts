import { AACItem, Board, Category, ChildProfile } from '../types';
import {
  ROOT_FOLDER,
  getAllProfiles, getAllBoards, getAllCategories, getAllItems,
  saveProfile, saveBoardsBatch, saveCategoriesBatch, saveItemsBatch,
  readAssetAsDataUrl,
} from './storage';

/**
 * Export and import one child's boards as a single file.
 *
 * ── Why this exists ──────────────────────────────────────────────────────────
 *
 * Everything a family builds lives in one device's IndexedDB and nowhere else.
 * A parent replacing a tablet, or clearing site data, or hitting a failed
 * upgrade, loses months of a child's vocabulary with no recovery path. For an
 * app that is somebody's voice, having no way out of the device is the most
 * serious gap in it.
 *
 * ── Two rules ────────────────────────────────────────────────────────────────
 *
 * **Import never modifies an existing child.** It always creates a new profile
 * with freshly generated ids. There is no merge and no overwrite, because the
 * failure mode of getting that wrong is destroying a working board — worse than
 * the problem being solved. A parent who wants to replace a board imports and
 * then deletes the old profile themselves, having seen that the import worked.
 *
 * **Positions survive exactly.** `slot` is copied verbatim, never recomputed.
 * A child reaches for a word without looking, so a backup that restores the
 * right words in the wrong cells has destroyed the thing worth restoring. The
 * same goes for `labelKey`: it is what lets a restored board still switch
 * language in place.
 *
 * ── Format ───────────────────────────────────────────────────────────────────
 *
 * One JSON file with assets inlined as `data:` URLs. Photos and recordings make
 * that file big — a board of camera photos can run to several megabytes — but a
 * single self-contained file needs no archive library, no temp directory, and
 * survives being emailed to yourself, which is what parents will actually do.
 * Bundled pictograms stay as paths, since they ship inside every copy of the app.
 */

export const BACKUP_FORMAT = 'speakeasy-aac-backup';

/**
 * Bump only for a change an older app genuinely cannot read. The importer
 * refuses versions above what it knows, and says so, rather than half-reading a
 * newer file.
 */
export const BACKUP_VERSION = 1;

export interface BackupFile {
  format: string;
  version: number;
  exportedAt: number;
  /** Schema the data came from, so a future importer can migrate rather than guess. */
  dbSchema: number;
  profile: ChildProfile;
  boards: Board[];
  categories: Category[];
  items: AACItem[];
}

export interface ExportResult {
  backup: BackupFile;
  /** Assets whose file had gone missing and could not be included. */
  missingAssets: number;
}

export interface ImportResult {
  profileId: string;
  name: string;
  boards: number;
  categories: number;
  items: number;
  /** Board links that pointed outside this backup and were dropped. */
  droppedLinks: number;
}

/** A problem with the file itself, phrased for a parent rather than a log. */
export class BackupError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BackupError';
  }
}

const DB_SCHEMA = 7;

// ── Export ───────────────────────────────────────────────────────────────────

export const exportProfile = async (profileId: string): Promise<ExportResult> => {
  const profile = (await getAllProfiles()).find(p => p.id === profileId);
  if (!profile) throw new BackupError('That child profile no longer exists.');

  const [boards, categories, items] = await Promise.all([
    getAllBoards(profileId),
    getAllCategories(profileId),
    getAllItems(profileId),
  ]);

  let missingAssets = 0;
  const inline = async (url: string | undefined): Promise<string | undefined> => {
    if (!url) return undefined;
    const out = await readAssetAsDataUrl(url);
    if (out === undefined) missingAssets++;
    return out;
  };

  const exportedItems: AACItem[] = [];
  for (const item of items) {
    const imageUrl = await inline(item.imageUrl);
    const audioUrl = await inline(item.audioUrl);
    exportedItems.push({
      ...item,
      // A card with no image is still a card; keep it rather than drop the word.
      imageUrl: imageUrl ?? '',
      ...(audioUrl ? { audioUrl } : { audioUrl: undefined }),
    });
  }

  const exportedCategories: Category[] = [];
  for (const cat of categories) {
    const icon = await inline(cat.icon);
    exportedCategories.push({ ...cat, icon });
  }

  return {
    backup: {
      format: BACKUP_FORMAT,
      version: BACKUP_VERSION,
      exportedAt: Date.now(),
      dbSchema: DB_SCHEMA,
      profile,
      boards,
      categories: exportedCategories,
      items: exportedItems,
    },
    missingAssets,
  };
};

/** A filename a parent can recognise a year later. */
export const backupFilename = (profileName: string, at: number = Date.now()): string => {
  const d = new Date(at);
  const pad = (n: number) => String(n).padStart(2, '0');
  const stamp = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const safe = (profileName || 'child').replace(/[^\p{L}\p{N}_-]+/gu, '-').replace(/^-+|-+$/g, '');
  return `speakeasy-${safe || 'child'}-${stamp}.json`;
};

export const serializeBackup = (backup: BackupFile): string => JSON.stringify(backup);

// ── Validation ───────────────────────────────────────────────────────────────

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/**
 * Parse and check a file chosen by the parent. This is the one place untrusted
 * input enters, so it is strict: a file whose internal references do not resolve
 * is rejected outright rather than imported into a board with cards in the wrong
 * cells, which would look like a successful restore.
 */
export const parseBackup = (text: string): BackupFile => {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new BackupError('That file is not a SpeakEasy backup — it is not readable as JSON.');
  }
  if (!isObject(raw)) throw new BackupError('That file is not a SpeakEasy backup.');
  if (raw.format !== BACKUP_FORMAT) {
    throw new BackupError('That file is not a SpeakEasy backup.');
  }
  if (typeof raw.version !== 'number' || !Number.isFinite(raw.version)) {
    throw new BackupError('That backup has no version and cannot be read.');
  }
  if (raw.version > BACKUP_VERSION) {
    throw new BackupError(
      'That backup was made by a newer version of SpeakEasy. Update the app and try again.',
    );
  }
  if (!isObject(raw.profile) || typeof raw.profile.name !== 'string' || typeof raw.profile.id !== 'string') {
    throw new BackupError('That backup is missing its child profile.');
  }
  for (const key of ['boards', 'categories', 'items'] as const) {
    if (!Array.isArray(raw[key])) throw new BackupError(`That backup is missing its ${key}.`);
  }

  const boards = raw.boards as Board[];
  const categories = raw.categories as Category[];
  const items = raw.items as AACItem[];

  if (boards.length === 0) throw new BackupError('That backup contains no boards.');

  const boardIds = new Set(boards.map(b => b?.id).filter(Boolean));
  const categoryIds = new Set(categories.map(c => c?.id).filter(Boolean));

  if (boardIds.size !== boards.length) throw new BackupError('That backup has duplicate boards.');
  if (categoryIds.size !== categories.length) throw new BackupError('That backup has duplicate folders.');

  for (const c of categories) {
    if (!isObject(c) || typeof c.id !== 'string' || typeof c.boardId !== 'string') {
      throw new BackupError('That backup has a folder with missing details.');
    }
    if (!boardIds.has(c.boardId)) {
      throw new BackupError('That backup has a folder belonging to a board that is not in the file.');
    }
    const parent = (c as Category).parentId;
    if (parent && parent !== ROOT_FOLDER && !categoryIds.has(parent)) {
      throw new BackupError('That backup has a folder inside a folder that is not in the file.');
    }
  }

  for (const i of items) {
    if (!isObject(i) || typeof i.id !== 'string' || typeof i.boardId !== 'string') {
      throw new BackupError('That backup has a card with missing details.');
    }
    if (!boardIds.has(i.boardId)) {
      throw new BackupError('That backup has a card belonging to a board that is not in the file.');
    }
    const cat = (i as AACItem).category;
    // Core-rail cards are board-scoped and ignore `category`.
    if (!(i as AACItem).isCore && cat && cat !== ROOT_FOLDER && !categoryIds.has(cat)) {
      throw new BackupError('That backup has a card in a folder that is not in the file.');
    }
  }

  return raw as unknown as BackupFile;
};

// ── Import ───────────────────────────────────────────────────────────────────

const uniqueName = (wanted: string, taken: string[]): string => {
  const names = new Set(taken);
  if (!names.has(wanted)) return wanted;
  for (let n = 2; n < 500; n++) {
    const candidate = `${wanted} (${n})`;
    if (!names.has(candidate)) return candidate;
  }
  return `${wanted} (${Date.now()})`;
};

/**
 * Write a validated backup in as a brand-new profile.
 *
 * Every id is regenerated and every reference rewritten to match, so importing
 * a backup onto the device it came from produces a second, independent child
 * rather than silently overwriting the first. ROOT_FOLDER is a sentinel, not an
 * id, so it is never remapped.
 */
export const importProfile = async (backup: BackupFile): Promise<ImportResult> => {
  const existing = await getAllProfiles();

  const newProfileId = crypto.randomUUID();
  const boardMap = new Map<string, string>(backup.boards.map(b => [b.id, crypto.randomUUID()]));
  const catMap = new Map<string, string>(backup.categories.map(c => [c.id, crypto.randomUUID()]));

  const mapCategory = (id: string | undefined): string | undefined => {
    if (!id || id === ROOT_FOLDER) return id;
    return catMap.get(id) ?? ROOT_FOLDER;
  };

  const profile: ChildProfile = {
    ...backup.profile,
    id: newProfileId,
    name: uniqueName(backup.profile.name, existing.map(p => p.name)),
  };

  const boards: Board[] = backup.boards.map(b => ({
    ...b,
    id: boardMap.get(b.id)!,
    profileId: newProfileId,
  }));

  const categories: Category[] = backup.categories.map(c => ({
    ...c,
    id: catMap.get(c.id)!,
    profileId: newProfileId,
    boardId: boardMap.get(c.boardId)!,
    parentId: mapCategory(c.parentId),
  }));

  let droppedLinks = 0;
  const items: AACItem[] = backup.items.map(i => {
    let linkedBoardId = i.linkedBoardId;
    if (linkedBoardId) {
      const mapped = boardMap.get(linkedBoardId);
      // A link out of this backup would navigate nowhere; drop it and report.
      if (mapped) linkedBoardId = mapped;
      else { linkedBoardId = undefined; droppedLinks++; }
    }
    return {
      ...i,
      id: crypto.randomUUID(),
      profileId: newProfileId,
      boardId: boardMap.get(i.boardId)!,
      category: mapCategory(i.category) ?? ROOT_FOLDER,
      linkedBoardId,
    };
  });

  /*
   * Profile last would be tidier, but it is written first on purpose: the other
   * three carry its id, and a crash midway is far easier to reason about — and
   * to clean up in the UI — when the profile the orphans belong to exists.
   */
  await saveProfile(profile);
  await saveBoardsBatch(boards);
  await saveCategoriesBatch(categories);
  await saveItemsBatch(items);

  return {
    profileId: newProfileId,
    name: profile.name,
    boards: boards.length,
    categories: categories.length,
    items: items.length,
    droppedLinks,
  };
};
