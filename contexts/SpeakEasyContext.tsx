
import React, { createContext, useContext, useState, useEffect, useRef, useMemo } from 'react';
import { AACItem, Category, Board, ChildProfile, AppSettings, ColorTheme, GridSize } from '../types.ts';
import { TranslationKey, getTranslation } from '../services/translations.ts';
import { 
  getAllItems, getAllCategories, getAllBoards, getAllProfiles,
  saveItem, saveCategory, saveBoard, saveProfile,
  deleteItem, deleteCategory, deleteBoard, deleteProfile,
  saveItemsBatch, saveCategoriesBatch, saveBoardsBatch,
  initializeBoards, createNewBoard, ROOT_FOLDER,
  DEFAULT_GRID_ROWS, DEFAULT_GRID_COLS, GRID_PRESETS
} from '../services/storage.ts';
import { voiceService } from '../services/voice.ts';
import { audioPlayer } from '../services/audioPlayer.ts';
import { pushHistory, clearHistory } from '../utils/history.ts';
import { detectDeviceLanguage } from '../utils/languages.ts';

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
  gridCells: (any | null)[];
  grid: { rows: number; cols: number };
  coreItems: AACItem[];
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
  setBoardGridSize: (size: GridSize) => Promise<void>;
  updateBoard: (b: Board) => Promise<void>;
  removeBoard: (id: string) => Promise<void>;
  
  saveCard: (data: Omit<AACItem, 'id' | 'createdAt' | 'boardId' | 'profileId'>, existingId?: string) => Promise<void>;
  saveFolderObj: (label: string, color: ColorTheme, icon: string, existingFolder?: Category | null) => Promise<void>;
  saveLinkBoard: (label: string, linkedBoardId: string, imageUrl: string) => Promise<void>;
  
  deleteCard: (id: string) => Promise<void>;
  deleteFolderObj: (id: string) => Promise<void>;
  
  reorderGrid: (itemId: string, direction: -1 | 1) => Promise<void>;
  moveItemToFolder: (item: AACItem | Category, type: 'card' | 'folder', targetFolderId: string) => Promise<void>;

  /**
   * The single entry point a cell should call. Applies auditory preview if it
   * is on, and otherwise commits straight away.
   */
  selectItem: (item: AACItem) => void;
  /** Card currently armed by auditory preview, for a visual cue. */
  previewItemId: string | null;
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
  language: detectDeviceLanguage(),
  maxSentenceLength: 0,
  autoClearSentence: false
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
  
  const [previewItemId, setPreviewItemId] = useState<string | null>(null);
  const previewTimerRef = useRef<number | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchActive, setIsSearchActive] = useState(false);

  const t = (key: TranslationKey) => getTranslation(settings.language, key);

  useEffect(() => {
    const initData = async () => {
        setIsInitializing(true);
        
        // 1. Load Profiles
        let allProfiles = await getAllProfiles();

        // Migration: If items exist but no profiles, create a default migration profile
        if (allProfiles.length === 0) {
             const rawItems = await getAllItems();
             if (rawItems.length > 0) {
                 const migrationId = crypto.randomUUID();
                 const migrationProfile: ChildProfile = { 
                     id: migrationId, 
                     name: 'My Child', 
                     age: 5, 
                     colorTheme: 'blue', 
                     createdAt: Date.now(),
                     settings: DEFAULT_SETTINGS 
                 };
                 await saveProfile(migrationProfile);
                 
                 const allCats = await getAllCategories();
                 const allBds = await getAllBoards();
                 await Promise.all([
                     saveItemsBatch(rawItems.map(i => ({...i, profileId: migrationId}))),
                     saveCategoriesBatch(allCats.map(c => ({...c, profileId: migrationId}))),
                     saveBoardsBatch(allBds.map(b => ({...b, profileId: migrationId})))
                 ]);
                 allProfiles = [migrationProfile];
             } 
        }

        // 2. Determine Active Profile ID
        let activePid = '';
        if (allProfiles.length > 0) {
             const lastPid = localStorage.getItem('aac_last_profile');
             if (lastPid && allProfiles.find(p => p.id === lastPid)) activePid = lastPid;
             else activePid = allProfiles[0].id;
        }

        setProfiles(allProfiles);
        
        // 3. Load Active Profile Data & Settings
        if (activePid) {
             const currentProfile = allProfiles.find(p => p.id === activePid);
             
             if (currentProfile) {
                 // SETTINGS LOGIC
                 if (currentProfile.settings) {
                     setSettings(currentProfile.settings);
                 } else {
                     // Migration: Profile exists but has no settings (legacy).
                     // Try to grab from localStorage (legacy global settings) or use defaults.
                     const savedInfo = localStorage.getItem('aac_settings');
                     const migrationSettings = savedInfo ? { ...DEFAULT_SETTINGS, ...JSON.parse(savedInfo) } : DEFAULT_SETTINGS;
                     
                     setSettings(migrationSettings);
                     
                     // Save back to profile immediately to complete migration
                     const updatedProfile = { ...currentProfile, settings: migrationSettings };
                     await saveProfile(updatedProfile);
                     setProfiles(prev => prev.map(p => p.id === activePid ? updatedProfile : p));
                 }
                 
                 setCurrentProfileId(activePid);
                 await loadProfileData(activePid);
             }
        }
        setIsInitializing(false);
    };

    initData();
  }, []);

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

  const currentBoard = useMemo(
      () => boards.find(b => b.id === currentBoardId),
      [boards, currentBoardId]
  );

  const grid = useMemo(
      () => ({
          rows: currentBoard?.gridRows || DEFAULT_GRID_ROWS,
          cols: currentBoard?.gridCols || DEFAULT_GRID_COLS,
      }),
      [currentBoard]
  );

  /** Core items are board-scoped and stay on screen in every folder. */
  const coreItems = useMemo(() => {
      return library
          .filter(i => i.boardId === currentBoardId && i.isCore && (isEditMode || i.isVisible !== false))
          .sort((a, b) => (a.slot ?? 0) - (b.slot ?? 0));
  }, [library, currentBoardId, isEditMode]);

  /**
   * Fixed-length array of grid cells, one per slot. A cell is null when nothing
   * occupies that slot — including when the occupant is hidden in child mode.
   * That is the motor-planning guarantee: a hidden or deleted item leaves a gap
   * rather than pulling everything after it forward.
   *
   * Search is the one case where absolute slots make no sense, so it returns a
   * packed list instead and the renderer lays it out as a plain flow.
   */
  const gridCells = useMemo(() => {
      const query = isSearchActive && searchQuery ? searchQuery.toLowerCase() : '';
      const labelOf = (r: AACItem | Category) =>
          (r.labelKey ? t(r.labelKey as TranslationKey) : r.label).toLowerCase();

      if (query) {
          const hits: any[] = [
              ...library
                  .filter(i => i.boardId === currentBoardId && !i.isCore
                      && labelOf(i).includes(query)
                      && (isEditMode || i.isVisible !== false))
                  .map(i => ({ ...i, type: 'card' })),
              ...categories
                  .filter(c => c.boardId === currentBoardId && labelOf(c).includes(query))
                  .map(c => ({ ...c, type: 'folder' })),
          ];
          return hits;
      }

      const occupants: any[] = [
          ...library
              .filter(i => i.boardId === currentBoardId
                  && !i.isCore
                  && i.category === currentFolderId
                  && (isEditMode || i.isVisible !== false))
              .map(i => ({ ...i, type: 'card' })),
          ...categories
              .filter(c => c.boardId === currentBoardId
                  && (currentFolderId === ROOT_FOLDER
                      ? (!c.parentId || c.parentId === ROOT_FOLDER)
                      : c.parentId === currentFolderId))
              .map(c => ({ ...c, type: 'folder' })),
      ];

      // Grow the grid if a board somehow holds more occupants than its declared
      // size, so nothing becomes unreachable.
      const declared = grid.rows * grid.cols;
      const maxSlot = occupants.reduce((m, o) => Math.max(m, o.slot ?? 0), -1);
      const size = Math.max(declared, maxSlot + 1);

      const cells: (any | null)[] = new Array(size).fill(null);
      const overflow: any[] = [];
      occupants.forEach(o => {
          const s = o.slot;
          if (typeof s === 'number' && s >= 0 && s < size && cells[s] === null) cells[s] = o;
          else overflow.push(o);
      });
      // Anything without a usable slot (or colliding) takes the next free cell.
      overflow.forEach(o => {
          const free = cells.indexOf(null);
          if (free !== -1) cells[free] = o;
          else cells.push(o);
      });

      return cells;
  }, [library, categories, currentBoardId, currentFolderId, isEditMode, isSearchActive, searchQuery, grid, settings.language]);

  /** Occupied cells only — for callers that need the items rather than the layout. */
  const gridItems = useMemo(() => gridCells.filter(Boolean), [gridCells]);

  // Wrapper to update settings both in state and in the active profile
  const handleSetSettings = async (newSettings: AppSettings) => {
      setSettings(newSettings);
      
      if (currentProfileId) {
          const profile = profiles.find(p => p.id === currentProfileId);
          if (profile) {
              const updatedProfile = { ...profile, settings: newSettings };
              try {
                  await saveProfile(updatedProfile);
                  setProfiles(prev => prev.map(p => p.id === currentProfileId ? updatedProfile : p));
              } catch (e) {
                  console.error("Failed to save settings to profile", e);
              }
          }
      }
  };

  const switchProfile = async (id: string) => {
      if (id === currentProfileId) return;
      
      const targetProfile = profiles.find(p => p.id === id);
      if (targetProfile) {
          if (targetProfile.settings) {
              setSettings(targetProfile.settings);
          } else {
              setSettings(DEFAULT_SETTINGS);
          }
      }

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
      
      // Initialize with settings, inheriting current language selection
      const startingSettings = {
          ...DEFAULT_SETTINGS,
          language: settings.language
      };

      const newProfile: ChildProfile = { 
          id, 
          name, 
          age, 
          colorTheme: color, 
          createdAt: Date.now(),
          settings: startingSettings
      };
      
      await saveProfile(newProfile);
      
      // Reload profiles list and switch to the new one
      const updatedProfiles = await getAllProfiles();
      setProfiles(updatedProfiles);
      
      // Manually trigger switch to ensure settings load correctly
      setCurrentProfileId(id);
      setSettings(startingSettings);
      await loadProfileData(id);
  };

  const updateProfile = async (p: ChildProfile) => {
      // Ensure we preserve existing settings when updating basic info
      const existing = profiles.find(prof => prof.id === p.id);
      const updated = { ...p, settings: existing?.settings || p.settings || DEFAULT_SETTINGS };
      
      await saveProfile(updated);
      setProfiles(await getAllProfiles());
  };

  const removeProfile = async (id: string) => {
      await deleteProfile(id);
      clearHistory(id);
      const remaining = await getAllProfiles();
      setProfiles(remaining);
      if (remaining.length === 0) {
          setCurrentProfileId('');
          setLibrary([]);
          setBoards([]);
          // Optionally reset settings to default
          setSettings(DEFAULT_SETTINGS);
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

  /**
   * Grid density is a property of the board, not the profile — different boards
   * legitimately want different densities. The Settings control writes here and
   * also remembers the choice on the profile, so the control shows the right
   * selection when the parent comes back.
   */
  const setBoardGridSize = async (size: GridSize) => {
      const preset = GRID_PRESETS[size];
      const board = boards.find(b => b.id === currentBoardId);
      if (board) {
          await saveBoard({ ...board, gridRows: preset.rows, gridCols: preset.cols });
          await reloadCurrentData();
      }
      await handleSetSettings({ ...settings, gridColumns: size });
  };

  const removeBoard = async (id: string) => {
      await deleteBoard(id);
      await reloadCurrentData();
      if (id === currentBoardId) {
          const boards = await getAllBoards(currentProfileId);
          if (boards.length > 0) switchBoard(boards[0].id);
      }
  };

  /** First empty cell in the current folder, or the end of the grid. */
  const nextFreeSlot = () => {
      const free = gridCells.indexOf(null);
      return free !== -1 ? free : gridCells.length;
  };

  const saveCard = async (data: any, existingId?: string) => {
      if (!currentBoardId || !currentProfileId) return;
      const slot = nextFreeSlot();
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
              slot
          });
      }
      await reloadCurrentData();
  };

  const saveFolderObj = async (label: string, color: ColorTheme, icon: string, existing?: Category | null) => {
      if (!currentBoardId || !currentProfileId) return;
      const slot = nextFreeSlot();
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
              slot
          });
      }
      await reloadCurrentData();
  };

  const saveLinkBoard = async (label: string, linkedBoardId: string, imageUrl: string) => {
      if (!currentBoardId || !currentProfileId) return;
      const slot = nextFreeSlot();
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
          slot
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
          // Rescued cards go to the first free cells at the root rather than a
          // fixed high offset, so they land somewhere the child can see.
          const taken = new Set(
              library
                  .filter(i => i.boardId === currentBoardId && i.category === ROOT_FOLDER && !i.isCore)
                  .map(i => i.slot)
                  .concat(categories
                      .filter(c => c.boardId === currentBoardId && (!c.parentId || c.parentId === ROOT_FOLDER))
                      .map(c => c.slot))
                  .filter((s): s is number => typeof s === 'number')
          );
          let cursor = 0;
          const rescued = itemsRescue.map(i => {
              while (taken.has(cursor)) cursor++;
              taken.add(cursor);
              return { ...i, category: ROOT_FOLDER, slot: cursor };
          });
          await saveItemsBatch(rescued);
      }

      for (const catId of idsToRemove) await deleteCategory(catId);
      await reloadCurrentData();
      if (idsToRemove.includes(currentFolderId)) setCurrentFolderId(ROOT_FOLDER);
  };

  /**
   * Swaps an item with whatever occupies the neighbouring cell — including an
   * empty one, so a parent can nudge a card into a gap. Only the two cells
   * involved are written; the rest of the grid is untouched, which is the point
   * of absolute slots. Previously every item in the folder was renumbered.
   */
  const reorderGrid = async (itemId: string, direction: -1 | 1) => {
      const from = gridCells.findIndex(c => c && c.id === itemId);
      if (from === -1) return;
      const to = from + direction;
      if (to < 0 || to >= gridCells.length) return;

      const moving = gridCells[from];
      const displaced = gridCells[to];

      const write = async (rec: any, slot: number) => {
          const { type, ...rest } = rec;
          if (type === 'card') await saveItem({ ...rest, slot } as AACItem);
          else await saveCategory({ ...rest, slot } as Category);
      };

      await write(moving, to);
      if (displaced) await write(displaced, from);
      await reloadCurrentData();
  };

  const moveItemToFolder = async (item: any, type: 'card'|'folder', targetId: string) => {
     // Land in the target folder's first free cell.
     const taken = new Set(
         library
             .filter(i => i.boardId === currentBoardId && i.category === targetId && !i.isCore && i.id !== item.id)
             .map(i => i.slot)
             .concat(categories
                 .filter(c => c.boardId === currentBoardId && (c.parentId || ROOT_FOLDER) === targetId && c.id !== item.id)
                 .map(c => c.slot))
             .filter((s): s is number => typeof s === 'number')
     );
     let slot = 0;
     while (taken.has(slot)) slot++;

     if (type === 'card') await saveItem({ ...item, category: targetId, slot });
     else await saveCategory({ ...item, parentId: targetId, slot });
     await reloadCurrentData();
  };

  const playItemSound = async (item: AACItem) => {
    if (!item) return;
    try {
      if (item.audioUrl) {
        await audioPlayer.play(item.audioUrl);
      } else {
        const txt = (item.textToSpeak || (item.labelKey ? t(item.labelKey as TranslationKey) : item.label) || '').trim();
        if (txt) await voiceService.speak({ text: txt, language: settings.language, rate: settings.voiceRate, pitch: settings.voicePitch });
      }
    } catch (e) {
      if (item.label) await voiceService.speak({ text: item.label, language: settings.language, rate: settings.voiceRate, pitch: settings.voicePitch });
    }
  };

  const addToSentence = (item: AACItem) => {
      if (isPlaying) return;
      if (item.linkedBoardId) {
          voiceService.speak({ text: item.labelKey ? t(item.labelKey as TranslationKey) : item.label, language: settings.language }).catch(()=>{});
          setBoardHistory(prev => [...prev, currentBoardId]);
          setCurrentBoardId(item.linkedBoardId);
          setCurrentFolderId(ROOT_FOLDER);
          return;
      }
      if (settings.maxSentenceLength > 0 && sentence.length >= settings.maxSentenceLength) return;
      setSentence(prev => [...prev, item]);
      playItemSound(item);

      // Optionally bounce back to the top of the board so the child always
      // re-orients from the same place. Core items are already board-scoped, so
      // choosing one should not navigate anywhere.
      if (settings.returnHomeAfterSelect && !item.isCore && currentFolderId !== ROOT_FOLDER) {
          setCurrentFolderId(ROOT_FOLDER);
      }
  };

  /**
   * Auditory preview: the first activation speaks the word without committing
   * it, a second activation on the same card adds it. A card stays armed for a
   * few seconds so a slow user is not forced to rush the second press.
   */
  const selectItem = (item: AACItem) => {
      if (isPlaying) return;
      // Board links navigate; previewing one would be meaningless.
      if (!settings.auditoryPreview || item.linkedBoardId) {
          addToSentence(item);
          return;
      }
      if (previewItemId === item.id) {
          if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
          setPreviewItemId(null);
          addToSentence(item);
          return;
      }
      setPreviewItemId(item.id);
      const txt = (item.textToSpeak || (item.labelKey ? t(item.labelKey as TranslationKey) : item.label) || '').trim();
      if (txt) voiceService.speak({ text: txt, language: settings.language, rate: settings.voiceRate, pitch: settings.voicePitch }).catch(() => {});
      if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
      previewTimerRef.current = window.setTimeout(() => setPreviewItemId(null), 4000);
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
      pushHistory(currentProfileId, valid.map(i => i.id));
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
      gridItems, gridCells, grid, coreItems, breadcrumbs, t, 
      setSettings: handleSetSettings, 
      setEditMode: setIsEditMode, setSearchQuery, setIsSearchActive,
      switchProfile, switchBoard, navigateToFolder, navigateBackFolder, navigateBackBoard,
      createProfile, updateProfile, removeProfile, createBoard, updateBoard, removeBoard, setBoardGridSize,
      saveCard, saveFolderObj, saveLinkBoard, deleteCard, deleteFolderObj, reorderGrid, moveItemToFolder,
      selectItem, previewItemId, addToSentence, removeFromSentence, removeLastFromSentence, clearSentence, playSentence, setSentenceFromHistory
  };

  return <SpeakEasyContext.Provider value={value}>{children}</SpeakEasyContext.Provider>;
};
