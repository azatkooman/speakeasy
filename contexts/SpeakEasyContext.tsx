
import React, { createContext, useContext, useState, useEffect, useRef, useMemo } from 'react';
import { AACItem, Category, Board, ChildProfile, AppSettings, ColorTheme } from '../types.ts';
import { TranslationKey, getTranslation } from '../services/translations.ts';
import { 
  getAllItems, getAllCategories, getAllBoards, getAllProfiles,
  saveItem, saveCategory, saveBoard, saveProfile,
  deleteItem, deleteCategory, deleteBoard, deleteProfile,
  saveItemsBatch, saveCategoriesBatch, saveBoardsBatch,
  initializeBoards, createNewBoard, ROOT_FOLDER
} from '../services/storage.ts';
import { voiceService } from '../services/voice.ts';
import { audioPlayer } from '../services/audioPlayer.ts';

interface SpeakEasyContextType {
  profiles: ChildProfile[];
  currentProfileId: string;
  boards: Board[];
  currentBoardId: string;
  library: AACItem[];
  categories: Category[];
  sentence: AACItem[];
  settings: AppSettings;
  isEditMode: boolean;
  isInitializing: boolean;
  isPlaying: boolean;
  activeIndex: number | null;
  currentFolderId: string;
  searchQuery: string;
  isSearchActive: boolean;
  boardHistory: string[];

  gridItems: any[];
  breadcrumbs: {id: string, label: string}[];

  t: (key: TranslationKey) => string;
  setSettings: (s: AppSettings) => void;
  setEditMode: (v: boolean) => void;
  setSearchQuery: (q: string) => void;
  setIsSearchActive: (v: boolean) => void;
  
  switchProfile: (id: string) => Promise<void>;
  switchBoard: (id: string) => void;
  navigateToFolder: (id: string) => void;
  navigateBackFolder: () => void;
  navigateBackBoard: () => void;
  
  createProfile: (name: string, age: number, color: ColorTheme) => Promise<void>;
  updateProfile: (p: ChildProfile) => Promise<void>;
  removeProfile: (id: string) => Promise<void>;
  
  createBoard: (label: string) => Promise<void>;
  updateBoard: (b: Board) => Promise<void>;
  removeBoard: (id: string) => Promise<void>;
  
  saveCard: (data: Omit<AACItem, 'id' | 'createdAt' | 'boardId' | 'profileId'>, existingId?: string) => Promise<void>;
  saveFolderObj: (label: string, color: ColorTheme, icon: string, existingFolder?: Category | null) => Promise<void>;
  saveLinkBoard: (label: string, linkedBoardId: string, imageUrl: string) => Promise<void>;
  
  deleteCard: (id: string) => Promise<void>;
  deleteFolderObj: (id: string) => Promise<void>;
  
  reorderGrid: (itemId: string, direction: -1 | 1) => Promise<void>;
  moveItemToFolder: (item: AACItem | Category, type: 'card' | 'folder', targetFolderId: string) => Promise<void>;

  addToSentence: (item: AACItem) => void;
  removeFromSentence: (index: number) => void;
  removeLastFromSentence: () => void;
  clearSentence: () => void;
  playSentence: () => Promise<void>;
  setSentenceFromHistory: (items: AACItem[]) => void;
}

const SpeakEasyContext = createContext<SpeakEasyContextType | undefined>(undefined);

export const useSpeakEasy = () => {
  const context = useContext(SpeakEasyContext);
  if (!context) {
    throw new Error('useSpeakEasy must be used within a SpeakEasyProvider');
  }
  return context;
};

const DEFAULT_SETTINGS: AppSettings = {
  voicePitch: 1.0,
  voiceRate: 0.9,
  gridColumns: 'medium',
  language: typeof navigator !== 'undefined' && navigator.language.toLowerCase().startsWith('ru') ? 'ru' : 'en',
  maxSentenceLength: 0,
  autoClearSentence: false,
  voiceEngine: 'auto'
};

export const SpeakEasyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [profiles, setProfiles] = useState<ChildProfile[]>([]);
  const [currentProfileId, setCurrentProfileId] = useState<string>('');
  const [boards, setBoards] = useState<Board[]>([]);
  const [currentBoardId, setCurrentBoardId] = useState<string>('');
  const [library, setLibrary] = useState<AACItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [sentence, setSentence] = useState<AACItem[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  
  const [isEditMode, setIsEditMode] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  
  const [currentFolderId, setCurrentFolderId] = useState<string>(ROOT_FOLDER);
  const [boardHistory, setBoardHistory] = useState<string[]>([]);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const playbackSessionRef = useRef(0);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchActive, setIsSearchActive] = useState(false);

  const t = (key: TranslationKey) => getTranslation(settings.language, key);

  useEffect(() => {
    const initData = async () => {
        setIsInitializing(true);
        
        // Load settings
        const saved = localStorage.getItem('aac_settings');
        if (saved) {
            const parsed = JSON.parse(saved);
            setSettings({ ...DEFAULT_SETTINGS, ...parsed });
        }

        // Load Profiles
        let allProfiles = await getAllProfiles();
        let activePid = '';

        if (allProfiles.length === 0) {
             // Migration Check: If items exist but no profile, migrate them.
             const rawItems = await getAllItems();
             if (rawItems.length > 0) {
                 const migrationId = crypto.randomUUID();
                 const migrationProfile: ChildProfile = { id: migrationId, name: 'My Child', age: 5, colorTheme: 'blue', createdAt: Date.now() };
                 await saveProfile(migrationProfile);
                 
                 const allCats = await getAllCategories();
                 const allBds = await getAllBoards();
                 await Promise.all([
                     saveItemsBatch(rawItems.map(i => ({...i, profileId: migrationId}))),
                     saveCategoriesBatch(allCats.map(c => ({...c, profileId: migrationId}))),
                     saveBoardsBatch(allBds.map(b => ({...b, profileId: migrationId})))
                 ]);
                 allProfiles = [migrationProfile];
                 activePid = migrationId;
             } 
        } else {
             const lastPid = localStorage.getItem('aac_last_profile');
             if (lastPid && allProfiles.find(p => p.id === lastPid)) activePid = lastPid;
             else activePid = allProfiles[0].id;
        }

        setProfiles(allProfiles);
        if (activePid) {
             setCurrentProfileId(activePid);
             await loadProfileData(activePid);
        }
        setIsInitializing(false);
    };

    initData();
  }, []);

  useEffect(() => {
    localStorage.setItem('aac_settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
      if (currentProfileId) localStorage.setItem('aac_last_profile', currentProfileId);
  }, [currentProfileId]);

  useEffect(() => {
      if (currentBoardId) localStorage.setItem('aac_last_board', currentBoardId);
  }, [currentBoardId]);

  const loadProfileData = async (profileId: string) => {
    if (!profileId) return;
    try {
        let pBoards = await getAllBoards(profileId);
        let firstBoardId = '';

        if (pBoards.length === 0) {
            firstBoardId = await initializeBoards(t('boards.default_name'), profileId, t);
            pBoards = await getAllBoards(profileId);
        } else {
            const lastBoardId = localStorage.getItem('aac_last_board');
            if (lastBoardId && pBoards.find(b => b.id === lastBoardId)) firstBoardId = lastBoardId;
            else firstBoardId = pBoards[0].id;
        }

        const [pItems, pCats] = await Promise.all([getAllItems(profileId), getAllCategories(profileId)]);
        
        setLibrary(pItems);
        setCategories(pCats);
        setBoards(pBoards);
        setCurrentBoardId(firstBoardId);
        setCurrentFolderId(ROOT_FOLDER);
        setBoardHistory([]);
        setSentence([]);
    } catch (e) { console.error(e); }
  };

  const reloadCurrentData = async () => {
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

  const breadcrumbs = useMemo(() => {
    if (currentFolderId === ROOT_FOLDER) return [];
    const path: {id: string, label: string}[] = [];
    let curr = categories.find(c => c.id === currentFolderId && c.boardId === currentBoardId);
    while (curr) {
        path.unshift({ id: curr.id, label: curr.labelKey ? t(curr.labelKey as TranslationKey) : curr.label });
        if (!curr.parentId || curr.parentId === ROOT_FOLDER) curr = undefined;
        else curr = categories.find(c => c.id === curr?.parentId && c.boardId === currentBoardId);
    }
    return path;
  }, [currentFolderId, categories, currentBoardId, settings.language]);

  const gridItems = useMemo(() => {
      const sortFn = (a: any, b: any) => {
        if (a.order !== undefined && b.order !== undefined) return a.order - b.order;
        if (a.order !== undefined) return -1;
        if (b.order !== undefined) return 1;
        return b.createdAt - a.createdAt;
      };

      const currentItems = library.filter(item => {
          if (item.boardId !== currentBoardId) return false;
          if (isSearchActive && searchQuery) return item.label.toLowerCase().includes(searchQuery.toLowerCase()) && (isEditMode || item.isVisible !== false);
          return item.category === currentFolderId && (isEditMode || item.isVisible !== false);
      }).map(i => ({ ...i, type: 'card' }));

      const currentFolders = categories.filter(cat => {
          if (cat.boardId !== currentBoardId) return false;
          if (isSearchActive && searchQuery) return false;
          if (currentFolderId === ROOT_FOLDER) return !cat.parentId || cat.parentId === ROOT_FOLDER;
          return cat.parentId === currentFolderId;
      }).map(c => ({ ...c, type: 'folder' }));

      return [...currentFolders, ...currentItems].sort(sortFn);
  }, [library, categories, currentBoardId, currentFolderId, isEditMode, isSearchActive, searchQuery]);

  const switchProfile = async (id: string) => {
      if (id === currentProfileId) return;
      setCurrentProfileId(id);
      await loadProfileData(id);
  };

  const switchBoard = (id: string) => {
      setCurrentBoardId(id);
      setCurrentFolderId(ROOT_FOLDER);
      setBoardHistory([]);
  };

  const navigateToFolder = (id: string) => setCurrentFolderId(id);
  
  const navigateBackFolder = () => {
      if (currentFolderId === ROOT_FOLDER) return;
      const cur = categories.find(c => c.id === currentFolderId);
      if (cur && cur.parentId) setCurrentFolderId(cur.parentId);
      else setCurrentFolderId(ROOT_FOLDER);
  };

  const navigateBackBoard = () => {
      if (boardHistory.length === 0) return;
      const prev = boardHistory[boardHistory.length - 1];
      setBoardHistory(prevH => prevH.slice(0, -1));
      setCurrentBoardId(prev);
      setCurrentFolderId(ROOT_FOLDER);
  };

  const createProfile = async (name: string, age: number, color: ColorTheme) => {
      const id = crypto.randomUUID();
      await saveProfile({ id, name, age, colorTheme: color, createdAt: Date.now() });
      setProfiles(await getAllProfiles());
      await switchProfile(id);
  };

  const updateProfile = async (p: ChildProfile) => {
      await saveProfile(p);
      setProfiles(await getAllProfiles());
  };

  const removeProfile = async (id: string) => {
      await deleteProfile(id);
      const remaining = await getAllProfiles();
      setProfiles(remaining);
      if (remaining.length === 0) {
          setCurrentProfileId('');
          setLibrary([]);
          setBoards([]);
      } else if (id === currentProfileId) {
          switchProfile(remaining[0].id);
      }
  };

  const createBoard = async (label: string) => {
      if (!currentProfileId) return;
      const id = await createNewBoard(label, currentProfileId, t);
      await reloadCurrentData();
      switchBoard(id);
  };

  const updateBoard = async (b: Board) => {
      await saveBoard(b);
      await reloadCurrentData();
  };

  const removeBoard = async (id: string) => {
      await deleteBoard(id);
      await reloadCurrentData();
      if (id === currentBoardId) {
          const boards = await getAllBoards(currentProfileId);
          if (boards.length > 0) switchBoard(boards[0].id);
      }
  };

  const getMaxOrder = () => gridItems.reduce((max, i) => Math.max(max, i.order || 0), -1);

  const saveCard = async (data: any, existingId?: string) => {
      if (!currentBoardId || !currentProfileId) return;
      const maxOrder = getMaxOrder();
      if (existingId) {
          const old = library.find(i => i.id === existingId);
          if (old) {
            const updated = { ...old, ...data, labelKey: undefined };
            await saveItem(updated);
            setSentence(prev => prev.map(p => p.id === existingId ? updated : p));
          }
      } else {
          await saveItem({
              ...data,
              id: crypto.randomUUID(),
              profileId: currentProfileId,
              boardId: currentBoardId,
              category: currentFolderId,
              createdAt: Date.now(),
              order: maxOrder + 1
          });
      }
      await reloadCurrentData();
  };

  const saveFolderObj = async (label: string, color: ColorTheme, icon: string, existing?: Category | null) => {
      if (!currentBoardId || !currentProfileId) return;
      const maxOrder = getMaxOrder();
      if (existing) {
          await saveCategory({ ...existing, label, colorTheme: color, icon, labelKey: undefined });
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
      await reloadCurrentData();
  };

  const saveLinkBoard = async (label: string, linkedBoardId: string, imageUrl: string) => {
      if (!currentBoardId || !currentProfileId) return;
      const maxOrder = getMaxOrder();
      await saveItem({
          id: crypto.randomUUID(),
          profileId: currentProfileId,
          boardId: currentBoardId,
          linkedBoardId,
          label,
          imageUrl,
          category: currentFolderId,
          createdAt: Date.now(),
          isVisible: true,
          colorTheme: 'purple',
          order: maxOrder + 1
      });
      await reloadCurrentData();
  };

  const deleteCard = async (id: string) => {
      await deleteItem(id);
      setSentence(prev => prev.filter(i => i.id !== id));
      await reloadCurrentData();
  };

  const deleteFolderObj = async (id: string) => {
      const getAllSubIds = (pid: string): string[] => {
          const kids = categories.filter(c => c.boardId === currentBoardId && c.parentId === pid);
          let ids = kids.map(k => k.id);
          kids.forEach(k => ids = [...ids, ...getAllSubIds(k.id)]);
          return ids;
      };
      const idsToRemove = [id, ...getAllSubIds(id)];
      const itemsRescue = library.filter(i => i.boardId === currentBoardId && idsToRemove.includes(i.category));
      
      if (itemsRescue.length > 0) {
          let startOrder = 1000;
          await saveItemsBatch(itemsRescue.map((i, idx) => ({ ...i, category: ROOT_FOLDER, order: startOrder + idx })));
      }

      for (const catId of idsToRemove) await deleteCategory(catId);
      await reloadCurrentData();
      if (idsToRemove.includes(currentFolderId)) setCurrentFolderId(ROOT_FOLDER);
  };

  const reorderGrid = async (itemId: string, direction: -1 | 1) => {
      const list = [...gridItems];
      const idx = list.findIndex(i => i.id === itemId);
      if (idx === -1) return;
      const targetIdx = idx + direction;
      if (targetIdx < 0 || targetIdx >= list.length) return;

      const itemA = list[idx];
      const itemB = list[targetIdx];
      list[idx] = itemB;
      list[targetIdx] = itemA;

      const itemsUpd: AACItem[] = [];
      const catsUpd: Category[] = [];

      list.forEach((itm, i) => {
          if (itm.order !== i) {
              if (itm.type === 'card') {
                 const {type, ...rest} = itm;
                 itemsUpd.push({...rest, order: i} as unknown as AACItem);
              } else {
                 const {type, ...rest} = itm;
                 catsUpd.push({...rest, order: i} as unknown as Category);
              }
          }
      });
      
      if (itemsUpd.length) await saveItemsBatch(itemsUpd);
      if (catsUpd.length) await saveCategoriesBatch(catsUpd);
      await reloadCurrentData();
  };

  const moveItemToFolder = async (item: any, type: 'card'|'folder', targetId: string) => {
     const itemsInTgt = library.filter(i => i.boardId === currentBoardId && i.category === targetId);
     const catsInTgt = categories.filter(c => c.boardId === currentBoardId && (c.parentId || ROOT_FOLDER) === targetId);
     const maxI = Math.max(...itemsInTgt.map(i => i.order||0), -1);
     const maxC = Math.max(...catsInTgt.map(c => c.order||0), -1);
     const nextOrder = Math.max(maxI, maxC) + 1;

     if (type === 'card') await saveItem({ ...item, category: targetId, order: nextOrder });
     else await saveCategory({ ...item, parentId: targetId, order: nextOrder });
     await reloadCurrentData();
  };

  const playItemSound = async (item: AACItem) => {
    if (!item) return;
    try {
      if (item.audioUrl) {
        await audioPlayer.play(item.audioUrl);
      } else {
        const txt = (item.textToSpeak || (item.labelKey ? t(item.labelKey as TranslationKey) : item.label) || '').trim();
        if (txt) await voiceService.speak({ text: txt, language: settings.language, rate: settings.voiceRate, pitch: settings.voicePitch, engine: settings.voiceEngine });
      }
    } catch (e) {
      if (item.label) await voiceService.speak({ text: item.label, language: settings.language, rate: settings.voiceRate, pitch: settings.voicePitch, engine: settings.voiceEngine });
    }
  };

  const addToSentence = (item: AACItem) => {
      if (isPlaying) return;
      if (item.linkedBoardId) {
          voiceService.speak({ text: item.labelKey ? t(item.labelKey as TranslationKey) : item.label, language: settings.language, engine: settings.voiceEngine }).catch(()=>{});
          setBoardHistory(prev => [...prev, currentBoardId]);
          setCurrentBoardId(item.linkedBoardId);
          setCurrentFolderId(ROOT_FOLDER);
          return;
      }
      if (settings.maxSentenceLength > 0 && sentence.length >= settings.maxSentenceLength) return;
      setSentence(prev => [...prev, item]);
      playItemSound(item);
  };

  const removeFromSentence = (idx: number) => {
      if (isPlaying) stopPlayback();
      setSentence(prev => prev.filter((_, i) => i !== idx));
  };
  const removeLastFromSentence = () => {
      if (isPlaying) stopPlayback();
      setSentence(prev => prev.slice(0, -1));
  };
  const clearSentence = () => {
      if (isPlaying) stopPlayback();
      setSentence([]);
  };

  const stopPlayback = async () => {
      playbackSessionRef.current++;
      await voiceService.stop();
      setIsPlaying(false);
      setActiveIndex(null);
  };

  const playSentence = async () => {
      const valid = sentence.filter(i => !!i);
      if (valid.length === 0 || isPlaying) return;
      const session = ++playbackSessionRef.current;
      setIsPlaying(true);
      const histIds = [valid.map(i => i.id), ...((JSON.parse(localStorage.getItem('aac_history_ids')||'[]') as string[][]))].slice(0, 15);
      localStorage.setItem('aac_history_ids', JSON.stringify(histIds));
      try {
          for (let i = 0; i < valid.length; i++) {
              if (playbackSessionRef.current !== session) break;
              setActiveIndex(i);
              await Promise.race([playItemSound(valid[i]), new Promise(r => setTimeout(r, 8000))]);
              if (playbackSessionRef.current !== session) break;
              await new Promise(r => setTimeout(r, 100));
          }
      } catch (e) { console.error(e); } 
      finally {
          if (playbackSessionRef.current === session) {
              await new Promise(r => setTimeout(r, 500));
              setActiveIndex(null);
              setIsPlaying(false);
              if (settings.autoClearSentence) setSentence([]);
          }
      }
  };

  const setSentenceFromHistory = (items: AACItem[]) => {
      if (isPlaying) stopPlayback();
      setSentence(items);
  };

  const value = {
      profiles, currentProfileId, boards, currentBoardId, library, categories, sentence, settings, isEditMode,
      isInitializing, isPlaying, activeIndex, currentFolderId, searchQuery, isSearchActive, boardHistory,
      gridItems, breadcrumbs, t, setSettings, setEditMode: setIsEditMode, setSearchQuery, setIsSearchActive,
      switchProfile, switchBoard, navigateToFolder, navigateBackFolder, navigateBackBoard,
      createProfile, updateProfile, removeProfile, createBoard, updateBoard, removeBoard,
      saveCard, saveFolderObj, saveLinkBoard, deleteCard, deleteFolderObj, reorderGrid, moveItemToFolder,
      addToSentence, removeFromSentence, removeLastFromSentence, clearSentence, playSentence, setSentenceFromHistory
  };

  return <SpeakEasyContext.Provider value={value}>{children}</SpeakEasyContext.Provider>;
};
