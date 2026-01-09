import { Filesystem, Directory } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';
import { AACItem, Category, Board, ChildProfile } from '../types';

const DB_NAME = 'speakeasy_aac_db';
const DB_VERSION = 5;
const STORE_ITEMS = 'aac_items';
const STORE_CATEGORIES = 'aac_categories';
const STORE_BOARDS = 'aac_boards';
const STORE_PROFILES = 'aac_profiles';

export const ROOT_FOLDER = 'root';
export const DEFAULT_BOARD_ID = 'default-board';

// --- FILESYSTEM HELPERS ---

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
        
        // Fix: Sanitize extension (remove ;codecs=... stuff)
        let ext = mimeType.split('/')[1] || 'bin';
        if (ext.includes(';')) {
            ext = ext.split(';')[0];
        }
        
        const fileName = `${crypto.randomUUID()}.${ext}`;

        // Robust directory access: Directory might be undefined in some ESM imports on web
        const targetDirectory = (Directory && Directory.Data) ? Directory.Data : ('DATA' as Directory);

        const savedFile = await Filesystem.writeFile({
            path: fileName,
            data: base64Data,
            directory: targetDirectory,
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
    // The plugin expects "image.jpg", NOT "file:///.../image.jpg"
    let cleanPath = path;
    if (path.startsWith('file://')) {
        // This is a hacky way to find the filename at the end
        cleanPath = path.substring(path.lastIndexOf('/') + 1);
    } else if (path.includes('_capacitor_file_')) {
        cleanPath = path.substring(path.lastIndexOf('/') + 1);
    }

    try {
        await Filesystem.deleteFile({ 
            path: cleanPath,
            directory: Directory.Data // <--- MUST BE EXPLICIT
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
    
    // Fix: If it's a data URL, Http URL, or a simple string (built-in icon name like 'folder'), return as is.
    // Only convert if it starts with file:// or looks like a file path
    if (path.startsWith('data:') || path.startsWith('http') || !path.includes('/')) return path;
    
    // Convert native file path to Webview-friendly URL (http://localhost/_capacitor_file_/...)
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

const DEFAULT_CATEGORIES_TEMPLATE = [
  { id: 'PEOPLE', label: 'People', colorTheme: 'yellow', parentId: 'root', icon: 'people', order: 0 },
  { id: 'VERB', label: 'Actions', colorTheme: 'green', parentId: 'root', icon: 'actions', order: 1 },
  { id: 'NOUN', label: 'Things', colorTheme: 'orange', parentId: 'root', icon: 'things', order: 2 },
  { id: 'ADJECTIVE', label: 'Desc.', colorTheme: 'blue', parentId: 'root', icon: 'desc', order: 3 },
  { id: 'SOCIAL', label: 'Social', colorTheme: 'pink', parentId: 'root', icon: 'social', order: 4 },
  { id: 'PLACES', label: 'Places', colorTheme: 'purple', parentId: 'root', icon: 'places', order: 5 },
  { id: 'FOOD', label: 'Food', colorTheme: 'orange', parentId: 'root', icon: 'food', order: 6 }, 
  { id: 'TIME', label: 'Time', colorTheme: 'teal', parentId: 'root', icon: 'time', order: 7 },
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
        const allItems = await getAllItems(profileId);
        
        const ids = allItems.map(i => i.id);
        for (const id of ids) {
            await deleteItem(id);
        }
        
        const db = await openDB();
        return new Promise(async (resolve, reject) => {
            const transaction = db.transaction([STORE_PROFILES, STORE_BOARDS, STORE_ITEMS, STORE_CATEGORIES], 'readwrite');
            
            transaction.objectStore(STORE_PROFILES).delete(profileId);
            
            // Note: getAllBoards returns items with Display URLs usually, but delete relies on IDs.
            const allBoards = await getAllBoards(profileId);
            const allCats = await getAllCategories(profileId);
            
            const boardStore = transaction.objectStore(STORE_BOARDS);
            allBoards.forEach(b => boardStore.delete(b.id));

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

export const initializeBoards = async (defaultName: string, profileId: string): Promise<string> => {
    const boards = await getAllBoards(profileId);
    if (boards.length > 0) return boards[0].id;

    const defaultBoard: Board = {
        id: crypto.randomUUID(),
        profileId,
        label: defaultName,
        createdAt: Date.now()
    };
    await saveBoard(defaultBoard);

    const catsToCreate = DEFAULT_CATEGORIES_TEMPLATE.map(c => ({
        ...c, 
        id: crypto.randomUUID(),
        boardId: defaultBoard.id,
        profileId,
        colorTheme: c.colorTheme as any 
    }));
    await saveCategoriesBatch(catsToCreate);

    return defaultBoard.id;
};

export const createNewBoard = async (label: string, profileId: string): Promise<string> => {
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

            // Clean up category icons
            for (const cat of catsToDelete) {
                // We need to fetch the raw cat to check for files
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
        req.onerror = () => resolve(undefined); // Don't reject, just return undefined
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
  // Note: Batch save doesn't do complex cleanup for simplicity, mainly used for imports/reorders
  const processedItems = await Promise.all(items.map(async (item) => {
      let imageUrl = getStorageUrl(item.imageUrl) || item.imageUrl;
      let audioUrl = getStorageUrl(item.audioUrl);
      
      imageUrl = await saveAssetToFile(imageUrl) || imageUrl;
      audioUrl = await saveAssetToFile(audioUrl);
      
      return { ...item, imageUrl, audioUrl: audioUrl || undefined };
  }));

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
  
  // 1. Get item to find file paths
  const item = await getItemById(id);

  if (item) {
      await deleteAssetFile(item.imageUrl);
      await deleteAssetFile(item.audioUrl);
  }

  // 2. Delete from DB
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

  // 0. Cleanup check
  const existingCat = await getCategoryById(category.id);

  // Categories also have 'icon' which can be a data URL
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
  const processedCats = await Promise.all(categories.map(async (cat) => {
      let icon = getStorageUrl(cat.icon);
      icon = await saveAssetToFile(icon);
      return { ...cat, icon: icon || cat.icon };
  }));

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

        // Convert Storage URLs to Display URLs
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

// --- BACKUP GENERATOR ---

export const generateBackupData = async () => {
    // 1. Get all data (these come with Display URLs from the getters)
    const [items, cats, boards, profiles] = await Promise.all([
        getAllItems(), 
        getAllCategories(), 
        getAllBoards(),
        getAllProfiles()
    ]);

    // 2. Re-hydrate images back to Base64 for portable JSON
    const hydratedItems = await Promise.all(items.map(async (item) => {
        // If native, we need to read the file content
        if (isNative && item.imageUrl && !item.imageUrl.startsWith('data:') && !item.imageUrl.startsWith('http')) {
             try {
                 const storagePath = getStorageUrl(item.imageUrl);
                 if (storagePath) {
                     // Using Filesystem.readFile requires non-null path.
                     // On web, Filesystem might be mock, so check isNative first.
                     const file = await Filesystem.readFile({ path: storagePath });
                     // Filesystem.readFile returns data as string (base64) by default
                     // We try to guess mime or use jpeg.
                     return { ...item, imageUrl: `data:image/jpeg;base64,${file.data}` };
                 }
             } catch (e) {
                 // If file missing, keep original URL
             }
        }
        return item;
    }));

    const hydratedCats = await Promise.all(cats.map(async (cat) => {
        if (isNative && cat.icon && !cat.icon.startsWith('data:') && !cat.icon.startsWith('http')) {
             // Skip built-in icons
             if (!cat.icon.includes('/')) return cat;

             try {
                 const storagePath = getStorageUrl(cat.icon);
                 if (storagePath) {
                    const file = await Filesystem.readFile({ path: storagePath });
                    return { ...cat, icon: `data:image/png;base64,${file.data}` };
                 }
             } catch (e) {}
        }
        return cat;
    }));

    return {
        items: hydratedItems,
        categories: hydratedCats,
        boards,
        profiles
    };
};
