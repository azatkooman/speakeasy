
import { Capacitor } from '@capacitor/core';
import { AACItem, Category, Board, ChildProfile, ColorTheme } from '../types';
import * as CapacitorFilesystem from '@capacitor/filesystem';
import { TranslationKey } from './translations';

const DB_NAME = 'speakeasy_aac_db';
const DB_VERSION = 5;
const STORE_ITEMS = 'aac_items';
const STORE_CATEGORIES = 'aac_categories';
const STORE_BOARDS = 'aac_boards';
const STORE_PROFILES = 'aac_profiles';

export const ROOT_FOLDER = 'root';
export const DEFAULT_BOARD_ID = 'default-board';

// --- FILESYSTEM HELPERS ---

// Export safe access to Filesystem and Directory for use in App.tsx
export const Filesystem = CapacitorFilesystem.Filesystem;

// Directory might be missing or undefined in some web ESM builds
export const Directory = (CapacitorFilesystem as any).Directory || {
    Data: 'DATA',
    Documents: 'DOCUMENTS',
    Cache: 'CACHE',
    External: 'EXTERNAL'
};

export const Encoding = (CapacitorFilesystem as any).Encoding || {
    UTF8: 'utf8',
    ASCII: 'ascii',
    UTF16: 'utf16'
};

// Robust check for Native Platform to prevent crashes if Capacitor global is undefined
const isNative = typeof Capacitor !== 'undefined' && Capacitor.isNativePlatform ? Capacitor.isNativePlatform() : false;

/**
 * Saves a Base64 data URL to the native filesystem.
 * Returns the file:// URI on success, or the original Base64 if on Web/Error.
 */
const saveAssetToFile = async (dataUrl: string | undefined): Promise<string | undefined> => {
    if (!dataUrl || !dataUrl.startsWith('data:') || !isNative) return dataUrl;

    try {
        // Extract Base64 data and mime type
        const matches = dataUrl.match(/^data:(.+);base64,(.+)$/);
        if (!matches) return dataUrl;

        const mimeType = matches[1];
        const base64Data = matches[2];
        
        // Fix: Sanitize extension
        let ext = mimeType.split('/')[1] || 'bin';
        if (ext.includes(';')) {
            ext = ext.split(';')[0];
        }
        
        const fileName = `${crypto.randomUUID()}.${ext}`;

        // Robust directory access
        const targetDirectory = (Directory && Directory.Data) ? Directory.Data : 'DATA';

        const savedFile = await Filesystem.writeFile({
            path: fileName,
            data: base64Data,
            directory: targetDirectory as any, // Cast to any to avoid TS errors with fallback object
            recursive: true
        });

        return savedFile.uri;
    } catch (e) {
        console.error("Filesystem save failed, falling back to DB storage:", e);
        return dataUrl;
    }
};

/**
 * Deletes a file from the filesystem if it exists.
 */
const deleteAssetFile = async (path: string | undefined) => {
    if (!path || !isNative) return;
    
    // 1. Strip the file:// prefix to get just the filename
    let cleanPath = path;
    if (path.startsWith('file://')) {
        cleanPath = path.substring(path.lastIndexOf('/') + 1);
    } else if (path.includes('_capacitor_file_')) {
        cleanPath = path.substring(path.lastIndexOf('/') + 1);
    }

    try {
        const targetDirectory = (Directory && Directory.Data) ? Directory.Data : 'DATA';
        
        await Filesystem.deleteFile({ 
            path: cleanPath,
            directory: targetDirectory as any
        });
    } catch (e) {
        // Ignore file not found errors
        console.warn('Failed to delete file', cleanPath, e);
    }
};

/**
 * Converts a storage path (file://) to a displayable Web URL.
 */
const getDisplayUrl = (path: string | undefined): string | undefined => {
    if (!path) return undefined;
    if (!isNative) return path;
    
    // Only convert if it starts with file:// or looks like a file path
    if (path.startsWith('data:') || path.startsWith('http') || !path.includes('/')) return path;
    
    // Convert native file path to Webview-friendly URL
    if (Capacitor && Capacitor.convertFileSrc) {
        return Capacitor.convertFileSrc(path);
    }
    return path;
};

/**
 * Reverts a display URL back to a storage path (file://) for DB updates.
 */
const getStorageUrl = (path: string | undefined): string | undefined => {
    if (!path) return undefined;
    if (!isNative) return path;
    
    // If it's a capacitor wrapper URL, revert it
    if (path.includes('_capacitor_file_')) {
        const suffix = path.split('_capacitor_file_')[1];
        return `file://${suffix}`;
    }
    return path;
};

// --- DB HELPERS ---

export const clearLegacyStorage = () => {
    if (localStorage.getItem('aac_history')) {
        localStorage.removeItem('aac_history');
        console.log("Cleared legacy bloated history storage");
    }
};

// Default Categories with higher order indices so cards can come first (orders 0-9 reserved for cards)
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
      
      if (!db.objectStoreNames.contains(STORE_ITEMS)) {
        db.createObjectStore(STORE_ITEMS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_CATEGORIES)) {
        db.createObjectStore(STORE_CATEGORIES, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_BOARDS)) {
        db.createObjectStore(STORE_BOARDS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_PROFILES)) {
        db.createObjectStore(STORE_PROFILES, { keyPath: 'id' });
      }
    };

    request.onsuccess = (event) => {
      resolve((event.target as IDBOpenDBRequest).result);
    };

    request.onerror = (event) => {
      reject((event.target as IDBOpenDBRequest).error);
    };
  });
};

// --- PROFILES ---

export const getAllProfiles = async (): Promise<ChildProfile[]> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_PROFILES, 'readonly');
        const store = transaction.objectStore(STORE_PROFILES);
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

export const saveProfile = async (profile: ChildProfile): Promise<void> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_PROFILES, 'readwrite');
        const store = transaction.objectStore(STORE_PROFILES);
        const request = store.put(profile);
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
    });
};

export const deleteProfile = async (profileId: string): Promise<void> => {
    try {
        // 1. Fetch all related data FIRST to avoid async calls inside transaction
        const allItems = await getAllItems(profileId);
        const allBoards = await getAllBoards(profileId);
        const allCats = await getAllCategories(profileId);

        // 2. Delete Items (Files + DB entries)
        await Promise.all(allItems.map(i => deleteItem(i.id)));
        
        // 3. Clean up Category Icon files
        await Promise.all(allCats.map(cat => deleteAssetFile(cat.icon)));

        // 4. Start Transaction for DB cleanup
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORE_PROFILES, STORE_BOARDS, STORE_CATEGORIES], 'readwrite');
            
            // Delete Profile
            transaction.objectStore(STORE_PROFILES).delete(profileId);
            
            // Delete Boards
            const boardStore = transaction.objectStore(STORE_BOARDS);
            allBoards.forEach(b => boardStore.delete(b.id));

            // Delete Categories
            const catStore = transaction.objectStore(STORE_CATEGORIES);
            allCats.forEach(c => catStore.delete(c.id));

            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error);
        });

    } catch (e) {
        throw e;
    }
};

// --- BOARDS ---

export const getAllBoards = async (profileId?: string): Promise<Board[]> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_BOARDS, 'readonly');
        const store = transaction.objectStore(STORE_BOARDS);
        const request = store.getAll();
        request.onsuccess = () => {
            const result = request.result as Board[];
            if (profileId) {
                resolve(result.filter(b => b.profileId === profileId));
            } else {
                resolve(result);
            }
        };
        request.onerror = () => reject(request.error);
    });
};

export const saveBoard = async (board: Board): Promise<void> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_BOARDS, 'readwrite');
        const store = transaction.objectStore(STORE_BOARDS);
        const request = store.put(board);
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
    });
};

export const saveBoardsBatch = async (boards: Board[]): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_BOARDS, 'readwrite');
    const store = transaction.objectStore(STORE_BOARDS);
    boards.forEach(board => store.put(board));
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
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

    const catsToCreate = DEFAULT_CATEGORIES_TEMPLATE.map(c => {
        const newId = crypto.randomUUID();
        if (c.id === 'FOOD') foodCategoryId = newId;
        return {
            ...c, 
            id: newId,
            boardId: defaultBoard.id,
            profileId,
            label: t ? t(c.labelKey) : c.fallback,
            colorTheme: c.colorTheme as any 
        };
    });
    await saveCategoriesBatch(catsToCreate);

    // Create Initial Cards
    const iWantId = crypto.randomUUID();
    const appleId = crypto.randomUUID();

    const createDefaultCard = (id: string, labelKey: TranslationKey, fallback: string, iconUrl: string, catId: string, color: ColorTheme, order: number): AACItem => ({
        id,
        profileId,
        boardId: defaultBoard.id,
        label: t ? t(labelKey) : fallback,
        imageUrl: iconUrl,
        imageFit: 'contain',
        category: catId,
        colorTheme: color,
        createdAt: Date.now(),
        order,
        isVisible: true
    });

    const defaultCards: AACItem[] = [
        createDefaultCard(iWantId, 'default.card.i_want', 'I want', 'https://static.arasaac.org/pictograms/5441/5441_500.png', ROOT_FOLDER, 'green', 0),
        createDefaultCard(crypto.randomUUID(), 'default.card.yes', 'Yes', 'https://static.arasaac.org/pictograms/5584/5584_500.png', ROOT_FOLDER, 'green', 1),
        createDefaultCard(crypto.randomUUID(), 'default.card.no', 'No', 'https://static.arasaac.org/pictograms/5526/5526_500.png', ROOT_FOLDER, 'red', 2),
        createDefaultCard(crypto.randomUUID(), 'default.card.stop', 'Stop', 'https://static.arasaac.org/pictograms/7196/7196_500.png', ROOT_FOLDER, 'red', 3),
    ];

    if (foodCategoryId) {
        defaultCards.push(
            createDefaultCard(appleId, 'default.card.apple', 'Apple', 'https://static.arasaac.org/pictograms/2462/2462_500.png', foodCategoryId, 'orange', 0)
        );
    }

    await saveItemsBatch(defaultCards);

    if (foodCategoryId) {
        localStorage.setItem('aac_onboarding_sentence', JSON.stringify([iWantId, appleId]));
    }

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

    const newCats = DEFAULT_CATEGORIES_TEMPLATE.map(c => ({
        ...c,
        id: crypto.randomUUID(),
        boardId: newId,
        profileId,
        label: t ? t(c.labelKey) : c.fallback,
        colorTheme: c.colorTheme as any
    }));
    await saveCategoriesBatch(newCats);

    return newId;
};

export const deleteBoard = async (boardId: string): Promise<void> => {
    const allItems = await getAllItems(); 
    const boardItems = allItems.filter(i => i.boardId === boardId);
    
    for (const item of boardItems) {
        await deleteItem(item.id);
    }

    const db = await openDB();
    return new Promise(async (resolve, reject) => {
        try {
            const allReqCats = await getAllCategories();
            const catsToDelete = allReqCats.filter(c => c.boardId === boardId);

            for (const cat of catsToDelete) {
                const rawCat = await getCategoryById(cat.id);
                if (rawCat) await deleteAssetFile(rawCat.icon);
            }

            const transaction = db.transaction([STORE_BOARDS, STORE_CATEGORIES], 'readwrite');
            
            const boardStore = transaction.objectStore(STORE_BOARDS);
            boardStore.delete(boardId);

            const catStore = transaction.objectStore(STORE_CATEGORIES);
            catsToDelete.forEach(c => catStore.delete(c.id));

            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error);

        } catch (e) {
            reject(e);
        }
    });
};

// --- ITEMS ---

const getItemById = async (id: string): Promise<AACItem | undefined> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const t = db.transaction(STORE_ITEMS, 'readonly');
        const req = t.objectStore(STORE_ITEMS).get(id);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(undefined); 
    });
};

export const saveItem = async (item: AACItem): Promise<void> => {
  const db = await openDB();

  // 0. Cleanup Logic: Check if we are replacing existing files
  const existingItem = await getItemById(item.id);
  
  // 1. Convert Display URL back to Storage URL (if needed)
  let imageUrl = getStorageUrl(item.imageUrl) || item.imageUrl;
  let audioUrl = getStorageUrl(item.audioUrl);

  // 2. If it is new Data URL (Base64), save to filesystem and get new path
  const newImageUrl = await saveAssetToFile(imageUrl) || imageUrl;
  const newAudioUrl = await saveAssetToFile(audioUrl);

  // 3. Cleanup: If old image/audio was a file and is different from new one, delete old
  if (existingItem) {
      if (existingItem.imageUrl && existingItem.imageUrl !== newImageUrl) {
          await deleteAssetFile(existingItem.imageUrl);
      }
      if (existingItem.audioUrl && existingItem.audioUrl !== newAudioUrl) {
          await deleteAssetFile(existingItem.audioUrl);
      }
  }

  const finalItem: AACItem = {
      ...item,
      imageUrl: newImageUrl,
      audioUrl: newAudioUrl || undefined
  };

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_ITEMS, 'readwrite');
    const store = transaction.objectStore(STORE_ITEMS);
    const request = store.put(finalItem);

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    request.onerror = () => reject(request.error);
  });
};

export const saveItemsBatch = async (items: AACItem[]): Promise<void> => {
  // Batch save processes file saving sequentially to prevent FS spamming, then does DB put
  const processedItems = [];
  for (const item of items) {
      let imageUrl = getStorageUrl(item.imageUrl) || item.imageUrl;
      let audioUrl = getStorageUrl(item.audioUrl);
      
      imageUrl = await saveAssetToFile(imageUrl) || imageUrl;
      audioUrl = await saveAssetToFile(audioUrl);
      
      processedItems.push({ ...item, imageUrl, audioUrl: audioUrl || undefined });
  }

  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_ITEMS, 'readwrite');
    const store = transaction.objectStore(STORE_ITEMS);
    processedItems.forEach(item => store.put(item));
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
};

export const getAllItems = async (profileId?: string): Promise<AACItem[]> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_ITEMS, 'readonly');
    const store = transaction.objectStore(STORE_ITEMS);
    const request = store.getAll();

    request.onsuccess = () => {
        let result = request.result as AACItem[];
        if (profileId) {
            result = result.filter(i => i.profileId === profileId);
        }
        
        // Convert Storage URLs to Display URLs for the UI
        const mappedResult = result.map(item => ({
            ...item,
            imageUrl: getDisplayUrl(item.imageUrl) || item.imageUrl,
            audioUrl: getDisplayUrl(item.audioUrl)
        }));

        resolve(mappedResult);
    };
    request.onerror = () => reject(request.error);
  });
};

export const deleteItem = async (id: string): Promise<void> => {
  const db = await openDB();
  
  const item = await getItemById(id);

  if (item) {
      await deleteAssetFile(item.imageUrl);
      await deleteAssetFile(item.audioUrl);
  }

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_ITEMS, 'readwrite');
    const store = transaction.objectStore(STORE_ITEMS);
    const request = store.delete(id);

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    request.onerror = () => reject(request.error);
  });
};

// --- CATEGORIES ---

const getCategoryById = async (id: string): Promise<Category | undefined> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const t = db.transaction(STORE_CATEGORIES, 'readonly');
        const req = t.objectStore(STORE_CATEGORIES).get(id);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(undefined);
    });
};

export const saveCategory = async (category: Category): Promise<void> => {
  const db = await openDB();

  const existingCat = await getCategoryById(category.id);

  let icon = getStorageUrl(category.icon);
  const newIcon = await saveAssetToFile(icon);

  if (existingCat) {
      if (existingCat.icon && existingCat.icon !== newIcon) {
          await deleteAssetFile(existingCat.icon);
      }
  }

  const finalCat = { ...category, icon: newIcon || category.icon };

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_CATEGORIES, 'readwrite');
    const store = transaction.objectStore(STORE_CATEGORIES);
    const request = store.put(finalCat);
    
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    request.onerror = () => reject(request.error);
  });
};

export const saveCategoriesBatch = async (categories: Category[]): Promise<void> => {
  const processedCats = [];
  for (const cat of categories) {
      let icon = getStorageUrl(cat.icon);
      icon = await saveAssetToFile(icon);
      processedCats.push({ ...cat, icon: icon || cat.icon });
  }

  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_CATEGORIES, 'readwrite');
    const store = transaction.objectStore(STORE_CATEGORIES);
    processedCats.forEach(cat => store.put(cat));
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
};

export const getAllCategories = async (profileId?: string): Promise<Category[]> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_CATEGORIES, 'readonly');
    const store = transaction.objectStore(STORE_CATEGORIES);
    const request = store.getAll();

    request.onsuccess = () => {
        let result = request.result as Category[];
        if (profileId) {
            result = result.filter(c => c.profileId === profileId);
        }

        const mappedResult = result.map(cat => ({
            ...cat,
            icon: getDisplayUrl(cat.icon)
        }));

        resolve(mappedResult);
    };
    request.onerror = () => reject(request.error);
  });
};

export const deleteCategory = async (id: string): Promise<void> => {
  const db = await openDB();

  const cat = await getCategoryById(id);

  if (cat) {
      await deleteAssetFile(cat.icon);
  }

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_CATEGORIES, 'readwrite');
    const store = transaction.objectStore(STORE_CATEGORIES);
    const request = store.delete(id);
    
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    request.onerror = () => reject(request.error);
  });
};
