
import React, { createContext, useContext, useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { AACItem, Category, Board, ChildProfile, AppSettings, ColorTheme, GridSize, SearchHit } from '../types.ts';
import { TranslationKey, getTranslation } from '../services/translations.ts';
import { 
  getAllItems, getAllCategories, getAllBoards, getAllProfiles,
  saveItem, saveCategory, saveBoard, saveProfile,
  deleteItem, deleteCategory, deleteBoard, deleteProfile,
  saveItemsBatch, saveCategoriesBatch, saveBoardsBatch,
  initializeBoards, createNewBoard, ROOT_FOLDER,
  DEFAULT_GRID_ROWS, DEFAULT_GRID_COLS, GRID_PRESETS,
    STARTER_FOLDER_LABEL_KEYS,
} from '../services/storage.ts';
import { voiceService } from '../services/voice.ts';
import { audioPlayer } from '../services/audioPlayer.ts';
import { pushHistory, clearHistory, isLegacyWord, HistoryEntry } from '../utils/history.ts';
import { CORE_RAIL, FOLDER_VOCAB, VocabEntry } from '../utils/starterVocabulary.ts';

/** Debounce for persisting settings. Range controls fire on every pixel of a drag. */
export const SETTINGS_FLUSH_DELAY_MS = 200;
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
  /** Non-null when start-up failed; the app shows a recoverable error instead of a spinner. */
  initError: string | null;
  isPlaying: boolean;
  activeIndex: number | null;
  currentFolderId: string;
  searchQuery: string;
  isSearchActive: boolean;
  /** Matches for the current query, each with its location. Empty unless searching. */
  searchResults: SearchHit[];
  boardHistory: string[];

  gridItems: any[];
  gridCells: (any | null)[];
  grid: { rows: number; cols: number };
  coreItems: AACItem[];
  breadcrumbs: {id: string, label: string}[];

  t: (key: TranslationKey) => string;
  setSettings: (next: AppSettings | ((prev: AppSettings) => AppSettings)) => void;
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
  /** Move a card up or down the core rail. */
  reorderCore: (itemId: string, direction: -1 | 1) => Promise<void>;
  /** Add the starter vocabulary to an existing board without moving anything on it. */
  addStarterVocabulary: (opts?: { dryRun?: boolean }) => Promise<{ added: number; skipped: number; missingFolders: string[] }>;
  moveItemToFolder: (item: AACItem | Category, type: 'card' | 'folder', targetFolderId: string) => Promise<void>;

  /**
   * The single entry point a cell should call. Applies auditory preview if it
   * is on, and otherwise commits straight away.
   */
  selectItem: (item: AACItem) => void;
  /** Adds a spelled word to the sentence as a text-only item. */
  addTypedWord: (text: string) => void;
  /** Every label and word form in this profile — the keyboard's prediction source. */
  vocabulary: string[];
  /** Card currently armed by auditory preview, for a visual cue. */
  previewItemId: string | null;
  addToSentence: (item: AACItem) => void;
  removeFromSentence: (index: number) => void;
  removeLastFromSentence: () => void;
  clearSentence: () => void;
  playSentence: () => Promise<void>;
  setSentenceFromHistory: (entry: HistoryEntry) => void;
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
  /** Set when initialisation threw, so the UI can show a reason and a retry. */
  const [initError, setInitError] = useState<string | null>(null);
  
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
        setInitError(null);
        
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
                     adoptSettings(currentProfile.settings);
                 } else {
                     // Migration: Profile exists but has no settings (legacy).
                     // Try to grab from localStorage (legacy global settings) or use defaults.
                     const savedInfo = localStorage.getItem('aac_settings');
                     const migrationSettings = savedInfo ? { ...DEFAULT_SETTINGS, ...JSON.parse(savedInfo) } : DEFAULT_SETTINGS;
                     
                     adoptSettings(migrationSettings);
                     
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

    /*
     * A throw anywhere in initData used to leave isInitializing true forever,
     * and the app renders nothing but a spinner in that state. For a
     * communication device that is the worst failure mode available: the child
     * has no voice and the screen gives nobody a reason or a way out. Always
     * clear the flag, and record the error so the UI can offer a retry.
     */
    initData().catch(err => {
        console.error('Initialisation failed', err);
        setInitError(err instanceof Error ? err.message : String(err));
        setIsInitializing(false);
    });
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
    } catch (e) {
        /*
         * This used to be `console.error(e)` and nothing else, which turned a
         * total failure into a silently empty board — the app opened, the
         * chrome rendered, and the child had no words and no explanation. For a
         * communication device that is the worst possible way to fail.
         *
         * An Error logged bare stringifies to "[object Object]" in a WebView, so
         * the message and stack are spelled out; that is what made this
         * diagnosable at all.
         */
        const detail = e instanceof Error ? `${e.name}: ${e.message}\n${e.stack}` : String(e);
        console.error('Failed to load profile data —', detail);
        setInitError(detail);
    }
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
   * Search does not touch this. It used to replace the whole array with a
   * packed list of matches, which meant the board a child had memorised was
   * dismantled the moment a parent typed. Matches are now a separate selector
   * (`searchResults`) shown in an overlay, and the grid underneath is untouched.
   */
  const gridCells = useMemo(() => {
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
  }, [library, categories, currentBoardId, currentFolderId, isEditMode, grid, settings.language]);

  /** Occupied cells only — for callers that need the items rather than the layout. */
  const gridItems = useMemo(() => gridCells.filter(Boolean), [gridCells]);

  /**
   * Matches for the current search query, each carrying where it lives.
   *
   * Search in an AAC app is a parent's tool for answering "where did I put
   * that card", so a bare list of hits is only half an answer — the location is
   * the part they actually need. `path` is the folder chain from the root, and
   * `openFolderId` is the folder to jump to: for a card that is its containing
   * folder, for a folder the folder itself.
   *
   * Deliberately separate from `gridCells`. Search used to overwrite the grid,
   * which dismantled the board layout a child had learned.
   */
  const searchResults = useMemo((): SearchHit[] => {
      const query = isSearchActive ? searchQuery.trim().toLowerCase() : '';
      if (!query) return [];

      const labelOf = (r: AACItem | Category) =>
          r.labelKey ? t(r.labelKey as TranslationKey) : r.label;

      /** Folder labels from the root down to `folderId`, exclusive of root. */
      const pathTo = (folderId?: string): string[] => {
          const out: string[] = [];
          let cur = folderId && folderId !== ROOT_FOLDER
              ? categories.find(c => c.id === folderId && c.boardId === currentBoardId)
              : undefined;
          // Guard against a cycle in parentId rather than hanging the render.
          const seen = new Set<string>();
          while (cur && !seen.has(cur.id)) {
              seen.add(cur.id);
              out.unshift(labelOf(cur));
              cur = cur.parentId && cur.parentId !== ROOT_FOLDER
                  ? categories.find(c => c.id === cur!.parentId && c.boardId === currentBoardId)
                  : undefined;
          }
          return out;
      };

      const cards: SearchHit[] = library
          .filter(i => i.boardId === currentBoardId
              && labelOf(i).toLowerCase().includes(query)
              && (isEditMode || i.isVisible !== false))
          .map(i => ({
              id: i.id,
              type: 'card' as const,
              label: labelOf(i),
              imageUrl: i.imageUrl,
              // A core card sits on the rail in every folder, so it has no
              // single home to jump to.
              isCore: i.isCore === true,
              path: i.isCore ? [] : pathTo(i.category),
              openFolderId: i.isCore ? ROOT_FOLDER : (i.category || ROOT_FOLDER),
          }));

      const folders: SearchHit[] = categories
          .filter(c => c.boardId === currentBoardId && labelOf(c).toLowerCase().includes(query))
          .map(c => ({
              id: c.id,
              type: 'folder' as const,
              label: labelOf(c),
              isCore: false,
              path: pathTo(c.parentId),
              openFolderId: c.id,
          }));

      // Folders first: finding the container is usually what the parent wants,
      // and it is the shorter list.
      return [...folders, ...cards];
  }, [isSearchActive, searchQuery, library, categories, currentBoardId, isEditMode, settings.language]);

  // Wrapper to update settings both in state and in the active profile
  /*
   * Settings updates, made safe against three separate races.
   *
   * 1. Stale snapshots. Callers used to pass a whole AppSettings built from the
   *    `settings` they last rendered with. Two controls changed inside one
   *    render cycle would each spread a copy of the same old object, and the
   *    second silently discarded the first. Updates are now applied as
   *    functions of the current state.
   *
   * 2. Out-of-order writes. Every change awaited its own saveProfile, and
   *    IndexedDB gives no ordering guarantee across separate transactions — so
   *    dragging a slider could finish with an earlier value on top. Writes are
   *    now chained through one promise per provider, so they land in order.
   *
   * 3. Stale closures. The write read `profiles` and `currentProfileId` from
   *    the closure it was created in. It now reads them from refs at flush
   *    time.
   *
   * Range controls fire on every pixel of a drag, so persistence is debounced;
   * the flush always writes whatever the latest state is rather than the value
   * that scheduled it. React state is still updated synchronously, so the UI
   * never lags the control.
   */
  const settingsRef = useRef(settings);
  const profilesRef = useRef(profiles);
  const currentProfileIdRef = useRef(currentProfileId);
  const settingsWriteChain = useRef<Promise<void>>(Promise.resolve());
  const settingsFlushTimer = useRef<number | null>(null);

  useEffect(() => { profilesRef.current = profiles; }, [profiles]);
  useEffect(() => { currentProfileIdRef.current = currentProfileId; }, [currentProfileId]);

  /**
   * Drop a pending settings write without performing it. Needed before deleting
   * a profile: the flush calls saveProfile, which is a put, so a write still in
   * flight would recreate the profile record that was just removed.
   */
  const cancelPendingSettingsWrite = useCallback(() => {
      if (settingsFlushTimer.current !== null) {
          window.clearTimeout(settingsFlushTimer.current);
          settingsFlushTimer.current = null;
      }
  }, []);

  const flushSettings = useCallback(() => {
      // Nothing pending means nothing to write. Without this guard every caller
      // of flushSettings — including the one at the top of switchProfile —
      // performs a spurious saveProfile, which is a put, and so recreates a
      // profile that was just deleted.
      if (settingsFlushTimer.current === null) return;
      window.clearTimeout(settingsFlushTimer.current);
      settingsFlushTimer.current = null;

      /*
       * Both of these are captured synchronously, on purpose. The write itself
       * is queued onto a promise chain, and by the time it runs a profile
       * switch may already have pointed the refs at a different child — which
       * is precisely how one child's settings ended up in another's profile.
       * Read them now; use the captured values later.
       */
      const pid = currentProfileIdRef.current;
      const latest = settingsRef.current;
      if (!pid) return;

      settingsWriteChain.current = settingsWriteChain.current
          .then(async () => {
              const profile = profilesRef.current.find(p => p.id === pid);
              // Gone since the flush was scheduled: saving would resurrect it.
              if (!profile) return;
              const updatedProfile = { ...profile, settings: latest };
              await saveProfile(updatedProfile);
              setProfiles(prev => prev.map(p => (p.id === pid ? updatedProfile : p)));
          })
          .catch(e => console.error('Failed to save settings to profile', e));
  }, []);

  /**
   * Adopt settings that came *from* a profile — start-up, profile switch,
   * profile creation. State and ref move together, and no write is scheduled
   * because nothing changed that needs saving.
   *
   * Distinct from handleSetSettings, which is the user-changed-a-setting path.
   * Mixing the two is what caused the bug this exists to prevent: switchProfile
   * called the raw state setter, so settingsRef kept the previous child's
   * values, and a debounced flush still in flight then wrote those values into
   * the profile just switched to. On a shared tablet that silently moves one
   * child's voice, speed and access settings onto their sibling.
   */
  const adoptSettings = (next: AppSettings) => {
      settingsRef.current = next;
      setSettings(next);
  };

  const handleSetSettings = (
      next: AppSettings | ((prev: AppSettings) => AppSettings),
  ) => {
      setSettings(prev => {
          const value = typeof next === 'function' ? next(prev) : next;
          settingsRef.current = value;
          return value;
      });
      if (settingsFlushTimer.current !== null) window.clearTimeout(settingsFlushTimer.current);
      settingsFlushTimer.current = window.setTimeout(flushSettings, SETTINGS_FLUSH_DELAY_MS);
  };

  // A pending debounce must not be lost when the app is backgrounded — on
  // Android the process can be killed while hidden, taking the last change
  // with it.
  useEffect(() => {
      const onHide = () => { if (document.visibilityState === 'hidden') flushSettings(); };
      document.addEventListener('visibilitychange', onHide);
      return () => {
          document.removeEventListener('visibilitychange', onHide);
          flushSettings();
      };
  }, [flushSettings]);

  const switchProfile = async (id: string) => {
      if (id === currentProfileId) return;

      /*
       * Any settings write still sitting in the debounce belongs to the profile
       * being left. Flush it before anything moves: at this point both
       * settingsRef and currentProfileIdRef still describe the outgoing child,
       * so it lands in the right place. Leaving it pending would let it fire
       * after the switch and write these settings onto the incoming child.
       */
      flushSettings();

      const targetProfile = profiles.find(p => p.id === id);
      adoptSettings(targetProfile?.settings ?? DEFAULT_SETTINGS);

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
      /*
       * Creating a profile is a switch as much as switchProfile is: it points
       * the app at a different child and adopts that child's settings. So the
       * pending write belongs to the child being left, and has to land before
       * anything moves — while settingsRef and currentProfileIdRef still
       * describe them. Without this, adoptSettings below replaces settingsRef
       * with the new child's defaults and the outgoing change is simply gone.
       */
      flushSettings();
      await settingsWriteChain.current;

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
      adoptSettings(startingSettings);
      await loadProfileData(id);
  };

  const updateProfile = async (p: ChildProfile) => {
      /*
       * Land any pending settings write first. This edits name/age/colour from
       * a form that carries no settings, so it reads them back off the existing
       * record — and a write still in the debounce would make that record stale
       * in one direction or the other.
       */
      /*
       * Two writers touch this record: this function, and the debounced settings
       * flush. Each builds its write by spreading a base object it read earlier,
       * so whichever lands second silently reverts the other's field — the flush
       * would restore the old name, or this would restore the old settings.
       *
       * So land the pending write and *wait* for it before reading anything.
       * Flushing without awaiting is not enough: the flush only queues onto the
       * write chain, so it would still complete after the save below.
       */
      flushSettings();
      await settingsWriteChain.current;

      // Read the stored record, not component state: the flush just changed it.
      const existing = (await getAllProfiles()).find(prof => prof.id === p.id);
      const updated = { ...p, settings: existing?.settings || p.settings || DEFAULT_SETTINGS };

      await saveProfile(updated);
      setProfiles(await getAllProfiles());
  };

  const removeProfile = async (id: string) => {
      // A queued settings write would put() the profile back after we remove it.
      cancelPendingSettingsWrite();
      await deleteProfile(id);
      clearHistory(id);
      const remaining = await getAllProfiles();
      setProfiles(remaining);
      if (remaining.length === 0) {
          setCurrentProfileId('');
          setLibrary([]);
          setBoards([]);
          adoptSettings(DEFAULT_SETTINGS);
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

            /*
             * A card coming off the core rail needs a slot of its own.
             *
             * Core cards are rail-scoped and ignore their slot entirely, so the
             * one they still carry is whatever they held before being pinned —
             * usually stale, often already taken. Unpinning used to drop the
             * card straight onto an occupied cell, and the collision handler
             * then pushed the incumbent to the end of the board. Unpinning
             * "I want" moved "People" from the first cell to the last, which is
             * exactly the reflow every slot in this app exists to prevent.
             *
             * The reverse needs nothing: pinning a card leaves its grid slot
             * empty, and an empty slot staying empty is the intended behaviour.
             */
            if (old.isCore && updated.isCore === false) {
                updated.slot = nextFreeSlot();
                updated.category = currentFolderId;
            }

            /*
             * Going the other way, a card joining the rail takes a slot after
             * the last one already there. Without this it keeps its grid slot,
             * which can equal a slot another core card already holds — and the
             * rail is ordered by slot, so a tie leaves two cards in an
             * arbitrary order that reordering cannot then separate. Landing at
             * the bottom of the rail is also the predictable place for it.
             */
            if (!old.isCore && updated.isCore === true) {
                updated.slot = coreItems.length
                    ? Math.max(...coreItems.map(i => i.slot ?? 0)) + 1
                    : 0;
            }

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
  /**
   * Move a card up or down the core rail.
   *
   * Renumbers the whole rail from its resulting order rather than swapping the
   * two slots involved. Core cards are rail-scoped, so nothing renumbers them
   * when they are pinned, and two of them can legitimately hold the same slot
   * value — a plain swap between equals is a no-op, which would read as the
   * button being broken. Rewriting 0..n-1 also repairs any existing ties the
   * first time a parent reorders.
   *
   * These numbers cannot collide with the grid: core cards are filtered out of
   * gridCells, so the two live in separate spaces.
   */

  /**
   * Add the starter vocabulary to a board that already exists.
   *
   * Seeding only runs for a brand-new board, and rightly so — a board a parent
   * has spent months building must never be overwritten. But that left the
   * richer vocabulary invisible to everyone already using the app. This is the
   * explicit way to ask for it.
   *
   * Three rules it will not break:
   *
   * 1. Nothing already on the board moves. New words go *after* the last
   *    occupied slot in each folder, never into the gaps between existing
   *    cards. Gaps are meaningful here — a hidden or deleted card deliberately
   *    leaves one rather than pulling the rest forward, and a parent may have
   *    left space on purpose. Filling them would rearrange a board silently.
   * 2. Nothing is duplicated. A word is skipped if the board already has it,
   *    matched either by its vocabulary key or by its visible label in the
   *    current language — so a parent who typed "water" themselves does not
   *    end up with two.
   * 3. Words for a folder the parent renamed or deleted are skipped, not
   *    dumped at the root. They are reported instead.
   *
   * `dryRun` answers "what would this do" without writing, so the parent can be
   * told the count before agreeing to it.
   */
  const addStarterVocabulary = async (
      opts?: { dryRun?: boolean },
  ): Promise<{ added: number; skipped: number; missingFolders: string[] }> => {
      if (!currentBoardId || !currentProfileId) return { added: 0, skipped: 0, missingFolders: [] };

      const onBoard = library.filter(i => i.boardId === currentBoardId);
      const boardCats = categories.filter(c => c.boardId === currentBoardId);

      const existingKeys = new Set(onBoard.map(i => i.labelKey).filter(Boolean) as string[]);
      const existingLabels = new Set(
          onBoard.map(i => (i.labelKey ? t(i.labelKey as TranslationKey) : i.label) || '')
                 .map(l => l.trim().toLowerCase())
                 .filter(Boolean),
      );
      const alreadyPresent = (entry: VocabEntry) =>
          existingKeys.has(`vocab.${entry.id}`) ||
          existingLabels.has(entry.labels[settings.language].trim().toLowerCase()) ||
          existingLabels.has(entry.labels.en.trim().toLowerCase());

      /** One past the last slot anything occupies in a container. */
      const nextSlotIn = (containerId: string) => {
          let max = -1;
          onBoard.forEach(i => {
              if (!i.isCore && (i.category || ROOT_FOLDER) === containerId && typeof i.slot === 'number') {
                  max = Math.max(max, i.slot);
              }
          });
          boardCats.forEach(c => {
              if ((c.parentId || ROOT_FOLDER) === containerId && typeof c.slot === 'number') {
                  max = Math.max(max, c.slot);
              }
          });
          return max + 1;
      };

      const toAdd: AACItem[] = [];
      let skipped = 0;
      const missingFolders: string[] = [];

      const make = (entry: VocabEntry, catId: string, slot: number, isCore: boolean): AACItem => ({
          id: crypto.randomUUID(),
          profileId: currentProfileId,
          boardId: currentBoardId,
          label: t(`vocab.${entry.id}` as TranslationKey),
          labelKey: `vocab.${entry.id}`,
          imageUrl: `/pictograms/${entry.arasaac}.png`,
          imageFit: 'contain',
          category: catId,
          colorTheme: entry.color as ColorTheme | undefined,
          createdAt: Date.now(),
          slot,
          isCore,
          isVisible: true,
      });

      let railSlot = Math.max(-1, ...onBoard.filter(i => i.isCore).map(i => i.slot ?? -1)) + 1;
      CORE_RAIL.forEach(entry => {
          if (alreadyPresent(entry)) { skipped++; return; }
          toAdd.push(make(entry, ROOT_FOLDER, railSlot++, true));
      });

      Object.entries(FOLDER_VOCAB).forEach(([template, entries]) => {
          const labelKey = STARTER_FOLDER_LABEL_KEYS[template];
          const folder = boardCats.find(c => c.labelKey === labelKey);
          if (!folder) {
              missingFolders.push(t(labelKey));
              skipped += entries.length;
              return;
          }
          let slot = nextSlotIn(folder.id);
          entries.forEach(entry => {
              if (alreadyPresent(entry)) { skipped++; return; }
              toAdd.push(make(entry, folder.id, slot++, false));
          });
      });

      if (!opts?.dryRun && toAdd.length > 0) {
          await saveItemsBatch(toAdd);
          await reloadCurrentData();
      }
      return { added: toAdd.length, skipped, missingFolders };
  };

  const reorderCore = async (itemId: string, direction: -1 | 1) => {
      const from = coreItems.findIndex(i => i.id === itemId);
      if (from === -1) return;
      const to = from + direction;
      if (to < 0 || to >= coreItems.length) return;

      const order = [...coreItems];
      [order[from], order[to]] = [order[to], order[from]];
      await Promise.all(order.map((item, idx) => saveItem({ ...item, slot: idx })));
      await reloadCurrentData();
  };

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

  /**
   * A spelled word joins the sentence as a text-only item. It carries no image
   * and no board, so it is never written to the library — it exists only for
   * the length of this sentence.
   */
  const addTypedWord = (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      if (settings.maxSentenceLength > 0 && sentence.length >= settings.maxSentenceLength) return;
      const item: AACItem = {
          id: `typed:${crypto.randomUUID()}`,
          profileId: currentProfileId,
          boardId: currentBoardId,
          label: trimmed,
          imageUrl: '',
          textToSpeak: trimmed,
          category: currentFolderId,
          createdAt: Date.now(),
      };
      setSentence(prev => [...prev, item]);
      playItemSound(item);
  };

  const vocabulary = useMemo(() => {
      const words = new Set<string>();
      library.forEach(i => {
          const label = i.labelKey ? t(i.labelKey as TranslationKey) : i.label;
          if (label) words.add(label);
          (i.forms || []).forEach(f => { if (f) words.add(f); });
      });
      return [...words].sort((a, b) => a.localeCompare(b));
  }, [library, settings.language]);

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
      /*
       * Record what is about to be said, as said. Not the card ids: those
       * re-resolve later against a board that may have been renamed, deleted,
       * or switched to another language, and typed words have no card at all.
       */
      pushHistory(currentProfileId, {
          words: valid.map(i => ({
              // Typed words carry a synthetic id that is not in the library;
              // keeping it would only produce a lookup that always fails.
              itemId: i.id.startsWith('typed:') ? undefined : i.id,
              text: (i.textToSpeak || (i.labelKey ? t(i.labelKey as TranslationKey) : i.label) || '').trim(),
              label: (i.labelKey ? t(i.labelKey as TranslationKey) : i.label) || '',
              imageUrl: i.imageUrl || undefined,
          })),
          language: settings.language,
          at: Date.now(),
      });
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

  /**
   * Rebuild a past utterance from its snapshot.
   *
   * The words come from the record, not from the board: restoring something a
   * child said last week should say the same thing this week, even if a card
   * has since been renamed or deleted. The live card is consulted only for
   * artwork, and `labelKey` is dropped so the stored wording is not re-run
   * through the current language.
   *
   * Legacy entries hold ids and nothing else, so those still resolve against
   * the library — there is no wording recorded to prefer.
   */
  const setSentenceFromHistory = (entry: HistoryEntry) => {
      if (isPlaying) stopPlayback();
      const at = entry.at ?? Date.now();
      const items: AACItem[] = entry.words.map((w, idx) => {
          const live = w.itemId ? library.find(i => i.id === w.itemId) : undefined;
          if (isLegacyWord(w)) {
              return live ?? {
                  id: `history:${at}:${idx}`,
                  profileId: currentProfileId,
                  boardId: currentBoardId,
                  label: '',
                  imageUrl: '',
                  category: currentFolderId,
                  createdAt: at,
              };
          }
          return {
              id: live?.id ?? `history:${at}:${idx}`,
              profileId: currentProfileId,
              boardId: currentBoardId,
              label: w.label,
              labelKey: undefined,
              imageUrl: w.imageUrl ?? live?.imageUrl ?? '',
              imageFit: live?.imageFit,
              textToSpeak: w.text,
              colorTheme: live?.colorTheme,
              category: live?.category ?? currentFolderId,
              createdAt: live?.createdAt ?? at,
          };
      });
      setSentence(items);
  };

  const value = {
      profiles, currentProfileId, boards, currentBoardId, library, categories, sentence, settings, isEditMode,
      isInitializing, initError, isPlaying, activeIndex, currentFolderId, searchQuery, isSearchActive, searchResults, boardHistory,
      gridItems, gridCells, grid, coreItems, breadcrumbs, t, 
      setSettings: handleSetSettings, 
      setEditMode: setIsEditMode, setSearchQuery, setIsSearchActive,
      switchProfile, switchBoard, navigateToFolder, navigateBackFolder, navigateBackBoard,
      createProfile, updateProfile, removeProfile, createBoard, updateBoard, removeBoard, setBoardGridSize,
      saveCard, saveFolderObj, saveLinkBoard, deleteCard, deleteFolderObj, reorderCore, addStarterVocabulary, reorderGrid, moveItemToFolder,
      selectItem, addTypedWord, vocabulary, previewItemId, addToSentence, removeFromSentence, removeLastFromSentence, clearSentence, playSentence, setSentenceFromHistory
  };

  return <SpeakEasyContext.Provider value={value}>{children}</SpeakEasyContext.Provider>;
};
