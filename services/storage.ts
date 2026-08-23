
import { Capacitor } from '@capacitor/core';
import { AACItem, Category, Board, ChildProfile, ColorTheme } from '../types';
import { Filesystem as CapFilesystem, Directory as CapDirectory, Encoding as CapEncoding } from '@capacitor/filesystem';
import { TranslationKey } from './translations';
import { SEED_PICTOGRAMS, resolveSeedPictogram, isBundledAsset } from '../utils/seedPictograms';

const DB_NAME = 'speakeasy_aac_db';
const DB_VERSION = 5;
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
    order: number;
}> = [
  { id: 'PEOPLE', labelKey: 'folder.default.people', fallback: 'People', colorTheme: 'yellow', parentId: 'root', icon: 'people', order: 10 },
  { id: 'VERB', labelKey: 'folder.default.actions', fallback: 'Actions', colorTheme: 'green', parentId: 'root', icon: 'actions', order: 11 },
  { id: 'NOUN', labelKey: 'folder.default.things', fallback: 'Things', colorTheme: 'orange', parentId: 'root', icon: 'things', order: 12 },
  { id: 'ADJECTIVE', labelKey: 'folder.default.desc', fallback: 'Desc.', colorTheme: 'blue', parentId: 'root', icon: 'desc', order: 13 },
  { id: 'SOCIAL', labelKey: 'folder.default.social', fallback: 'Social', colorTheme: 'pink', parentId: 'root', icon: 'social', order: 14 },
  { id: 'PLACES', labelKey: 'folder.default.places', fallback: 'Places', colorTheme: 'purple', parentId: 'root', icon: 'places', order: 15 },
  { id: 'FOOD', labelKey: 'folder.default.food', fallback: 'Food', colorTheme: 'orange', parentId: 'root', icon: 'food', order: 16 }, 
  { id: 'TIME', labelKey: 'folder.default.time', fallback: 'Time', colorTheme: 'teal', parentId: 'root', icon: 'time', order: 17 },
];

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_ITEMS)) db.createObjectStore(STORE_ITEMS, { keyPath: 'id' });
      if (!db.objectStoreNames.contains(STORE_CATEGORIES)) db.createObjectStore(STORE_CATEGORIES, { keyPath: 'id' });
      if (!db.objectStoreNames.contains(STORE_BOARDS)) db.createObjectStore(STORE_BOARDS, { keyPath: 'id' });
      if (!db.objectStoreNames.contains(STORE_PROFILES)) db.createObjectStore(STORE_PROFILES, { keyPath: 'id' });
    };
    request.onsuccess = (event) => resolve((event.target as IDBOpenDBRequest).result);
    request.onerror = (event) => reject((event.target as IDBOpenDBRequest).error);
  });
};

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
        const r = t.objectStore(STORE_BOARDS).getAll();
        r.onsuccess = () => {
            const res = r.result as Board[];
            resolve(profileId ? res.filter(b => b.profileId === profileId) : res);
        };
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

export const initializeBoards = async (defaultName: string, profileId: string, t?: (key: TranslationKey) => string): Promise<string> => {
    const boards = await getAllBoards(profileId);
    if (boards.length > 0) return boards[0].id;

    const defaultBoard: Board = {
        id: crypto.randomUUID(),
        profileId,
        label: defaultName,
        createdAt: Date.now()
    };
    await saveBoard(defaultBoard);

    let foodCategoryId = '';

    const catsToCreate: Category[] = DEFAULT_CATEGORIES_TEMPLATE.map(c => {
        const newId = crypto.randomUUID();
        if (c.id === 'FOOD') foodCategoryId = newId;
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

    const createDefaultCard = (id: string, labelKey: TranslationKey, fallback: string, iconUrl: string, catId: string, color: ColorTheme, order: number): AACItem => ({
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
        order,
        isVisible: true
    });

    const defaultCards: AACItem[] = [
        createDefaultCard(crypto.randomUUID(), 'default.card.i_want', 'I want', SEED_PICTOGRAMS.iWant, ROOT_FOLDER, 'green', 0),
        createDefaultCard(crypto.randomUUID(), 'default.card.yes', 'Yes', SEED_PICTOGRAMS.yes, ROOT_FOLDER, 'green', 1),
        createDefaultCard(crypto.randomUUID(), 'default.card.no', 'No', SEED_PICTOGRAMS.no, ROOT_FOLDER, 'red', 2),
        createDefaultCard(crypto.randomUUID(), 'default.card.stop', 'Stop', SEED_PICTOGRAMS.stop, ROOT_FOLDER, 'red', 3),
    ];

    if (foodCategoryId) {
        defaultCards.push(
            createDefaultCard(crypto.randomUUID(), 'default.card.apple', 'Apple', SEED_PICTOGRAMS.apple, foodCategoryId, 'orange', 0)
        );
    }

    await saveItemsBatch(defaultCards);
    return defaultBoard.id;
};

export const createNewBoard = async (label: string, profileId: string, t?: (key: TranslationKey) => string): Promise<string> => {
    const newId = crypto.randomUUID();
    const board: Board = {
        id: newId,
        profileId,
        label,
        createdAt: Date.now()
    };
    await saveBoard(board);

    const newCats: Category[] = DEFAULT_CATEGORIES_TEMPLATE.map(c => ({
        ...c,
        id: crypto.randomUUID(),
        boardId: newId,
        profileId,
        label: t ? t(c.labelKey) : c.fallback,
        labelKey: c.labelKey,
        colorTheme: c.colorTheme as any
    }));
    await saveCategoriesBatch(newCats);

    return newId;
};

export const deleteBoard = async (boardId: string): Promise<void> => {
    const allItems = await getAllItems(); 
    const boardItems = allItems.filter(i => i.boardId === boardId);
    for (const item of boardItems) await deleteItem(item.id);

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

    if (existing) {
        if (existing.imageUrl && existing.imageUrl !== imageUrl) await deleteAssetFile(existing.imageUrl);
        if (existing.audioUrl && existing.audioUrl !== audioUrl) await deleteAssetFile(existing.audioUrl);
    }

    const finalItem = { ...item, imageUrl, audioUrl: audioUrl || undefined };

    return new Promise((resolve, reject) => {
        const t = db.transaction(STORE_ITEMS, 'readwrite');
        t.objectStore(STORE_ITEMS).put(finalItem);
        t.oncomplete = () => resolve();
        t.onerror = () => reject(t.error);
    });
};

export const saveItemsBatch = async (items: AACItem[]): Promise<void> => {
    const processed = [];
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
        const r = t.objectStore(STORE_ITEMS).getAll();
        r.onsuccess = () => {
            let res = r.result as AACItem[];
            if (profileId) res = res.filter(i => i.profileId === profileId);
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

    if (existing && existing.icon && existing.icon !== icon) {
        await deleteAssetFile(existing.icon);
    }

    const finalCat = { ...category, icon: icon || category.icon };

    return new Promise((resolve, reject) => {
        const t = db.transaction(STORE_CATEGORIES, 'readwrite');
        t.objectStore(STORE_CATEGORIES).put(finalCat);
        t.oncomplete = () => resolve();
        t.onerror = () => reject(t.error);
    });
};

export const saveCategoriesBatch = async (categories: Category[]): Promise<void> => {
    const processed = [];
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
        const r = t.objectStore(STORE_CATEGORIES).getAll();
        r.onsuccess = () => {
            let res = r.result as Category[];
            if (profileId) res = res.filter(c => c.profileId === profileId);
            resolve(res.map(c => ({ ...c, icon: getDisplayUrl(c.icon) })));
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
