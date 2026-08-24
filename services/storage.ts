
import { Capacitor } from '@capacitor/core';
import { AACItem, Category, Board, ChildProfile, ColorTheme } from '../types';
import { CORE_RAIL, FOLDER_VOCAB, VocabEntry } from '../utils/starterVocabulary';
import { Filesystem as CapFilesystem, Directory as CapDirectory, Encoding as CapEncoding } from '@capacitor/filesystem';
import { TranslationKey } from './translations';
import { SEED_PICTOGRAMS, resolveSeedPictogram, isBundledAsset } from '../utils/seedPictograms';

const DB_NAME = 'speakeasy_aac_db';
const DB_VERSION = 7;
const STORE_ITEMS = 'aac_items';
const STORE_CATEGORIES = 'aac_categories';
const STORE_BOARDS = 'aac_boards';
const STORE_PROFILES = 'aac_profiles';

export const ROOT_FOLDER = 'root';

// --- FILESYSTEM HELPERS ---

// Export safe access to Filesystem and Directory
export const Filesystem = CapFilesystem;

// Directory might be missing or undefined in some web ESM builds
export const Directory = CapDirectory || {
    Data: 'DATA',
    Documents: 'DOCUMENTS',
    Cache: 'CACHE',
    External: 'EXTERNAL'
};

export const Encoding = CapEncoding || {
    UTF8: 'utf8',
    ASCII: 'ascii',
    UTF16: 'utf16'
};

// Robust check for Native Platform
const isNative = typeof Capacitor !== 'undefined' && Capacitor.isNativePlatform ? Capacitor.isNativePlatform() : false;

const saveAssetToFile = async (dataUrl: string | undefined): Promise<string | undefined> => {
    if (!dataUrl || !dataUrl.startsWith('data:') || !isNative) return dataUrl;

    try {
        const matches = dataUrl.match(/^data:(.+);base64,(.+)$/);
        if (!matches) return dataUrl;

        let ext = matches[1].split('/')[1] || 'bin';
        if (ext.includes(';')) ext = ext.split(';')[0];
        
        const fileName = `${crypto.randomUUID()}.${ext}`;
        const targetDirectory = (Directory && Directory.Data) ? Directory.Data : 'DATA';

        const savedFile = await Filesystem.writeFile({
            path: fileName,
            data: matches[2],
            directory: targetDirectory as any,
            recursive: true
        });

        return savedFile.uri;
    } catch (e) {
        console.error("Filesystem save failed, using DB:", e);
        return dataUrl;
    }
};

const deleteAssetFile = async (path: string | undefined) => {
    if (!path || !isNative) return;
    let cleanPath = path;
    if (path.startsWith('file://')) cleanPath = path.substring(path.lastIndexOf('/') + 1);
    else if (path.includes('_capacitor_file_')) cleanPath = path.substring(path.lastIndexOf('/') + 1);

    try {
        const targetDirectory = (Directory && Directory.Data) ? Directory.Data : 'DATA';
        await Filesystem.deleteFile({ path: cleanPath, directory: targetDirectory as any });
    } catch (e) { /* Ignore */ }
};

const getDisplayUrl = (rawPath: string | undefined): string | undefined => {
    // Existing installs have the old static.arasaac.org URLs for their default
    // cards. Swap them for the bundled copies on read so those cards render
    // offline too, without migrating the database.
    const path = resolveSeedPictogram(rawPath);
    if (!path) return undefined;
    if (!isNative) return path;
    if (path.startsWith('data:') || path.startsWith('http') || !path.includes('/')) return path;
    // Assets bundled with the web build are already served from the app origin.
    // Running them through convertFileSrc() rewrites them to a filesystem URL
    // that does not exist, which renders them as broken images.
    if (isBundledAsset(path)) return path;
    if (Capacitor && Capacitor.convertFileSrc) return Capacitor.convertFileSrc(path);
    return path;
};

const getStorageUrl = (path: string | undefined): string | undefined => {
    if (!path) return undefined;
    if (!isNative) return path;
    if (path.includes('_capacitor_file_')) {
        const suffix = path.split('_capacitor_file_')[1];
        return `file://${suffix}`;
    }
    return path;
};

// --- DB HELPERS ---

const DEFAULT_CATEGORIES_TEMPLATE: Array<{
    id: string;
    labelKey: TranslationKey;
    fallback: string;
    colorTheme: string;
    parentId: string;
    icon: string;
    slot: number;
}> = [
  { id: 'PEOPLE', labelKey: 'folder.default.people', fallback: 'People', colorTheme: 'yellow', parentId: 'root', icon: 'people', slot: 0 },
  { id: 'VERB', labelKey: 'folder.default.actions', fallback: 'Actions', colorTheme: 'green', parentId: 'root', icon: 'actions', slot: 1 },
  { id: 'NOUN', labelKey: 'folder.default.things', fallback: 'Things', colorTheme: 'orange', parentId: 'root', icon: 'things', slot: 2 },
  { id: 'ADJECTIVE', labelKey: 'folder.default.desc', fallback: 'Desc.', colorTheme: 'blue', parentId: 'root', icon: 'desc', slot: 3 },
  { id: 'SOCIAL', labelKey: 'folder.default.social', fallback: 'Social', colorTheme: 'pink', parentId: 'root', icon: 'social', slot: 4 },
  { id: 'PLACES', labelKey: 'folder.default.places', fallback: 'Places', colorTheme: 'purple', parentId: 'root', icon: 'places', slot: 5 },
  { id: 'FOOD', labelKey: 'folder.default.food', fallback: 'Food', colorTheme: 'orange', parentId: 'root', icon: 'food', slot: 6 }, 
  { id: 'TIME', labelKey: 'folder.default.time', fallback: 'Time', colorTheme: 'teal', parentId: 'root', icon: 'time', slot: 7 },
];

export const IDX_PROFILE = 'by_profile';
export const IDX_BOARD = 'by_board';

/**
 * Grid density presets. Rows x cols, landscape-oriented so a tablet held the
 * usual way gets wider-than-tall grids. `large` means fewer, bigger cards.
 */
export const GRID_PRESETS = {
  large:  { rows: 3, cols: 4 },   // 12 cells
  medium: { rows: 4, cols: 6 },   // 24 cells
  small:  { rows: 5, cols: 8 },   // 40 cells
} as const;

/** Default grid for boards created before gridRows/gridCols existed. */
export const DEFAULT_GRID_ROWS = GRID_PRESETS.medium.rows;
export const DEFAULT_GRID_COLS = GRID_PRESETS.medium.cols;

/** Closest preset for a board's actual dimensions, for showing the selection. */
export const gridSizeForBoard = (rows?: number, cols?: number): 'small' | 'medium' | 'large' => {
  const cells = (rows || DEFAULT_GRID_ROWS) * (cols || DEFAULT_GRID_COLS);
  let best: 'small' | 'medium' | 'large' = 'medium';
  let bestDelta = Infinity;
  (Object.keys(GRID_PRESETS) as Array<keyof typeof GRID_PRESETS>).forEach(k => {
    const p = GRID_PRESETS[k];
    const delta = Math.abs(p.rows * p.cols - cells);
    if (delta < bestDelta) { bestDelta = delta; best = k; }
  });
  return best;
};

/**
 * v6 -> v7. Converts the compacted `order` into an absolute `slot`, and gives
 * every board explicit grid dimensions.
 *
 * Cards and folders that live in the same parent folder are collected into one
 * list, sorted the way the old grid sorted them, and assigned slots 0..n. That
 * reproduces the arrangement the parent already sees, so nothing appears to
 * move on upgrade — the difference is that from now on those positions are
 * absolute and hiding or deleting an item leaves a gap instead of shifting
 * everything after it.
 *
 * Everything happens on the upgrade transaction, so a failure aborts the whole
 * thing and the database stays on v6 rather than half-migrated.
 */
const migrateOrderToSlot = (tx: IDBTransaction) => {
  const legacySort = (a: any, b: any) => {
    if (a.order !== undefined && b.order !== undefined) return a.order - b.order;
    if (a.order !== undefined) return -1;
    if (b.order !== undefined) return 1;
    return (b.createdAt || 0) - (a.createdAt || 0);
  };

  // Boards: explicit grid dimensions.
  const boardStore = tx.objectStore(STORE_BOARDS);
  boardStore.getAll().onsuccess = (e) => {
    const boards = (e.target as IDBRequest<Board[]>).result || [];
    boards.forEach(b => {
      if (typeof b.gridRows !== 'number' || typeof b.gridCols !== 'number') {
        boardStore.put({ ...b, gridRows: DEFAULT_GRID_ROWS, gridCols: DEFAULT_GRID_COLS });
      }
    });
  };

  // Items and folders share a slot space per (board, parent folder).
  const itemStore = tx.objectStore(STORE_ITEMS);
  const catStore = tx.objectStore(STORE_CATEGORIES);

  itemStore.getAll().onsuccess = (ie) => {
    const items = ((ie.target as IDBRequest<AACItem[]>).result || []);
    catStore.getAll().onsuccess = (ce) => {
      const cats = ((ce.target as IDBRequest<Category[]>).result || []);

      // Group by board + containing folder. An item's container is `category`;
      // a folder's is `parentId`.
      const buckets = new Map<string, Array<{ rec: any; kind: 'item' | 'cat' }>>();
      const push = (key: string, rec: any, kind: 'item' | 'cat') => {
        if (!buckets.has(key)) buckets.set(key, []);
        buckets.get(key)!.push({ rec, kind });
      };

      items.forEach(i => push(`${i.boardId}|${i.category || ROOT_FOLDER}`, i, 'item'));
      cats.forEach(c => push(`${c.boardId}|${c.parentId || ROOT_FOLDER}`, c, 'cat'));

      buckets.forEach(entries => {
        entries.sort((a, b) => legacySort(a.rec, b.rec));
        entries.forEach(({ rec, kind }, index) => {
          if (rec.slot === index) return;
          const next = { ...rec, slot: index };
          (kind === 'item' ? itemStore : catStore).put(next);
        });
      });
    };
  };
};

/**
 * Single cached connection. Every read and write used to call openDB(), which
 * opened a fresh IDBDatabase and never closed it — and since reloadCurrentData()
 * issues three reads after every mutation, editing one card opened four
 * connections. They accumulated for the session and would block the next
 * version upgrade.
 */
let dbPromise: Promise<IDBDatabase> | null = null;

const openDB = (): Promise<IDBDatabase> => {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = request.result;
      const tx = request.transaction;
      if (!tx) return;

      const ensureStore = (name: string) =>
        db.objectStoreNames.contains(name)
          ? tx.objectStore(name)
          : db.createObjectStore(name, { keyPath: 'id' });

      const ensureIndex = (store: IDBObjectStore, name: string, keyPath: string) => {
        if (!store.indexNames.contains(name)) store.createIndex(name, keyPath);
      };

      // v6 adds the profileId / boardId indices. Reads previously did
      // getAll() and filtered in JS, so opening one folder deserialised every
      // card of every profile — including the inline base64 images on web.
      const items = ensureStore(STORE_ITEMS);
      ensureIndex(items, IDX_PROFILE, 'profileId');
      ensureIndex(items, IDX_BOARD, 'boardId');

      const categories = ensureStore(STORE_CATEGORIES);
      ensureIndex(categories, IDX_PROFILE, 'profileId');
      ensureIndex(categories, IDX_BOARD, 'boardId');

      const boards = ensureStore(STORE_BOARDS);
      ensureIndex(boards, IDX_PROFILE, 'profileId');

      ensureStore(STORE_PROFILES);

      // --- v7: compacted `order` becomes absolute `slot` ---
      // Runs inside the upgrade transaction, so either the whole migration
      // lands or the version does not advance. Cards and folders in the same
      // parent folder share one slot space, assigned by walking the old order,
      // so existing boards keep the exact arrangement the parent built.
      if (event.oldVersion < 7) {
        migrateOrderToSlot(tx);
      }
    };

    request.onsuccess = () => {
      const db = request.result;
      // If another tab upgrades the schema, drop this connection so it does not
      // block the upgrade, and let the next call reopen.
      db.onversionchange = () => {
        db.close();
        dbPromise = null;
      };
      db.onclose = () => { dbPromise = null; };
      resolve(db);
    };

    request.onerror = () => {
      dbPromise = null;
      reject(request.error);
    };
    request.onblocked = () => {
      console.warn('IndexedDB upgrade blocked by another open connection');
    };
  });

  return dbPromise;
};

/** getAll() over an index when a filter is given, otherwise the whole store. */
const getAllBy = <T>(store: IDBObjectStore, indexName: string, value?: string): IDBRequest<T[]> =>
  value ? store.index(indexName).getAll(value) : store.getAll();

// --- PROFILES ---

export const getAllProfiles = async (): Promise<ChildProfile[]> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const t = db.transaction(STORE_PROFILES, 'readonly');
        const r = t.objectStore(STORE_PROFILES).getAll();
        r.onsuccess = () => resolve(r.result);
        r.onerror = () => reject(r.error);
    });
};

export const saveProfile = async (profile: ChildProfile): Promise<void> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const t = db.transaction(STORE_PROFILES, 'readwrite');
        t.objectStore(STORE_PROFILES).put(profile);
        t.oncomplete = () => resolve();
        t.onerror = () => reject(t.error);
    });
};

export const deleteProfile = async (profileId: string): Promise<void> => {
    const allItems = await getAllItems(profileId);
    const allBoards = await getAllBoards(profileId);
    const allCats = await getAllCategories(profileId);

    await Promise.all(allItems.map(i => deleteItem(i.id)));
    await Promise.all(allCats.map(cat => deleteAssetFile(cat.icon)));

    const db = await openDB();
    return new Promise((resolve, reject) => {
        const t = db.transaction([STORE_PROFILES, STORE_BOARDS, STORE_CATEGORIES], 'readwrite');
        t.objectStore(STORE_PROFILES).delete(profileId);
        const bStore = t.objectStore(STORE_BOARDS);
        allBoards.forEach(b => bStore.delete(b.id));
        const cStore = t.objectStore(STORE_CATEGORIES);
        allCats.forEach(c => cStore.delete(c.id));
        t.oncomplete = () => resolve();
        t.onerror = () => reject(t.error);
    });
};

// --- BOARDS ---

export const getAllBoards = async (profileId?: string): Promise<Board[]> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const t = db.transaction(STORE_BOARDS, 'readonly');
        const r = getAllBy<Board>(t.objectStore(STORE_BOARDS), IDX_PROFILE, profileId);
        r.onsuccess = () => resolve(r.result);
        r.onerror = () => reject(r.error);
    });
};

export const saveBoard = async (board: Board): Promise<void> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const t = db.transaction(STORE_BOARDS, 'readwrite');
        t.objectStore(STORE_BOARDS).put(board);
        t.oncomplete = () => resolve();
        t.onerror = () => reject(t.error);
    });
};

export const saveBoardsBatch = async (boards: Board[]): Promise<void> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const t = db.transaction(STORE_BOARDS, 'readwrite');
        const s = t.objectStore(STORE_BOARDS);
        boards.forEach(b => s.put(b));
        t.oncomplete = () => resolve();
        t.onerror = () => reject(t.error);
    });
};

/**
 * Builds the starter-vocabulary cards for a board.
 *
 * Shared by both entry points on purpose. A new profile used to get the whole
 * vocabulary while a new *board* got the eight folders and no words at all —
 * a parent adding a second board for school found it empty and had to build it
 * by hand. Same seed, both paths.
 *
 * Order in utils/starterVocabulary.ts is the slot, so the same word lands in
 * the same cell on every board, in every language.
 */
const buildStarterCards = (
    boardId: string,
    profileId: string,
    folderIdByTemplate: Record<string, string>,
    t?: (key: TranslationKey) => string,
): AACItem[] => {
    const card = (entry: VocabEntry, catId: string, slot: number, isCore: boolean): AACItem => {
        const key = `vocab.${entry.id}`;
        return {
            id: crypto.randomUUID(),
            profileId,
            boardId,
            label: t ? t(key as TranslationKey) : entry.labels.en,
            labelKey: key,
            imageUrl: `/pictograms/${entry.arasaac}.png`,
            imageFit: 'contain',
            category: catId,
            colorTheme: entry.color as ColorTheme | undefined,
            createdAt: Date.now(),
            slot,
            isCore,
            isVisible: true,
        };
    };

    return [
        // The core rail: board-scoped, so these stay reachable inside every
        // folder. `slot` here is the position in the rail, not in the grid.
        ...CORE_RAIL.map((entry, i) => card(entry, ROOT_FOLDER, i, true)),
        ...Object.entries(FOLDER_VOCAB).flatMap(([template, entries]) => {
            const catId = folderIdByTemplate[template];
            if (!catId) {
                // A folder the template no longer defines would silently drop
                // its words; better to notice than to ship a board missing one.
                console.warn(`Starter vocabulary references unknown folder "${template}"`);
                return [];
            }
            return entries.map((entry, i) => card(entry, catId, i, false));
        }),
    ];
};

export const initializeBoards = async (defaultName: string, profileId: string, t?: (key: TranslationKey) => string): Promise<string> => {
    const boards = await getAllBoards(profileId);
    if (boards.length > 0) return boards[0].id;

    const defaultBoard: Board = {
        id: crypto.randomUUID(),
        profileId,
        label: defaultName,
        createdAt: Date.now(),
        gridRows: DEFAULT_GRID_ROWS,
        gridCols: DEFAULT_GRID_COLS
    };
    await saveBoard(defaultBoard);

    // Template id -> the id the folder actually got, so the starter vocabulary
    // can be filed into the right folders.
    const folderIdByTemplate: Record<string, string> = {};

    const catsToCreate: Category[] = DEFAULT_CATEGORIES_TEMPLATE.map(c => {
        const newId = crypto.randomUUID();
        folderIdByTemplate[c.id] = newId;
        return {
            ...c, 
            id: newId,
            boardId: defaultBoard.id,
            profileId,
            label: t ? t(c.labelKey) : c.fallback,
            labelKey: c.labelKey, // Save the translation key!
            colorTheme: c.colorTheme as any 
        };
    });
    
    // Use saveCategoriesBatch to ensure files (if any) are handled, though default icons are simple strings
    await saveCategoriesBatch(catsToCreate);

    const createDefaultCard = (id: string, labelKey: TranslationKey, fallback: string, iconUrl: string, catId: string, color: ColorTheme, slot: number, isCore = false): AACItem => ({
        id,
        profileId,
        boardId: defaultBoard.id,
        label: t ? t(labelKey) : fallback,
        labelKey, // Save translation key
        imageUrl: iconUrl,
        imageFit: 'contain',
        category: catId,
        colorTheme: color,
        createdAt: Date.now(),
        slot,
        isCore,
        isVisible: true
    });

    const defaultCards = buildStarterCards(defaultBoard.id, profileId, folderIdByTemplate, t);

    await saveItemsBatch(defaultCards);
    return defaultBoard.id;
};

export const createNewBoard = async (label: string, profileId: string, t?: (key: TranslationKey) => string): Promise<string> => {
    const newId = crypto.randomUUID();
    const board: Board = {
        id: newId,
        profileId,
        label,
        createdAt: Date.now(),
        gridRows: DEFAULT_GRID_ROWS,
        gridCols: DEFAULT_GRID_COLS
    };
    await saveBoard(board);

    const folderIdByTemplate: Record<string, string> = {};
    const newCats: Category[] = DEFAULT_CATEGORIES_TEMPLATE.map(c => {
        const id = crypto.randomUUID();
        folderIdByTemplate[c.id] = id;
        return {
            ...c,
            id,
            boardId: newId,
            profileId,
            label: t ? t(c.labelKey) : c.fallback,
            labelKey: c.labelKey,
            colorTheme: c.colorTheme as any
        };
    });
    await saveCategoriesBatch(newCats);
    await saveItemsBatch(buildStarterCards(newId, profileId, folderIdByTemplate, t));

    return newId;
};

export const deleteBoard = async (boardId: string): Promise<void> => {
    const allItems = await getAllItems();
    const boardItems = allItems.filter(i => i.boardId === boardId);
    for (const item of boardItems) await deleteItem(item.id);

    // Cards on *other* boards that jump to this one would otherwise keep
    // pointing at a board that no longer exists. Tapping such a card left the
    // child on an empty board with no breadcrumb and no way back. Clear the
    // link rather than deleting the card, so the parent keeps the vocabulary
    // and can re-point or remove it.
    const danglingLinks = allItems.filter(i => i.boardId !== boardId && i.linkedBoardId === boardId);
    if (danglingLinks.length > 0) {
        await saveItemsBatch(danglingLinks.map(i => ({ ...i, linkedBoardId: undefined })));
    }

    const allCats = await getAllCategories();
    const catsToDelete = allCats.filter(c => c.boardId === boardId);
    for (const cat of catsToDelete) await deleteAssetFile(cat.icon);

    const db = await openDB();
    return new Promise((resolve, reject) => {
        const t = db.transaction([STORE_BOARDS, STORE_CATEGORIES], 'readwrite');
        t.objectStore(STORE_BOARDS).delete(boardId);
        const cStore = t.objectStore(STORE_CATEGORIES);
        catsToDelete.forEach(c => cStore.delete(c.id));
        t.oncomplete = () => resolve();
        t.onerror = () => reject(t.error);
    });
};

// --- ITEMS ---

export const saveItem = async (item: AACItem): Promise<void> => {
    const db = await openDB();
    const existing = await getItemById(item.id);
    
    let imageUrl = getStorageUrl(item.imageUrl) || item.imageUrl;
    let audioUrl = getStorageUrl(item.audioUrl);

    imageUrl = await saveAssetToFile(imageUrl) || imageUrl;
    audioUrl = await saveAssetToFile(audioUrl);

    const finalItem = { ...item, imageUrl, audioUrl: audioUrl || undefined };

    /*
     * Write the new asset, commit the record, and only then delete the old
     * asset. The previous order deleted first, so a failed or aborted
     * IndexedDB write left the stored record pointing at a file that no longer
     * existed — a card with a missing symbol, and no way back to it. Losing a
     * superseded file to a failed cleanup is recoverable; losing the file the
     * live record depends on is not.
     */
    const stale: (string | undefined)[] = existing
        ? [
            existing.imageUrl && existing.imageUrl !== imageUrl ? existing.imageUrl : undefined,
            existing.audioUrl && existing.audioUrl !== audioUrl ? existing.audioUrl : undefined,
          ]
        : [];

    return new Promise((resolve, reject) => {
        const t = db.transaction(STORE_ITEMS, 'readwrite');
        t.objectStore(STORE_ITEMS).put(finalItem);
        t.oncomplete = () => {
            // Best effort, and only after the record is safely committed.
            Promise.all(stale.filter(Boolean).map(p => deleteAssetFile(p as string)))
                .catch(e => console.error('Stale asset cleanup failed', e));
            resolve();
        };
        t.onerror = () => reject(t.error);
    });
};

export const saveItemsBatch = async (items: AACItem[]): Promise<void> => {
    const processed: AACItem[] = [];
    for (const item of items) {
        let imageUrl = getStorageUrl(item.imageUrl) || item.imageUrl;
        let audioUrl = getStorageUrl(item.audioUrl);
        imageUrl = await saveAssetToFile(imageUrl) || imageUrl;
        audioUrl = await saveAssetToFile(audioUrl);
        processed.push({ ...item, imageUrl, audioUrl: audioUrl || undefined });
    }

    const db = await openDB();
    return new Promise((resolve, reject) => {
        const t = db.transaction(STORE_ITEMS, 'readwrite');
        const s = t.objectStore(STORE_ITEMS);
        processed.forEach(i => s.put(i));
        t.oncomplete = () => resolve();
        t.onerror = () => reject(t.error);
    });
};

export const getAllItems = async (profileId?: string): Promise<AACItem[]> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const t = db.transaction(STORE_ITEMS, 'readonly');
        const r = getAllBy<AACItem>(t.objectStore(STORE_ITEMS), IDX_PROFILE, profileId);
        r.onsuccess = () => {
            const res = r.result;
            resolve(res.map(i => ({
                ...i,
                imageUrl: getDisplayUrl(i.imageUrl) || i.imageUrl,
                audioUrl: getDisplayUrl(i.audioUrl)
            })));
        };
        r.onerror = () => reject(r.error);
    });
};

export const deleteItem = async (id: string): Promise<void> => {
    const item = await getItemById(id);
    if (item) {
        await deleteAssetFile(item.imageUrl);
        await deleteAssetFile(item.audioUrl);
    }
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const t = db.transaction(STORE_ITEMS, 'readwrite');
        t.objectStore(STORE_ITEMS).delete(id);
        t.oncomplete = () => resolve();
        t.onerror = () => reject(t.error);
    });
};

const getItemById = async (id: string): Promise<AACItem | undefined> => {
    const db = await openDB();
    return new Promise((resolve) => {
        const t = db.transaction(STORE_ITEMS, 'readonly');
        const r = t.objectStore(STORE_ITEMS).get(id);
        r.onsuccess = () => resolve(r.result);
        r.onerror = () => resolve(undefined);
    });
};

// --- CATEGORIES ---

export const saveCategory = async (category: Category): Promise<void> => {
    const db = await openDB();
    const existing = await getCategoryById(category.id);

    let icon = getStorageUrl(category.icon);
    icon = await saveAssetToFile(icon);

    const finalCat = { ...category, icon: icon || category.icon };

    // Same ordering as saveItem: commit the record first, clean up after. See
    // the note there for why deleting first was the wrong way round.
    const stale = existing && existing.icon && existing.icon !== icon ? existing.icon : undefined;

    return new Promise((resolve, reject) => {
        const t = db.transaction(STORE_CATEGORIES, 'readwrite');
        t.objectStore(STORE_CATEGORIES).put(finalCat);
        t.oncomplete = () => {
            if (stale) deleteAssetFile(stale).catch(e => console.error('Stale icon cleanup failed', e));
            resolve();
        };
        t.onerror = () => reject(t.error);
    });
};

export const saveCategoriesBatch = async (categories: Category[]): Promise<void> => {
    const processed: Category[] = [];
    for (const cat of categories) {
        let icon = getStorageUrl(cat.icon);
        icon = await saveAssetToFile(icon);
        processed.push({ ...cat, icon: icon || cat.icon });
    }

    const db = await openDB();
    return new Promise((resolve, reject) => {
        const t = db.transaction(STORE_CATEGORIES, 'readwrite');
        const s = t.objectStore(STORE_CATEGORIES);
        processed.forEach(c => s.put(c));
        t.oncomplete = () => resolve();
        t.onerror = () => reject(t.error);
    });
};

export const getAllCategories = async (profileId?: string): Promise<Category[]> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const t = db.transaction(STORE_CATEGORIES, 'readonly');
        const r = getAllBy<Category>(t.objectStore(STORE_CATEGORIES), IDX_PROFILE, profileId);
        r.onsuccess = () => {
            resolve(r.result.map(c => ({ ...c, icon: getDisplayUrl(c.icon) })));
        };
        r.onerror = () => reject(r.error);
    });
};

export const deleteCategory = async (id: string): Promise<void> => {
    const cat = await getCategoryById(id);
    if (cat) await deleteAssetFile(cat.icon);
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const t = db.transaction(STORE_CATEGORIES, 'readwrite');
        t.objectStore(STORE_CATEGORIES).delete(id);
        t.oncomplete = () => resolve();
        t.onerror = () => reject(t.error);
    });
};

const getCategoryById = async (id: string): Promise<Category | undefined> => {
    const db = await openDB();
    return new Promise((resolve) => {
        const t = db.transaction(STORE_CATEGORIES, 'readonly');
        const r = t.objectStore(STORE_CATEGORIES).get(id);
        r.onsuccess = () => resolve(r.result);
        r.onerror = () => resolve(undefined);
    });
};
