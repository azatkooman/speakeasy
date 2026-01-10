import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Plus, Lock, Unlock, Search, X, Pencil, Settings2, Home, ChevronRight, Eye, EyeOff, FolderPlus, FolderInput, ArrowLeft, ArrowRight, Layers, ArrowUpRight, ChevronLeft, User } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { AACItem, Category, ColorTheme, AppSettings, Board, ChildProfile } from './types';
import { saveItem, getAllItems, deleteItem, getAllCategories, saveCategory, deleteCategory, clearLegacyStorage, ROOT_FOLDER, saveItemsBatch, saveCategoriesBatch, getAllBoards, saveBoard, deleteBoard, initializeBoards, createNewBoard, DEFAULT_BOARD_ID, getAllProfiles, saveProfile, deleteProfile, generateBackupData, saveBoardsBatch } from './services/storage';
import { getTranslation, TranslationKey } from './services/translations';
import { voiceService } from './services/voice';
import SentenceStrip from './components/SentenceStrip';
import CreateCardModal from './components/CreateCardModal';
import ConfirmationModal from './components/ConfirmationModal';
import SettingsModal from './components/SettingsModal';
import HistoryModal from './components/HistoryModal';
import FolderModal from './components/FolderModal';
import FolderCard from './components/FolderCard';
import MoveItemModal from './components/MoveItemModal';
import EditOptionsModal from './components/EditOptionsModal';
import CreateSelectionModal from './components/CreateSelectionModal';
import BoardsModal from './components/BoardsModal';
import LinkBoardModal from './components/LinkBoardModal';
import ProfileSelectionModal from './components/ProfileSelectionModal';

// Default settings
const DEFAULT_SETTINGS: AppSettings = {
  voicePitch: 1.0,
  voiceRate: 0.9,
  gridColumns: 'medium',
  language: 'en',
};

// Singleton AudioContext for efficient playback
let sharedAudioCtx: AudioContext | null = null;
let isAudioContextUnlocked = false;

const getAudioContext = () => {
    if (!sharedAudioCtx) {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
            sharedAudioCtx = new AudioContextClass();
        }
    }
    return sharedAudioCtx;
};

// Mobile browsers (iOS) require a user gesture to unlock the AudioContext.
// We call this on the first global touch/click event.
const unlockAudioContext = () => {
    if (isAudioContextUnlocked) return;

    const ctx = getAudioContext();
    if (ctx) {
        // Resume context
        if (ctx.state === 'suspended') {
            ctx.resume();
        }
        
        // Play a tiny silent buffer to force the audio pipeline to wake up (iOS hack)
        const buffer = ctx.createBuffer(1, 1, 22050);
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        source.start(0);

        isAudioContextUnlocked = true;
    }
};

const playAudio = async (audioUrl: string): Promise<void> => {
  return new Promise(async (resolve) => {
    const timeout = setTimeout(() => resolve(), 10000); // Safety timeout

    const fallbackToHtmlAudio = () => {
        try {
            const audio = new Audio(audioUrl);
            audio.onended = () => { clearTimeout(timeout); resolve(); };
            audio.onerror = (e) => { 
                console.error("HTML Audio fallback error", e);
                clearTimeout(timeout); 
                resolve(); 
            };
            audio.volume = 1.0; 
            // Attempt to play, handling promise rejection
            const playPromise = audio.play();
            if (playPromise !== undefined) {
                playPromise.catch(e => {
                    console.error("HTML Audio play failed", e);
                    resolve();
                });
            }
        } catch (err) {
            console.error("Audio playback failed completely", err);
            clearTimeout(timeout);
            resolve();
        }
    };

    try {
        const ctx = getAudioContext();
        
        // Use Web Audio API only for HTTP/HTTPS/Data URLs where we expect fetch to work reliably with CORS/Schemes
        // For local Capacitor files (http://localhost/_capacitor_file_ or file://), Web Audio API fetch() often fails.
        // We prefer HTML5 Audio for local file playback as it handles streaming/ranges better.
        const isLocalFile = audioUrl.includes('_capacitor_file_') || audioUrl.startsWith('file://');

        if (ctx && !isLocalFile) {
             if (ctx.state === 'suspended') {
                await ctx.resume();
             }

             const response = await fetch(audioUrl);
             if (!response.ok) throw new Error("Fetch failed");
             
             const arrayBuffer = await response.arrayBuffer();
             const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
             
             const source = ctx.createBufferSource();
             source.buffer = audioBuffer;

             // Create Gain Node to boost volume
             const gainNode = ctx.createGain();
             gainNode.gain.value = 2.0; 

             const compressor = ctx.createDynamicsCompressor();
             source.connect(gainNode);
             gainNode.connect(compressor);
             compressor.connect(ctx.destination);

             source.onended = () => {
                 clearTimeout(timeout);
                 resolve();
             };

             source.start(0);
             return;
        }

        // Fallback for local files or if Web Audio is unavailable
        fallbackToHtmlAudio();

    } catch (e) {
      console.warn("Web Audio API failed, trying fallback:", e);
      fallbackToHtmlAudio();
    }
  });
};

const THEME_STYLES: Record<ColorTheme, { bg: string; border: string; text: string }> = {
  'yellow': { bg: 'bg-yellow-200', border: 'border-yellow-400', text: 'text-yellow-900' }, // People
  'green': { bg: 'bg-green-200', border: 'border-green-500', text: 'text-green-900' }, // Verbs
  'blue': { bg: 'bg-blue-200', border: 'border-blue-500', text: 'text-blue-900' }, // Adjectives
  'pink': { bg: 'bg-pink-200', border: 'border-pink-400', text: 'text-pink-900' }, // Social
  'orange': { bg: 'bg-orange-200', border: 'border-orange-500', text: 'text-orange-900' }, // Nouns
  'purple': { bg: 'bg-purple-200', border: 'border-purple-400', text: 'text-purple-900' }, // Places
  'teal': { bg: 'bg-teal-200', border: 'border-teal-500', text: 'text-teal-900' }, // Time
  'red': { bg: 'bg-red-200', border: 'border-red-500', text: 'text-red-900' }, // Important
  'slate': { bg: 'bg-slate-200', border: 'border-slate-400', text: 'text-slate-900' }, // Misc
};

const DEFAULT_CARD_STYLE = THEME_STYLES['slate'];

const sortItems = (a: any, b: any) => {
    if (a.order !== undefined && b.order !== undefined) {
        return a.order - b.order;
    }
    return b.createdAt - a.createdAt;
};

type GridItem = 
  | ({ type: 'folder' } & Category)
  | ({ type: 'card' } & AACItem);

function App() {
  // Profiles State
  const [profiles, setProfiles] = useState<ChildProfile[]>([]);
  const [currentProfileId, setCurrentProfileId] = useState<string>('');
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  const [library, setLibrary] = useState<AACItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [sentence, setSentence] = useState<AACItem[]>([]);
  
  // Boards State
  const [boards, setBoards] = useState<Board[]>([]);
  const [currentBoardId, setCurrentBoardId] = useState<string>('');
  const [boardHistory, setBoardHistory] = useState<string[]>([]); // Track navigation history
  
  const [isBoardsModalOpen, setIsBoardsModalOpen] = useState(false);
  const [isLinkBoardModalOpen, setIsLinkBoardModalOpen] = useState(false);

  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('aac_settings');
    const parsed = saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
    if (!parsed.language) parsed.language = 'en';
    return parsed;
  });

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [isCreateSelectionOpen, setIsCreateSelectionOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  
  const [editingItem, setEditingItem] = useState<AACItem | null>(null);
  const [editingFolder, setEditingFolder] = useState<Category | null>(null);
  
  const [moveModalItem, setMoveModalItem] = useState<{ item: AACItem | Category, type: 'card' | 'folder' } | null>(null);
  const [editOptionsItem, setEditOptionsItem] = useState<{ item: AACItem | Category, type: 'card' | 'folder' } | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  
  const playbackSessionRef = useRef(0);
  const [historyIds, setHistoryIds] = useState<string[][]>([]);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [folderToDelete, setFolderToDelete] = useState<string | null>(null);
  
  const [isEditMode, setIsEditMode] = useState(false);
  
  const [currentFolderId, setCurrentFolderId] = useState<string>(ROOT_FOLDER);
  const [breadcrumbs, setBreadcrumbs] = useState<{id: string, label: string}[]>([]);
  const breadcrumbsScrollRef = useRef<HTMLDivElement>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchActive, setIsSearchActive] = useState(false);
  
  // Unlock Logic
  const unlockTimerRef = useRef<number | null>(null);
  const ignoreNextClick = useRef(false);
  const [isHoldingUnlock, setIsHoldingUnlock] = useState(false);

  const t = (key: TranslationKey) => getTranslation(settings.language, key);

  const isAndroid = Capacitor.getPlatform() === 'android';

  // --- INITIALIZATION ---
  useEffect(() => {
    clearLegacyStorage(); 
    
    const init = async () => {
        setIsInitializing(true);
        let allProfiles = await getAllProfiles();
        let activeProfileId = '';

        if (allProfiles.length === 0) {
            const [rawItems, rawBoards] = await Promise.all([getAllItems(), getAllBoards()]);
            
            if (rawBoards.length > 0 || rawItems.length > 0) {
                 const migrationProfileId = crypto.randomUUID();
                 const migrationProfile: ChildProfile = {
                     id: migrationProfileId,
                     name: 'My Child',
                     age: 5,
                     colorTheme: 'blue',
                     createdAt: Date.now()
                 };
                 await saveProfile(migrationProfile);
                 
                 const [allItems, allCats, allBds] = await Promise.all([
                     getAllItems(), 
                     getAllCategories(),
                     getAllBoards()
                 ]);

                 const fixedItems = allItems.map(i => ({ ...i, profileId: migrationProfileId }));
                 const fixedCats = allCats.map(c => ({ ...c, profileId: migrationProfileId }));
                 const fixedBoards = allBds.map(b => ({ ...b, profileId: migrationProfileId }));

                 await Promise.all([
                     saveItemsBatch(fixedItems),
                     saveCategoriesBatch(fixedCats),
                     saveBoardsBatch(fixedBoards)
                 ]);

                 allProfiles = [migrationProfile];
                 activeProfileId = migrationProfileId;
            } else {
                setIsProfileModalOpen(true);
            }
        } else {
             const lastPid = localStorage.getItem('aac_last_profile');
             if (lastPid && allProfiles.find(p => p.id === lastPid)) {
                 activeProfileId = lastPid;
             } else {
                 activeProfileId = allProfiles[0].id;
             }
        }
        
        setProfiles(allProfiles);
        
        if (activeProfileId) {
             setCurrentProfileId(activeProfileId);
             await loadProfileData(activeProfileId);
        }

        setIsInitializing(false);
    };

    init();

    const savedHistory = localStorage.getItem('aac_history_ids');
    if (savedHistory) {
        try { setHistoryIds(JSON.parse(savedHistory)); } catch (e) { console.error("History parse fail", e); }
    }

    const handleFirstInteraction = () => {
      unlockAudioContext();
      window.removeEventListener('click', handleFirstInteraction);
      window.removeEventListener('touchstart', handleFirstInteraction);
      window.removeEventListener('keydown', handleFirstInteraction);
    };

    window.addEventListener('click', handleFirstInteraction);
    window.addEventListener('touchstart', handleFirstInteraction);
    window.addEventListener('keydown', handleFirstInteraction);

    return () => {
      window.removeEventListener('click', handleFirstInteraction);
      window.removeEventListener('touchstart', handleFirstInteraction);
      window.removeEventListener('keydown', handleFirstInteraction);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem('aac_settings', JSON.stringify(settings));
  }, [settings]);
  
  useEffect(() => {
      if (currentBoardId) localStorage.setItem('aac_last_board', currentBoardId);
  }, [currentBoardId]);

  useEffect(() => {
      if (currentProfileId) localStorage.setItem('aac_last_profile', currentProfileId);
  }, [currentProfileId]);

  useEffect(() => {
      if (!isEditMode) {
          setIsSearchActive(false);
          setSearchQuery('');
          setEditOptionsItem(null);
      }
  }, [isEditMode]);

  useEffect(() => {
    if (currentFolderId === ROOT_FOLDER) {
        setBreadcrumbs([]);
        return;
    }
    const path: {id: string, label: string}[] = [];
    let curr = categories.find(c => c.id === currentFolderId && c.boardId === currentBoardId);
    while (curr) {
        path.unshift({ id: curr.id, label: curr.label });
        if (!curr.parentId || curr.parentId === ROOT_FOLDER) {
            curr = undefined;
        } else {
            curr = categories.find(c => c.id === curr?.parentId && c.boardId === currentBoardId);
        }
    }
    setBreadcrumbs(path);
  }, [currentFolderId, categories, currentBoardId]);

  useEffect(() => {
    if (breadcrumbsScrollRef.current) {
        breadcrumbsScrollRef.current.scrollTo({
            left: breadcrumbsScrollRef.current.scrollWidth,
            behavior: 'smooth'
        });
    }
  }, [breadcrumbs]);

  const loadProfileData = async (profileId: string) => {
    try {
      let pBoards = await getAllBoards(profileId);
      let pFirstBoardId = '';

      if (pBoards.length === 0) {
          pFirstBoardId = await initializeBoards(t('boards.default_name'), profileId);
          pBoards = await getAllBoards(profileId);
      } else {
          const lastBoardId = localStorage.getItem('aac_last_board');
          if (lastBoardId && pBoards.find(b => b.id === lastBoardId)) {
              pFirstBoardId = lastBoardId;
          } else {
              pFirstBoardId = pBoards[0].id;
          }
      }

      const [pItems, pCats] = await Promise.all([
          getAllItems(profileId), 
          getAllCategories(profileId)
      ]);

      setLibrary(pItems);
      setCategories(pCats);
      setBoards(pBoards);
      setCurrentBoardId(pFirstBoardId);
      setCurrentFolderId(ROOT_FOLDER);
      setSentence([]);
      setBoardHistory([]);

    } catch (error) {
      console.error("Failed to load profile data", error);
    }
  };

  const loadData = async () => {
      if (!currentProfileId) return;
      const [items, cats, allBoards] = await Promise.all([
          getAllItems(currentProfileId), 
          getAllCategories(currentProfileId), 
          getAllBoards(currentProfileId)
      ]);
      setLibrary(items);
      setCategories(cats);
      setBoards(allBoards);
  };

  const gridItems = useMemo<GridItem[]>(() => {
    const currentItems = library.filter(item => {
        if (item.boardId !== currentBoardId) return false;

        if (isSearchActive && searchQuery) return item.label.toLowerCase().includes(searchQuery.toLowerCase()) && (isEditMode || item.isVisible !== false);
        return item.category === currentFolderId && (isEditMode || item.isVisible !== false);
    }).map(i => ({ ...i, type: 'card' } as GridItem));

    const currentFolders = categories.filter(cat => {
        if (cat.boardId !== currentBoardId) return false;

        if (isSearchActive && searchQuery) return false;
        if (currentFolderId === ROOT_FOLDER) return !cat.parentId || cat.parentId === ROOT_FOLDER;
        return cat.parentId === currentFolderId;
    }).map(c => ({ ...c, type: 'folder' } as GridItem));

    return [...currentFolders, ...currentItems].sort(sortItems);
  }, [library, categories, currentFolderId, isEditMode, isSearchActive, searchQuery, currentBoardId]);

  const handleManualReorder = async (itemId: string, direction: -1 | 1) => {
      const currentList = [...gridItems];
      const currentIndex = currentList.findIndex(i => i.id === itemId);
      if (currentIndex === -1) return;
      
      const targetIndex = currentIndex + direction;
      if (targetIndex < 0 || targetIndex >= currentList.length) return;

      const itemA = currentList[currentIndex];
      const itemB = currentList[targetIndex];
      
      currentList[currentIndex] = itemB;
      currentList[targetIndex] = itemA;

      const itemsToUpdate: AACItem[] = [];
      const foldersToUpdate: Category[] = [];

      currentList.forEach((item, index) => {
          if (item.order !== index) {
              if (item.type === 'card') {
                  const { type, ...rest } = item as (AACItem & { type: 'card' });
                  itemsToUpdate.push({ ...rest, order: index });
              } else {
                  const { type, ...rest } = item as (Category & { type: 'folder' });
                  foldersToUpdate.push({ ...rest, order: index });
              }
          }
      });

      if (itemsToUpdate.length > 0) {
          const newLib = [...library];
          itemsToUpdate.forEach(u => {
              const idx = newLib.findIndex(i => i.id === u.id);
              if (idx !== -1) newLib[idx] = u;
          });
          setLibrary(newLib);
          await saveItemsBatch(itemsToUpdate);
      }

      if (foldersToUpdate.length > 0) {
          const newCats = [...categories];
          foldersToUpdate.forEach(u => {
              const idx = newCats.findIndex(c => c.id === u.id);
              if (idx !== -1) newCats[idx] = u;
          });
          setCategories(newCats);
          await saveCategoriesBatch(foldersToUpdate);
      }
  };

  const speakText = async (text: string) => {
    if (!text || text.trim() === '') return;
    await voiceService.speak({
      text,
      language: settings.language,
      rate: settings.voiceRate,
      pitch: settings.voicePitch,
    });
  };

  const handleSaveItem = async (itemData: Omit<AACItem, 'id' | 'createdAt' | 'boardId' | 'profileId'>) => {
    const maxOrder = gridItems.reduce((max, item) => Math.max(max, item.order || 0), -1);

    if (editingItem) {
        const updatedItem = { ...editingItem, ...itemData };
        await saveItem(updatedItem);
        setSentence(prev => prev.map(item => item.id === updatedItem.id ? updatedItem : item));
    } else {
        await saveItem({ 
            ...itemData, 
            id: crypto.randomUUID(), 
            profileId: currentProfileId,
            boardId: currentBoardId, 
            category: currentFolderId, 
            createdAt: Date.now(), 
            isVisible: itemData.isVisible ?? true,
            order: maxOrder + 1
        });
    }
    await loadData();
    setEditingItem(null);
  };

  const handleSaveLinkBoard = async (label: string, linkedBoardId: string, imageUrl: string) => {
      const maxOrder = gridItems.reduce((max, item) => Math.max(max, item.order || 0), -1);
      
      await saveItem({
          id: crypto.randomUUID(),
          profileId: currentProfileId,
          boardId: currentBoardId,
          linkedBoardId: linkedBoardId, 
          label: label,
          imageUrl: imageUrl,
          category: currentFolderId,
          createdAt: Date.now(),
          isVisible: true,
          colorTheme: 'purple',
          order: maxOrder + 1
      });
      await loadData();
  };

  const handleSaveFolder = async (label: string, color: ColorTheme, icon: string) => {
    const maxOrder = gridItems.reduce((max, item) => Math.max(max, item.order || 0), -1);

    if (editingFolder) {
        await saveCategory({ ...editingFolder, label, colorTheme: color, icon });
    } else {
        await saveCategory({
            id: crypto.randomUUID(),
            profileId: currentProfileId,
            boardId: currentBoardId,
            label,
            colorTheme: color,
            parentId: currentFolderId,
            icon,
            order: maxOrder + 1
        });
    }
    await loadData();
    setEditingFolder(null);
  };

  const getNextOrderInFolder = (folderId: string) => {
     const itemsInFolder = library.filter(i => i.boardId === currentBoardId && i.category === folderId);
     const foldersInFolder = categories.filter(c => c.boardId === currentBoardId && (c.parentId || ROOT_FOLDER) === folderId);
     
     const maxItemOrder = Math.max(...itemsInFolder.map(i => i.order || 0), -1);
     const maxFolderOrder = Math.max(...foldersInFolder.map(c => c.order || 0), -1);
     
     return Math.max(maxItemOrder, maxFolderOrder) + 1;
  };

  const confirmDelete = async () => {
    if (itemToDelete) {
      await deleteItem(itemToDelete);
      setSentence(prev => prev.filter(item => item && item.id !== itemToDelete));
      await loadData();
      setItemToDelete(null);
    } else if (folderToDelete) {
        const getAllSubfolderIds = (parentId: string): string[] => {
            const children = categories.filter(c => c.boardId === currentBoardId && c.parentId === parentId);
            let ids = children.map(c => c.id);
            children.forEach(c => {
                ids = [...ids, ...getAllSubfolderIds(c.id)];
            });
            return ids;
        };

        const foldersToRemoveIds = [folderToDelete, ...getAllSubfolderIds(folderToDelete)];
        const itemsToRescue = library.filter(item => item.boardId === currentBoardId && foldersToRemoveIds.includes(item.category));

        if (itemsToRescue.length > 0) {
            let nextOrder = getNextOrderInFolder(ROOT_FOLDER);
            const rescuedItems = itemsToRescue.map((item, index) => ({ 
                ...item, 
                category: ROOT_FOLDER,
                order: nextOrder + index 
            }));
            await saveItemsBatch(rescuedItems);
        }

        for (const id of foldersToRemoveIds) {
            await deleteCategory(id);
        }

        await loadData();
        if (foldersToRemoveIds.includes(currentFolderId)) {
            setCurrentFolderId(ROOT_FOLDER);
        }
        setFolderToDelete(null);
    }
  };

  const handleMove = async (targetFolderId: string) => {
    if (!moveModalItem) return;

    const nextOrder = getNextOrderInFolder(targetFolderId);

    if (moveModalItem.type === 'card') {
        const item = moveModalItem.item as AACItem;
        const updated = { ...item, category: targetFolderId, order: nextOrder };
        await saveItem(updated);
    } else {
        const folder = moveModalItem.item as Category;
        const updated = { ...folder, parentId: targetFolderId, order: nextOrder };
        await saveCategory(updated);
    }
    
    await loadData();
    setMoveModalItem(null);
  };

  const handleCreateBoard = async (label: string) => {
      const newId = await createNewBoard(label, currentProfileId);
      await loadData();
      setCurrentBoardId(newId);
      setBoardHistory([]); 
      setCurrentFolderId(ROOT_FOLDER);
      setIsBoardsModalOpen(false);
  };

  const handleSwitchBoard = (id: string) => {
      setCurrentBoardId(id);
      setBoardHistory([]); 
      setCurrentFolderId(ROOT_FOLDER);
      setIsBoardsModalOpen(false);
  };
  
  const handleBoardBack = () => {
      if (boardHistory.length === 0) return;
      
      const prevBoardId = boardHistory[boardHistory.length - 1];
      const newHistory = boardHistory.slice(0, -1);
      
      setBoardHistory(newHistory);
      setCurrentBoardId(prevBoardId);
      setCurrentFolderId(ROOT_FOLDER); 
  };

  const handleDeleteBoard = async (id: string) => {
      await deleteBoard(id);
      await loadData();
      
      if (id === currentBoardId) {
          const remainingBoards = await getAllBoards(currentProfileId);
          if (remainingBoards.length > 0) {
              setCurrentBoardId(remainingBoards[0].id);
              setCurrentFolderId(ROOT_FOLDER);
              setBoardHistory([]);
          }
      }
  };

  const handleUpdateBoard = async (board: Board) => {
      await saveBoard(board);
      await loadData();
  };

  const handleCreateProfile = async (name: string, age: number, colorTheme: ColorTheme) => {
     const newId = crypto.randomUUID();
     const profile: ChildProfile = {
         id: newId,
         name,
         age,
         colorTheme,
         createdAt: Date.now()
     };
     await saveProfile(profile);
     
     const allProfiles = await getAllProfiles();
     setProfiles(allProfiles);

     await handleSwitchProfile(newId);
     setIsProfileModalOpen(false);
  };

  const handleUpdateProfile = async (profile: ChildProfile) => {
      await saveProfile(profile);
      const allProfiles = await getAllProfiles();
      setProfiles(allProfiles);
      if (profile.id === currentProfileId) {
           await loadProfileData(profile.id);
      }
  };

  const handleSwitchProfile = async (id: string) => {
      if (id === currentProfileId) {
          setIsProfileModalOpen(false);
          return;
      }
      setCurrentProfileId(id);
      await loadProfileData(id);
      setIsProfileModalOpen(false);
  };

  const handleDeleteProfile = async (id: string) => {
      await deleteProfile(id);
      const remaining = await getAllProfiles();
      setProfiles(remaining);
      
      if (remaining.length === 0) {
          setCurrentProfileId('');
          setLibrary([]);
          setCategories([]);
          setBoards([]);
      } else if (id === currentProfileId) {
          await handleSwitchProfile(remaining[0].id);
      }
  };

  const handleExportData = async () => {
    try {
        const backupData = await generateBackupData();
        
        const finalBackup = {
            version: 2,
            timestamp: Date.now(),
            settings,
            ...backupData
        };

        const jsonString = JSON.stringify(finalBackup, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        const date = new Date().toISOString().split('T')[0];
        a.download = `speakeasy-full-backup-${date}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } catch (e) {
        console.error("Export failed", e);
        alert("Failed to create backup file.");
    }
  };

  const handleImportData = async (file: File) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const json = e.target?.result as string;
            const data = JSON.parse(json);

            if (!data.items || !data.categories) {
                alert("Invalid backup file format.");
                return;
            }

            if (confirm("Importing will add/update data. Existing items will be preserved/merged. Continue?")) {
                if (data.settings) setSettings(prev => ({...prev, ...data.settings}));
                
                if (data.profiles && Array.isArray(data.profiles)) {
                    for (const p of data.profiles) {
                        await saveProfile(p);
                    }
                }

                if (data.boards && Array.isArray(data.boards)) await saveBoardsBatch(data.boards);

                if (data.categories && Array.isArray(data.categories)) await saveCategoriesBatch(data.categories);

                if (data.items && Array.isArray(data.items)) await saveItemsBatch(data.items);

                const allP = await getAllProfiles();
                setProfiles(allP);
                if (allP.length > 0) {
                    if (!allP.find(p => p.id === currentProfileId)) {
                        await handleSwitchProfile(allP[0].id);
                    } else {
                        await loadData();
                    }
                }

                alert("Import successful!");
                setIsSettingsOpen(false);
            }
        } catch (err) {
            console.error("Import error", err);
            alert("Failed to parse backup file.");
        }
    };
    reader.readAsText(file);
  };

  const stopPlayback = async () => {
    playbackSessionRef.current += 1; 
    await voiceService.stop();
    setIsPlaying(false);
    setActiveIndex(null);
  };

  const addToSentence = async (item: AACItem) => {
    if (isPlaying || !item) return;

    if (item.linkedBoardId) {
        speakText(item.label).catch(console.error);
        setBoardHistory(prev => [...prev, currentBoardId]);
        setCurrentBoardId(item.linkedBoardId);
        setCurrentFolderId(ROOT_FOLDER);
        return;
    }

    setSentence(prev => [...prev, item]);
    playItemSound(item);
  };

  const removeFromSentence = (index: number) => {
    if (isPlaying) stopPlayback();
    setSentence(prev => prev.filter((_, idx) => idx !== index));
  };

  const removeLastFromSentence = () => {
    if (isPlaying) stopPlayback();
    setSentence(prev => prev.slice(0, -1));
  };

  const clearSentence = () => {
    if (isPlaying) stopPlayback();
    setSentence([]);
  };

  const handleSelectHistorySentence = (items: AACItem[]) => {
    if (isPlaying) stopPlayback();
    setSentence(items);
  };

  const playItemSound = async (item: AACItem) => {
    if (!item) return;
    try {
      if (item.audioUrl) {
        await playAudio(item.audioUrl);
      } else {
        const text = (item.textToSpeak || item.label || '').trim();
        if (text) await speakText(text);
      }
    } catch (e) {
      if (item.label) await speakText(item.label);
    }
  };

  const addToHistory = (items: AACItem[]) => {
      if (!items || items.length === 0) return;
      setHistoryIds(prev => {
        const newIds = [items.map(i => i.id), ...prev].slice(0, 15);
        localStorage.setItem('aac_history_ids', JSON.stringify(newIds));
        return newIds;
      });
  };

  const playSentence = async () => {
    const validSentence = sentence.filter(item => !!item && (item.label || item.textToSpeak || item.audioUrl));
    if (validSentence.length === 0 || isPlaying) return;
    const currentSession = ++playbackSessionRef.current;
    addToHistory(validSentence);
    setIsPlaying(true);
    try {
      for (let i = 0; i < validSentence.length; i++) {
        if (playbackSessionRef.current !== currentSession) break;
        setActiveIndex(i);
        await Promise.race([playItemSound(validSentence[i]), new Promise(resolve => setTimeout(resolve, 8000))]);
        if (playbackSessionRef.current !== currentSession) break;
        await new Promise(r => setTimeout(r, 100));
      }
    } catch (err) { console.error(err); } finally {
      if (playbackSessionRef.current === currentSession) {
          // Add a small delay to ensure the last word finishes fully on Android before we force-stop
          // We intentionally DO NOT call voiceService.stop() here to allow the tail of the audio to finish playing naturally.
          await new Promise(r => setTimeout(r, 500));
          
          setActiveIndex(null);
          setIsPlaying(false);
      }
    }
  };

  const startUnlock = () => {
    if (isEditMode) return;
    if (unlockTimerRef.current) clearTimeout(unlockTimerRef.current);
    
    setIsHoldingUnlock(true);
    unlockTimerRef.current = window.setTimeout(() => {
      setIsEditMode(true);
      setIsHoldingUnlock(false);
      ignoreNextClick.current = true;
      if (navigator.vibrate) navigator.vibrate([40, 40]);
      
      setTimeout(() => {
          if (ignoreNextClick.current) ignoreNextClick.current = false;
      }, 1000);
    }, 2500);
  };

  const cancelUnlock = () => {
      if (unlockTimerRef.current) {
          clearTimeout(unlockTimerRef.current);
          unlockTimerRef.current = null;
      }
      setIsHoldingUnlock(false);
  };

  const handleLockToggle = () => {
      if (ignoreNextClick.current) {
          ignoreNextClick.current = false;
          return;
      }
      if (isEditMode) {
          setIsEditMode(false);
          ignoreNextClick.current = false;
      }
  };

  const getGridClass = () => {
    switch (settings.gridColumns) {
      case 'small': return 'grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10';
      case 'large': return 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5';
      case 'medium': default: return 'grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6';
    }
  };
  
  const getLabelSize = () => {
     if (settings.gridColumns === 'small') return 'text-[10px] sm:text-xs leading-tight';
     return 'text-xs sm:text-sm leading-tight';
  };

  const getCardStyle = (item: AACItem) => {
    if (item.colorTheme) return THEME_STYLES[item.colorTheme];
    const folder = categories.find(c => c.id === item.category);
    return folder ? THEME_STYLES[folder.colorTheme] : DEFAULT_CARD_STYLE;
  };

  const handleFolderClick = (folder: Category) => {
      setCurrentFolderId(folder.id);
  };

  const navigateToBreadcrumb = (id: string) => setCurrentFolderId(id);

  if (isInitializing) return <div className="h-screen w-full flex items-center justify-center bg-background"><div className="animate-spin text-primary rounded-full h-12 w-12 border-t-4 border-b-4 border-primary"></div></div>;

  return (
    <div className="h-screen w-full bg-background pattern-grid flex flex-col overflow-hidden font-sans select-none">
      
      {/* --- Header --- */}
      <div className="flex justify-between items-center px-4 py-3 bg-white/90 backdrop-blur-sm border-b border-slate-200 z-20 shrink-0" style={{ paddingTop: isAndroid ? 'max(2rem, env(safe-area-inset-top))' : 'max(0.75rem, env(safe-area-inset-top))' }}>
        {isSearchActive ? (
            <div className="flex-1 flex items-center gap-3">
                <div className="relative flex-1">
                    <input 
                        type="text" 
                        value={searchQuery} 
                        onChange={(e) => setSearchQuery(e.target.value)} 
                        placeholder={t('search.placeholder')} 
                        autoFocus 
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-100 border-2 border-primary/20 rounded-xl outline-none font-bold text-slate-800 placeholder:text-slate-400 text-base" 
                    />
                    <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                </div>
                <button onClick={() => { setIsSearchActive(false); setSearchQuery(''); }} className="p-2.5 bg-slate-100 text-slate-500 rounded-xl"><X size={20} /></button>
            </div>
        ) : (
            <>
                <div className="flex items-center gap-3">
                    {boardHistory.length > 0 ? (
                        <button 
                            onClick={handleBoardBack}
                            className="bg-white border-2 border-slate-200 text-slate-700 hover:text-primary hover:border-primary px-3 py-2 rounded-xl flex items-center gap-2 font-bold shadow-sm active:scale-95 transition-all"
                        >
                            <ChevronLeft size={24} strokeWidth={3} />
                            <span className="hidden sm:inline">{t('header.back')}</span>
                        </button>
                    ) : (
                        <div className="flex items-center space-x-2">
                            <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center text-white font-black text-lg shadow-md">S</div>
                            <h1 className="font-extrabold text-slate-700 text-xl hidden sm:block">{t('app.title')}</h1>
                        </div>
                    )}
                </div>
                
                <div className="flex items-center gap-3">
                    <button onClick={() => setIsSearchActive(true)} className="p-2.5 rounded-full bg-slate-100 text-slate-400"><Search size={20} /></button>
                    <button 
                        onMouseDown={startUnlock} 
                        onMouseUp={cancelUnlock} 
                        onMouseLeave={cancelUnlock}
                        onTouchStart={startUnlock} 
                        onTouchEnd={cancelUnlock}
                        onTouchCancel={cancelUnlock}
                        onClick={handleLockToggle}
                        className={`relative overflow-hidden p-2 pr-4 rounded-full flex items-center space-x-2 border-2 ${isEditMode ? 'bg-red-50 text-red-600' : 'bg-white text-slate-400'}`}
                    >
                        {!isEditMode && <div className={`absolute inset-0 bg-slate-200/80 transition-transform ease-linear origin-left ${isHoldingUnlock ? 'scale-x-100 duration-[2500ms]' : 'scale-x-0'}`} />}
                        <div className={`relative z-10 p-1.5 rounded-full ${isEditMode ? 'bg-red-100' : 'bg-slate-100'}`}>{isEditMode ? <Unlock size={16} /> : <Lock size={16} />}</div>
                        <div className="relative z-10 flex flex-col items-start"><span className="text-xs font-bold uppercase">{isHoldingUnlock ? t('mode.holding') : (isEditMode ? t('mode.parent') : t('mode.child'))}</span></div>
                    </button>
                </div>
            </>
        )}
      </div>

      <SentenceStrip items={sentence} categories={categories} onRemoveItem={removeFromSentence} onRemoveLastItem={removeLastFromSentence} onClear={clearSentence} onPlay={playSentence} onShowHistory={() => setIsHistoryOpen(true)} isPlaying={isPlaying} activeIndex={activeIndex} t={t} />

      {!isSearchActive && currentFolderId !== ROOT_FOLDER && (
          <div ref={breadcrumbsScrollRef} className="relative shrink-0 bg-white/50 border-b border-slate-200/60 z-20 backdrop-blur-md px-4 py-3 flex items-center overflow-x-auto no-scrollbar">
              <button 
                  onClick={() => setCurrentFolderId(ROOT_FOLDER)}
                  className={`
                    flex items-center space-x-1 px-2 py-1.5 rounded-lg transition-all
                    ${currentFolderId === ROOT_FOLDER ? 'text-slate-800 font-bold bg-slate-100' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'}
                  `}
              >
                  <Home size={18} />
              </button>
              {breadcrumbs.map((crumb, index) => (
                  <React.Fragment key={crumb.id}>
                      <ChevronRight size={16} className="text-slate-300 mx-1 flex-shrink-0" />
                      <button 
                          onClick={() => navigateToBreadcrumb(crumb.id)}
                          className={`
                            whitespace-nowrap px-3 py-1.5 rounded-lg text-sm font-bold transition-all
                            ${index === breadcrumbs.length - 1 ? 'text-primary bg-primary/10' : 'text-slate-600 hover:bg-slate-100'}
                          `}
                      >
                          {crumb.label}
                      </button>
                  </React.Fragment>
              ))}
          </div>
      )}

      <main className={`flex-1 overflow-y-auto p-4 ${isEditMode ? 'pb-40' : 'pb-32'}`}>
        <div className={`grid gap-4 max-w-7xl mx-auto ${getGridClass()}`}>
            
            {gridItems.map((item, index) => {
                const isHidden = (item as AACItem).isVisible === false;
                
                const isFirst = index === 0;
                const isLast = index === gridItems.length - 1;

                if (item.type === 'folder') {
                    const folder = item as Category;
                    
                    return (
                        <div key={folder.id} className="relative">
                            <FolderCard 
                                folder={folder} 
                                onClick={() => handleFolderClick(folder)} 
                                onReorderLeft={(e) => { e.stopPropagation(); handleManualReorder(folder.id, -1); }}
                                onReorderRight={(e) => { e.stopPropagation(); handleManualReorder(folder.id, 1); }}
                                canMoveLeft={!isFirst}
                                canMoveRight={!isLast}
                                isEditMode={isEditMode}
                                onEdit={() => setEditOptionsItem({ item: folder, type: 'folder' })}
                            />
                        </div>
                    );
                } else {
                    const card = item as AACItem;
                    const style = getCardStyle(card);
                    const isLink = !!card.linkedBoardId;
                    
                    return (
                        <div 
                            key={card.id} 
                            className={`
                                relative aspect-[4/5] rounded-3xl p-2 flex flex-col gap-2 border-b-4 border-r-4 shadow-sm active:border-0 active:translate-y-1 transition-all 
                                ${style.bg} ${style.border} 
                                ${isHidden ? 'opacity-50 grayscale' : ''} 
                            `}
                            onClick={() => {
                                addToSentence(card);
                            }}
                        >
                            <div className="flex-1 w-full bg-white rounded-2xl overflow-hidden border-2 border-white/50 relative group flex items-center justify-center p-1">
                                <img src={card.imageUrl} alt={card.label} className="w-full h-full object-contain pointer-events-none" loading="lazy" />
                                
                                {isLink && (
                                    <div className="absolute top-1 right-1 bg-purple-100 text-purple-600 p-1.5 rounded-full shadow-sm z-20">
                                        <ArrowUpRight size={18} strokeWidth={3} />
                                    </div>
                                )}

                                {isEditMode && (
                                    <>
                                        <button 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setEditOptionsItem({ item: card, type: 'card' });
                                            }}
                                            className="absolute top-1 right-1 bg-white/90 backdrop-blur-sm rounded-full p-2 shadow-sm z-30 border border-slate-200 hover:bg-slate-100 active:scale-95 transition-all"
                                        >
                                            <Settings2 size={16} className="text-slate-700" />
                                        </button>

                                        <div className="absolute bottom-2 inset-x-2 flex justify-between z-10">
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); handleManualReorder(card.id, -1); }}
                                                disabled={isFirst}
                                                className={`
                                                    w-9 h-9 flex items-center justify-center rounded-full shadow-lg border-2 transition-all active:scale-95 backdrop-blur-md
                                                    ${isFirst 
                                                        ? 'bg-slate-100/50 border-slate-200 text-slate-300 opacity-50 cursor-not-allowed' 
                                                        : 'bg-white border-slate-200 text-slate-700 hover:border-primary hover:text-primary hover:bg-slate-50'}
                                                `}
                                            >
                                                <ArrowLeft size={20} strokeWidth={2.5} />
                                            </button>
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); handleManualReorder(card.id, 1); }}
                                                disabled={isLast}
                                                className={`
                                                    w-9 h-9 flex items-center justify-center rounded-full shadow-lg border-2 transition-all active:scale-95 backdrop-blur-md
                                                    ${isLast 
                                                        ? 'bg-slate-100/50 border-slate-200 text-slate-300 opacity-50 cursor-not-allowed' 
                                                        : 'bg-white border-slate-200 text-slate-700 hover:border-primary hover:text-primary hover:bg-slate-50'}
                                                `}
                                            >
                                                <ArrowRight size={20} strokeWidth={2.5} />
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                            <div className="h-10 flex items-center justify-center">
                                <span className={`font-black text-center line-clamp-2 ${getLabelSize()} ${style.text}`}>
                                    {card.label}
                                </span>
                            </div>
                        </div>
                    );
                }
            })}
        </div>
        
        {!isSearchActive && gridItems.length === 0 && (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400 space-y-4">
                <FolderPlus size={48} className="opacity-20" />
                <p className="font-bold text-center opacity-50">{t('app.empty_folder')}</p>
                {!isEditMode && <div className="text-xs text-center max-w-xs opacity-40">{t('app.switch_parent')}</div>}
            </div>
        )}
      </main>

      {isEditMode && (
        <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-lg border-t border-slate-200 p-4 z-50 flex items-center justify-between gap-4" style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}>
            
            {/* Left Side: Profiles & Boards */}
            <div className="flex-1 flex justify-start gap-4 sm:gap-8 pl-2">
                <button onClick={() => setIsProfileModalOpen(true)} className="flex flex-col items-center text-slate-500 group">
                    <div className="p-1 rounded-full group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                        <User size={24} />
                    </div>
                    <span className="text-[10px] font-bold group-hover:text-indigo-600">{t('nav.profiles')}</span>
                </button>

                <button onClick={() => setIsBoardsModalOpen(true)} className="flex flex-col items-center text-slate-500 group">
                    <div className="p-1 rounded-full group-hover:bg-purple-50 group-hover:text-purple-600 transition-colors">
                        <Layers size={24} />
                    </div>
                    <span className="text-[10px] font-bold group-hover:text-purple-600">{t('nav.boards')}</span>
                </button>
            </div>

            {/* Center: Add Button */}
            <button onClick={() => setIsCreateSelectionOpen(true)} className="w-16 h-16 bg-primary text-white rounded-2xl flex items-center justify-center border-4 border-white shadow-xl -mt-12 active:scale-95 transition-transform shrink-0 z-10">
                <Plus size={32} />
            </button>
            
            {/* Right Side: Settings */}
            <div className="flex-1 flex justify-end gap-4 sm:gap-8 pr-2">
                <button onClick={() => setIsSettingsOpen(true)} className="flex flex-col items-center text-slate-500 group">
                    <div className="p-1 rounded-full group-hover:bg-slate-100 group-hover:text-slate-800 transition-colors">
                        <Settings2 size={24} />
                    </div>
                    <span className="text-[10px] font-bold group-hover:text-slate-800">{t('nav.settings')}</span>
                </button>
            </div>
        </div>
      )}

      <MoveItemModal 
         isOpen={!!moveModalItem}
         onClose={() => setMoveModalItem(null)}
         itemToMove={moveModalItem}
         categories={categories.filter(c => c.boardId === currentBoardId)} 
         onMove={handleMove}
         t={t}
      />

      <EditOptionsModal
         isOpen={!!editOptionsItem}
         onClose={() => setEditOptionsItem(null)}
         item={editOptionsItem?.item || null}
         type={editOptionsItem?.type || 'card'}
         onEdit={() => {
             if (!editOptionsItem) return;
             if (editOptionsItem.type === 'card') {
                 setEditingItem(editOptionsItem.item as AACItem);
                 setIsCreateModalOpen(true);
             } else {
                 setEditingFolder(editOptionsItem.item as Category);
                 setIsFolderModalOpen(true);
             }
         }}
         onMove={() => {
             if (editOptionsItem) setMoveModalItem(editOptionsItem);
         }}
         onDelete={() => {
             if (!editOptionsItem) return;
             if (editOptionsItem.type === 'card') {
                 setItemToDelete(editOptionsItem.item.id);
             } else {
                 setFolderToDelete(editOptionsItem.item.id);
             }
         }}
         t={t}
      />

      <CreateSelectionModal 
        isOpen={isCreateSelectionOpen}
        onClose={() => setIsCreateSelectionOpen(false)}
        onSelectCard={() => { setIsCreateSelectionOpen(false); setIsCreateModalOpen(true); }}
        onSelectFolder={() => { setIsCreateSelectionOpen(false); setEditingFolder(null); setIsFolderModalOpen(true); }}
        onSelectLink={() => { setIsCreateSelectionOpen(false); setIsLinkBoardModalOpen(true); }}
        t={t}
      />

      <CreateCardModal 
        isOpen={isCreateModalOpen} 
        onClose={() => { setIsCreateModalOpen(false); setEditingItem(null); }} 
        onSave={handleSaveItem} 
        editItem={editingItem} 
        t={t} 
        language={settings.language} 
        currentFolderName={currentFolderId === ROOT_FOLDER ? t('app.home_folder') : categories.find(c => c.id === currentFolderId)?.label}
        defaultColorTheme={categories.find(c => c.id === currentFolderId)?.colorTheme || 'slate'}
      />

      <FolderModal 
        isOpen={isFolderModalOpen}
        onClose={() => { setIsFolderModalOpen(false); setEditingFolder(null); }}
        onSave={handleSaveFolder}
        editFolder={editingFolder}
        t={t}
        language={settings.language}
      />
      
      <BoardsModal
        isOpen={isBoardsModalOpen}
        onClose={() => setIsBoardsModalOpen(false)}
        boards={boards}
        currentBoardId={currentBoardId}
        onSwitchBoard={handleSwitchBoard}
        onCreateBoard={handleCreateBoard}
        onDeleteBoard={handleDeleteBoard}
        onUpdateBoard={handleUpdateBoard}
        t={t}
      />

      <LinkBoardModal
        isOpen={isLinkBoardModalOpen}
        onClose={() => setIsLinkBoardModalOpen(false)}
        onSave={handleSaveLinkBoard}
        boards={boards}
        currentBoardId={currentBoardId}
        t={t}
      />

      <ProfileSelectionModal 
        isOpen={isProfileModalOpen}
        onClose={() => {
            if (profiles.length > 0) setIsProfileModalOpen(false);
        }}
        profiles={profiles}
        currentProfileId={currentProfileId}
        onSelectProfile={handleSwitchProfile}
        onCreateProfile={handleCreateProfile}
        onDeleteProfile={handleDeleteProfile}
        onUpdateProfile={handleUpdateProfile}
        t={t}
        forceCreate={profiles.length === 0}
        language={settings.language}
        onUpdateLanguage={(lang) => setSettings(prev => ({ ...prev, language: lang }))}
      />

      <ConfirmationModal 
        isOpen={!!itemToDelete || !!folderToDelete} 
        onClose={() => { setItemToDelete(null); setFolderToDelete(null); }} 
        onConfirm={confirmDelete} 
        isFolder={!!folderToDelete}
        t={t} 
      />
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} settings={settings} onUpdateSettings={setSettings} onExportData={handleExportData} onImportData={handleImportData} t={t} />
      <HistoryModal isOpen={isHistoryOpen} onClose={() => setIsHistoryOpen(false)} historyIds={historyIds} library={library} onSelectSentence={handleSelectHistorySentence} t={t} />
    </div>
  );
}

export default App;