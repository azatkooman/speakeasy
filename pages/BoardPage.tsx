
import React, { useState, useRef, useEffect } from 'react';
import { useSpeakEasy } from '../contexts/SpeakEasyContext.tsx';
import { Home, ChevronRight, CornerUpLeft, Plus, FolderPlus, ArrowLeft, ArrowRight, ArrowUp, ArrowDown, Settings2, ArrowUpRight, User, Layers, Type } from 'lucide-react';
import SentenceStrip from '../components/SentenceStrip.tsx';
import FolderCard from '../components/FolderCard.tsx';
import { ROOT_FOLDER } from '../services/storage.ts';
import { AACItem, Category } from '../types.ts';
import { TranslationKey } from '../services/translations.ts';
import { readHistory } from '../utils/history.ts';
import { useSelectable, DEFAULT_DWELL_MS } from '../utils/useSelectable.ts';
import { useScanner, ScanStop } from '../utils/useScanner.ts';
import { useRenderedCols } from '../utils/useRenderedCols.ts';
import GridCellButton from '../components/GridCellButton.tsx';
import ConfirmationModal from '../components/ConfirmationModal.tsx';
import CreateCardModal from '../components/CreateCardModal.tsx';
import CreateSelectionModal from '../components/CreateSelectionModal.tsx';
import EditOptionsModal from '../components/EditOptionsModal.tsx';
import FolderModal from '../components/FolderModal.tsx';
import HistoryModal from '../components/HistoryModal.tsx';
import LinkBoardModal from '../components/LinkBoardModal.tsx';
import MoveItemModal from '../components/MoveItemModal.tsx';
import ProfileSelectionModal from '../components/ProfileSelectionModal.tsx';
import SettingsModal from '../components/SettingsModal.tsx';
import BoardsModal from '../components/BoardsModal.tsx';
import WordFormsModal from '../components/WordFormsModal.tsx';
import KeyboardModal from '../components/KeyboardModal.tsx';
import SearchOverlay from '../components/SearchOverlay.tsx';

// Updated Color definitions for the "Framed" style
const THEME_STYLES: Record<string, { bg: string; border: string; shadow: string; text: string; ring: string }> = {
    'yellow': { bg: 'bg-yellow-50', border: 'border-yellow-400', shadow: 'shadow-yellow-600', text: 'text-yellow-900', ring: 'ring-yellow-400' },
    'green':  { bg: 'bg-green-50',  border: 'border-green-500',  shadow: 'shadow-green-700',  text: 'text-green-900',  ring: 'ring-green-500' },
    'blue':   { bg: 'bg-blue-50',   border: 'border-blue-400',   shadow: 'shadow-blue-600',   text: 'text-blue-900',   ring: 'ring-blue-400' },
    'pink':   { bg: 'bg-pink-50',   border: 'border-pink-400',   shadow: 'shadow-pink-600',   text: 'text-pink-900',   ring: 'ring-pink-400' },
    'orange': { bg: 'bg-orange-50', border: 'border-orange-400', shadow: 'shadow-orange-600', text: 'text-orange-900', ring: 'ring-orange-400' },
    'purple': { bg: 'bg-purple-50', border: 'border-purple-400', shadow: 'shadow-purple-600', text: 'text-purple-900', ring: 'ring-purple-400' },
    'teal':   { bg: 'bg-teal-50',   border: 'border-teal-400',   shadow: 'shadow-teal-600',   text: 'text-teal-900',   ring: 'ring-teal-400' },
    'red':    { bg: 'bg-red-50',    border: 'border-red-500',    shadow: 'shadow-red-700',    text: 'text-red-900',    ring: 'ring-red-500' },
    'slate':  { bg: 'bg-slate-50',  border: 'border-slate-400',  shadow: 'shadow-slate-600',  text: 'text-slate-900',  ring: 'ring-slate-400' },
};
const DEFAULT_CARD_STYLE = THEME_STYLES['slate'];

export const BoardPage: React.FC = () => {
  const { 
     gridItems, gridCells, grid, coreItems, selectItem, addTypedWord, vocabulary, previewItemId, sentence, categories, settings, isEditMode, currentFolderId, breadcrumbs, 
     addToSentence, removeFromSentence, removeLastFromSentence, clearSentence, playSentence,
     t, navigateToFolder, navigateBackFolder, reorderGrid, reorderCore, isSearchActive, library,
     
     saveCard, saveFolderObj, saveLinkBoard, deleteCard, deleteFolderObj, 
     moveItemToFolder, setSentenceFromHistory, switchProfile, createProfile, updateProfile, removeProfile,
     switchBoard, createBoard, updateBoard, removeBoard, setBoardGridSize,
     profiles, currentProfileId, boards, currentBoardId,
     setSettings,
     setSearchQuery, setIsSearchActive, searchQuery, searchResults
  } = useSpeakEasy();

  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isCreateSelectionOpen, setIsCreateSelectionOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [isLinkBoardModalOpen, setIsLinkBoardModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isBoardsModalOpen, setIsBoardsModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(profiles.length === 0);
  
  const [editOptionsItem, setEditOptionsItem] = useState<{ item: AACItem | Category, type: 'card' | 'folder' } | null>(null);
  const [editingItem, setEditingItem] = useState<AACItem | null>(null);
  const [editingFolder, setEditingFolder] = useState<Category | null>(null);
  const [moveModalItem, setMoveModalItem] = useState<{ item: AACItem | Category, type: 'card' | 'folder' } | null>(null);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [folderToDelete, setFolderToDelete] = useState<string | null>(null);
  const [formsCard, setFormsCard] = useState<AACItem | null>(null);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  /**
   * Briefly ringed after a search jump. Landing in the right folder still
   * leaves a parent scanning two dozen cells for the one they searched for.
   */
  const [foundItemId, setFoundItemId] = useState<string | null>(null);

  const breadcrumbsScrollRef = useRef<HTMLDivElement>(null);

  // Clear the post-search highlight on its own, so it draws the eye without
  // becoming a permanent mark on the board.
  useEffect(() => {
      if (!foundItemId) return;
      const timer = window.setTimeout(() => setFoundItemId(null), 2600);
      return () => window.clearTimeout(timer);
  }, [foundItemId]);
  const mainRef = useRef<HTMLElement>(null);
  const prevGridLength = useRef(0);

  useEffect(() => {
    if (profiles.length === 0) {
      setIsProfileModalOpen(true);
    }
  }, [profiles.length]);

  useEffect(() => {
    if (breadcrumbsScrollRef.current) {
        breadcrumbsScrollRef.current.scrollTo({ left: breadcrumbsScrollRef.current.scrollWidth, behavior: 'smooth' });
    }
  }, [breadcrumbs]);

  /**
   * Scroll behaviour on the board.
   *
   * Navigating anywhere returns to the top. This used to be broken in a way
   * that was easy to miss: the only rule here was "if the item count grew,
   * scroll to the bottom", meant for a parent who has just added a card. Going
   * from a folder holding one card back to a home screen holding eight looks
   * identical to that rule — the count grew — so coming out of a folder
   * dumped you at the bottom of the board, below every folder on it.
   *
   * The count is therefore tracked per location, and only a growth *within the
   * same folder* counts as something being added. That is also gated to parent
   * mode, since nothing is added to a grid in child mode and a board should
   * never move on its own under a child.
   */
  const prevLocation = useRef<string>('');
  useEffect(() => {
    // Mode is part of the location: switching to parent mode reveals hidden
    // cards, so the count grows without anything having been added — the same
    // trap that sent you to the bottom on leaving a folder.
    const location = `${currentBoardId}/${currentFolderId}/${isEditMode}`;
    const moved = location !== prevLocation.current;

    if (moved) {
        // Instant, not smooth: this is a navigation landing, and the board
        // sliding under someone who has just tapped a folder is motion for its
        // own sake.
        mainRef.current?.scrollTo({ top: 0 });
    } else if (isEditMode && gridItems.length > prevGridLength.current) {
        // A card was just added — bring it into view.
        setTimeout(() => {
            mainRef.current?.scrollTo({ top: mainRef.current.scrollHeight, behavior: 'smooth' });
        }, 100);
    }

    prevLocation.current = location;
    prevGridLength.current = gridItems.length;
  }, [gridItems.length, currentFolderId, currentBoardId, isEditMode]);

  /**
   * The scan sequence: core rail first, then the grid row-major. The rail is a
   * single column, so each rail item is its own row for row-column scanning —
   * which is right, because selecting a rail row should select that word rather
   * than opening a second stage over one cell.
   */
  // The rail and the page padding are not available to the grid, so exclude
  // them before working out how many columns will fit.
  const railWidthPx = coreItems.length > 0 ? (window.innerWidth < 640 ? 64 : 112) : 0;
  const renderedCols = useRenderedCols(grid.cols, railWidthPx + 32);

  /**
   * Cells actually rendered. Trailing rows that are entirely empty are dropped
   * in child mode: occupied cells keep their slots, so nothing a child has
   * learned moves — this only stops a 24-slot board becoming eight mostly-blank
   * rows when it wraps at three columns on a phone. Parent mode keeps them, so
   * there is somewhere to place a new card.
   *
   * Hoisted out of the JSX because the scanner has to walk exactly what is on
   * screen; computing it in two places is how a highlight ends up on a cell
   * that is not there.
   */
  const visibleCells = React.useMemo(() => {
      const lastFilled = gridCells.reduce((acc: number, c: any, i: number) => (c ? i : acc), -1);
      const rowsNeeded = Math.max(1, Math.ceil((lastFilled + 1) / renderedCols));
      return isEditMode ? gridCells : gridCells.slice(0, rowsNeeded * renderedCols);
  }, [gridCells, renderedCols, isEditMode]);

  /**
   * How many scan rows sit above the rail: one for the sentence controls when
   * there is a sentence to act on, one for navigation when there is somewhere
   * to navigate. Shared by the stop list and by the row highlight below, since
   * the two disagreeing is how a highlight ends up on a row that is not there.
   */
  const controlRowCount =
      (sentence.length > 0 ? 1 : 0) + (currentFolderId !== ROOT_FOLDER ? 1 : 0);

  /** Row a rendered grid cell belongs to, in scan-row terms. */
  const gridRowOf = (index: number) =>
      controlRowCount + coreItems.length + Math.floor(index / renderedCols);

  /**
   * Everything a switch can land on, in traversal order.
   *
   * Each rail item is its own row: selecting a rail row should say that word,
   * not open a second stage over a single cell. A card's grammar badge is a
   * stop sharing its card's row, immediately after it — that is the only way a
   * switch user can reach word forms at all, since the badge is a sibling
   * button rather than a grid cell. Saying the word still comes first, so the
   * common case costs no extra press.
   */
  const scanStops = React.useMemo((): ScanStop[] => {
      const out: ScanStop[] = [];
      let row = 0;

      /*
       * Sentence controls come first, as their own row.
       *
       * Without them the scanner covered vocabulary only, which meant a switch
       * user could compose a sentence and then had no way to speak it, undo a
       * wrong word, or start again. Scanning that reaches the words but not the
       * Speak button is not an access method; it is a demonstration of one.
       *
       * First rather than last because in rowColumn this is one step from the
       * start of a cycle, and speaking is the thing a user does at the end of
       * every single utterance. It costs one extra row on the way to vocabulary
       * and saves traversing the whole board on the way to the voice.
       *
       * Only offered when they would do something: a scan that dwells on a
       * disabled Speak button spends the user's time on nothing. For someone
       * driving this with one switch, that time is the cost of speaking.
       */
      if (sentence.length > 0) {
          out.push({ id: 'ctl:speak', row, onSelect: () => playSentence() });
          out.push({ id: 'ctl:backspace', row, onSelect: () => removeLastFromSentence() });
          out.push({ id: 'ctl:clear', row, onSelect: () => clearSentence() });
          row += 1;
      }

      /*
       * Navigation, when there is anywhere to go. A switch user who opens a
       * folder could not previously get back out of it without a carer.
       *
       * Deliberately not offering the keyboard or history buttons yet: both
       * open dialogs that have no scanner of their own, so a switch user would
       * reach a screen they could neither operate nor dismiss. That is worse
       * than not reaching it — the same dead end the word-forms dialog had
       * before it got its own scanner.
       */
      if (currentFolderId !== ROOT_FOLDER) {
          out.push({ id: 'nav:back', row, onSelect: () => navigateBackFolder() });
          out.push({ id: 'nav:home', row, onSelect: () => navigateToFolder(ROOT_FOLDER) });
          row += 1;
      }

      const railRowBase = row;
      coreItems.forEach((card, i) => {
          out.push({ id: `core:${card.id}`, row: railRowBase + i, onSelect: () => selectItem(card) });
          if ((card.forms?.length ?? 0) > 0) {
              out.push({ id: `core-forms:${card.id}`, row: railRowBase + i, onSelect: () => setFormsCard(card) });
          }
      });
      visibleCells.forEach((cell: any, index: number) => {
          if (!cell) return;
          const row = gridRowOf(index);
          if (cell.type === 'folder') {
              out.push({ id: `folder:${cell.id}`, row, onSelect: () => navigateToFolder(cell.id) });
              return;
          }
          out.push({ id: `card:${cell.id}`, row, onSelect: () => selectItem(cell) });
          if ((cell.forms?.length ?? 0) > 0) {
              out.push({ id: `card-forms:${cell.id}`, row, onSelect: () => setFormsCard(cell) });
          }
      });
      return out;
  }, [coreItems, visibleCells, renderedCols, selectItem, navigateToFolder,
      sentence.length, currentFolderId, playSentence, removeLastFromSentence,
      clearSentence, navigateBackFolder]);

  const scanSettings = settings.scan || { mode: 'off' as const, rateMs: 1200, auto: true };

  const isAnyModalOpen =
      isHistoryOpen || isCreateSelectionOpen || isCreateModalOpen || isFolderModalOpen ||
      isLinkBoardModalOpen || isSettingsOpen || isBoardsModalOpen || isProfileModalOpen ||
      !!editOptionsItem || !!moveModalItem || !!itemToDelete || !!folderToDelete || !!formsCard || isKeyboardOpen;

  const scanner = useScanner({
      settings: scanSettings,
      stops: scanStops,
      // Scanning is a child-facing access method: it would fight the edit
      // controls in parent mode, and while any dialog is open a switch press
      // would otherwise select a cell on the board behind it. The forms dialog
      // runs its own scanner once it is open.
      enabled: !isEditMode && !isSearchActive && !isAnyModalOpen,
  });

  /**
   * Label size follows how wide the cells actually ended up, not the stored
   * density preset — a 'medium' board on a phone has narrower cells than a
   * 'small' board on a tablet.
   */
  const getLabelSize = () => renderedCols >= 6
      ? 'text-[11px] sm:text-sm leading-tight'
      : 'text-xs sm:text-base leading-tight';

  /**
   * The card's Fitzgerald colour as a key rather than a set of Tailwind
   * classes. The shells need the identity so CSS can express it differently —
   * see the [data-theme-color] custom properties in index.css.
   */
  const getCardThemeKey = (item: AACItem): string => {
    if (item.colorTheme && THEME_STYLES[item.colorTheme]) return item.colorTheme;
    const folder = categories.find(c => c.id === item.category);
    return folder && THEME_STYLES[folder.colorTheme] ? folder.colorTheme : 'slate';
  };

  const getCardStyle = (item: AACItem) => {
    if (item.colorTheme && THEME_STYLES[item.colorTheme]) return THEME_STYLES[item.colorTheme];
    const folder = categories.find(c => c.id === item.category);
    return folder && THEME_STYLES[folder.colorTheme] ? THEME_STYLES[folder.colorTheme] : DEFAULT_CARD_STYLE;
  };

  return (
    <>
      <SentenceStrip 
          items={sentence} 
          categories={categories}
          onRemoveItem={removeFromSentence}
          onRemoveLastItem={removeLastFromSentence}
          onClear={clearSentence}
          onPlay={playSentence}
          scanFocusedId={scanner.focusedId}
          onShowHistory={() => setIsHistoryOpen(true)}
          onOpenKeyboard={() => setIsKeyboardOpen(true)}
          isPlaying={useSpeakEasy().isPlaying}
          activeIndex={useSpeakEasy().activeIndex}
          t={t}
      />

      {currentFolderId !== ROOT_FOLDER && (
          <div className="relative shrink-0 bg-white/50 border-b border-slate-200/60 z-20 backdrop-blur-md flex items-center justify-between pr-2 shadow-sm">
              <div ref={breadcrumbsScrollRef} className="flex-1 flex items-center overflow-x-auto no-scrollbar px-4 py-3 gap-1">
                  <button 
                    onClick={() => {
                        navigateToFolder(ROOT_FOLDER);
                    }} 
                    className={`flex items-center justify-center p-2 rounded-xl transition-all active:scale-95 active:bg-slate-300 ${currentFolderId === ROOT_FOLDER ? 'text-slate-900 bg-slate-200' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'} ${scanner.focusedId === 'nav:home' ? 'ring-4 ring-sky-500 ring-offset-2 z-40' : ''}`}
                    aria-label={t('app.home_folder')}
                  >
                      <Home size={22} />
                  </button>
                  
                  {breadcrumbs.map((crumb, index) => (
                      <React.Fragment key={crumb.id}>
                          <ChevronRight size={18} className="text-slate-300 flex-shrink-0" />
                          <button 
                            onClick={() => {
                                navigateToFolder(crumb.id);
                            }} 
                            className={`whitespace-nowrap px-3 py-2 rounded-xl text-base font-bold transition-all active:scale-95 active:bg-slate-200 ${index === breadcrumbs.length - 1 ? 'text-primary-700 bg-primary/10' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}
                          >
                              {crumb.label}
                          </button>
                      </React.Fragment>
                  ))}
              </div>
              <div className="pl-2 border-l border-slate-200/50">
                  <button 
                    onClick={() => {
                        navigateBackFolder();
                    }} 
                    className={`flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-200 rounded-xl text-slate-700 font-bold hover:bg-slate-50 hover:text-primary active:scale-95 transition-all text-sm shadow-sm whitespace-nowrap ${scanner.focusedId === 'nav:back' ? 'ring-4 ring-sky-500 ring-offset-2 z-40' : ''}`}
                  >
                      <CornerUpLeft size={20} strokeWidth={2.5} />
                      <span className="hidden sm:inline">{t('header.back')}</span>
                  </button>
              </div>
          </div>
      )}

      <div className="flex-1 flex min-h-0">

      {/*
        Persistent core-word rail. Core items are board-scoped, so this does not
        change when the child opens a folder — which is the entire point.
        Roughly 80% of what anyone says is core vocabulary, and before this it
        disappeared on navigation, leaving the child unable to reach `want`,
        `more` or `stop` without backing out first.
        Hidden when empty, so a board that has not opted in looks unchanged.
      */}
      {coreItems.length > 0 && (
        <nav
          aria-label={t('modal.create.core')}
          className="shrink-0 w-16 sm:w-28 bg-white/70 border-r border-slate-200 overflow-y-auto no-scrollbar p-2 flex flex-col gap-2"
        >
          {coreItems.map((card, railIdx) => {
              const style = getCardStyle(card);
              const label = card.labelKey ? t(card.labelKey as TranslationKey) : card.label;
              const hasForms = (card.forms?.length ?? 0) > 0;
              return (
                // Row highlight for rowColumn's first stage. Without it the
                // rail is invisible while rows are being scanned: each rail
                // item is its own row, so a switch user would be stepping
                // through four rows with nothing on screen to show it.
                <div key={card.id} data-part="cell" data-theme-color={getCardThemeKey(card)} className={`relative shrink-0 ${scanner.focusedRow === railIdx ? 'ring-4 ring-sky-500/60 rounded-2xl' : ''}`}>
                <GridCellButton
                  onActivate={() => selectItem(card)}
                  selectionMode={settings.selectionMode || 'release'}
                  dwellMs={settings.dwellMs || DEFAULT_DWELL_MS}
                  isPreviewArmed={previewItemId === card.id}
                  isScanFocused={scanner.focusedId === `core:${card.id}`}
                  dataPart="card-surface"
                  className={`relative w-full h-[4.25rem] sm:h-20 rounded-2xl bg-white border-2 ${style.border} shadow-[0_3px_0_0] ${style.shadow} flex flex-col overflow-hidden ${card.isVisible === false ? 'opacity-50 grayscale' : ''}`}
                >
                  <span data-part="card-art" className="flex-1 min-h-0 w-full p-1 flex items-center justify-center bg-white">
                    <img src={card.imageUrl} alt="" loading="lazy" className={`w-full h-full ${card.imageFit === 'contain' ? 'object-contain' : 'object-cover rounded-lg'}`} />
                  </span>
                  <span data-part="card-label" className={`shrink-0 w-full py-0.5 px-1 border-t-2 ${style.border} ${style.bg} ${style.text} text-[10px] sm:text-xs font-semibold text-center truncate`}>
                    {label}
                  </span>
                </GridCellButton>

                {/*
                  Edit affordance for a rail card.

                  Without it a pinned card was unreachable. Core cards are
                  excluded from the grid, so the rail is the only place they
                  exist — and the rail had no gear, so "Always on screen" was a
                  one-way door: no way to unpin, edit or delete afterwards. That
                  included the four seed cards, which ship pinned, so a parent
                  could not touch "I want", "Yes", "No" or "Stop" at all.

                  Positioned inside the cell rather than overhanging it: the rail
                  scrolls on its Y axis, which makes the X axis a scroll
                  container too, so anything at a negative offset gets clipped.
                */}
                {isEditMode && (
                  <>
                    <button
                      type="button"
                      aria-label={t('modal.create.title_edit')}
                      onClick={() => setEditOptionsItem({ item: card, type: 'card' })}
                      className="absolute top-1 right-1 z-30 bg-white/95 backdrop-blur-sm rounded-full w-6 h-6 flex items-center justify-center shadow-sm border border-slate-200 text-slate-700 hover:border-primary hover:text-primary active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary"
                    >
                      <Settings2 size={13} strokeWidth={2.5} />
                    </button>

                    {/* Up and down, not left and right: the rail is a column, and
                        arrows that disagree with the axis they move things along
                        are a guess the parent has to make twice.

                        Stacked on the left edge so they clear the gear, inside
                        the cell because the rail clips anything that overhangs
                        it, and the lower one raised above the label band — at
                        bottom-1 it covered the word, so a parent could not read
                        which card they were about to move. */}
                    <button
                      type="button"
                      aria-label={t('move.up')}
                      onClick={() => reorderCore(card.id, -1)}
                      disabled={railIdx === 0}
                      className={`absolute top-1 left-1 z-30 w-5 h-5 flex items-center justify-center rounded-full shadow-sm border transition-all active:scale-95 backdrop-blur-sm ${railIdx === 0 ? 'bg-slate-100/60 border-slate-200/60 text-slate-300 cursor-not-allowed' : 'bg-white/95 border-slate-200 text-slate-700 hover:border-primary hover:text-primary'}`}
                    >
                      <ArrowUp size={12} strokeWidth={2.5} />
                    </button>
                    <button
                      type="button"
                      aria-label={t('move.down')}
                      onClick={() => reorderCore(card.id, 1)}
                      disabled={railIdx === coreItems.length - 1}
                      className={`absolute bottom-6 left-1 z-30 w-5 h-5 flex items-center justify-center rounded-full shadow-sm border transition-all active:scale-95 backdrop-blur-sm ${railIdx === coreItems.length - 1 ? 'bg-slate-100/60 border-slate-200/60 text-slate-300 cursor-not-allowed' : 'bg-white/95 border-slate-200 text-slate-700 hover:border-primary hover:text-primary'}`}
                    >
                      <ArrowDown size={12} strokeWidth={2.5} />
                    </button>
                  </>
                )}

                {/* After the cell in DOM order on purpose: saying the word is the
                    primary action and should come first for keyboard and switch
                    users. Positioned inside the cell for the same clipping
                    reason as the gear above. */}
                {!isEditMode && hasForms && (
                  <button
                    type="button"
                    aria-label={`${t('forms.title')}: ${label}`}
                    onClick={() => setFormsCard(card)}
                    className={`absolute top-1 right-1 z-30 bg-white/95 rounded-full w-6 h-6 flex items-center justify-center shadow-sm border-2 border-slate-200 text-slate-600 hover:border-primary hover:text-primary active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary ${scanner.focusedId === `core-forms:${card.id}` ? 'ring-4 ring-sky-500 ring-offset-2' : ''}`}
                  >
                    <Type size={12} strokeWidth={2.5} />
                  </button>
                )}
                </div>
              );
          })}
        </nav>
      )}

      <main 
        ref={mainRef} 
        className="flex-1 min-w-0 overflow-y-auto p-4"
        style={{ paddingBottom: isEditMode ? 'calc(10rem + env(safe-area-inset-bottom))' : 'calc(8rem + env(safe-area-inset-bottom))' }}
      >
        {/*
          Fixed grid. The column count comes from the board, not from Tailwind
          breakpoints, so rotating the tablet scales the cells instead of
          reflowing them and moving every word. `null` cells are real, preserved
          gaps: a hidden or deleted item leaves its slot empty rather than
          pulling everything after it forward. Search is the exception — absolute
          slots are meaningless there, so it lays out as a plain flow.
        */}
        <div
          className="grid gap-3 sm:gap-4 max-w-7xl mx-auto"
          style={{ gridTemplateColumns: `repeat(${renderedCols}, minmax(0, 1fr))` }}
        >
            {visibleCells.map((cell: any, index: number) => {
                const inFocusedRow = scanner.focusedRow !== null
                    && gridRowOf(index) === scanner.focusedRow;
                if (!cell) {
                    return (
                        <div
                            key={`empty-${index}`}
                            aria-hidden="true"
                            className={`aspect-[4/5] rounded-3xl ${isEditMode ? 'border-2 border-dashed border-slate-300/70' : ''} ${inFocusedRow ? 'ring-4 ring-sky-500/60' : ''}`}
                        />
                    );
                }

                const item = cell;
                const prevFilled = gridCells.slice(0, index).some(Boolean);
                const nextFilled = gridCells.slice(index + 1).some(Boolean);
                const isFirst = !prevFilled;
                const isLast = !nextFilled;

                if (item.type === 'folder') {
                    const folder = item as Category;
                    return (
                        // aspect-[4/5] belongs here, on the grid item, exactly as it
                        // does on the card branch below. It used to sit on
                        // FolderCard's own root instead, one level down, so a folder
                        // cell and a card cell were sized by two different rules and
                        // came out 14px apart in the same row.
                        <div key={folder.id} data-part="cell" data-theme-color={folder.colorTheme || 'slate'} className={`relative aspect-[4/5] ${inFocusedRow ? 'ring-4 ring-sky-500/60 rounded-3xl' : ''} ${foundItemId === folder.id ? 'ring-4 ring-amber-400 ring-offset-2 rounded-3xl z-20' : ''}`}>
                            <FolderCard 
                                folder={folder} 
                                isScanFocused={scanner.focusedId === `folder:${folder.id}`}
                                onClick={() => navigateToFolder(folder.id)} 
                                onReorderLeft={(e) => { e.stopPropagation(); reorderGrid(folder.id, -1); }}
                                onReorderRight={(e) => { e.stopPropagation(); reorderGrid(folder.id, 1); }}
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
                    const isHidden = card.isVisible === false;
                    const displayLabel = card.labelKey ? t(card.labelKey as TranslationKey) : card.label;
                    
                    return (
                        // Positioning wrapper. The card itself is a single <button> so it
                        // is reachable by keyboard, screen reader and switch access; the
                        // edit controls are siblings rather than nested buttons, which
                        // would be invalid and would break that traversal.
                        <div key={card.id} data-part="cell" data-theme-color={getCardThemeKey(card)} className={`relative aspect-[4/5] ${inFocusedRow ? 'ring-4 ring-sky-500/60 rounded-3xl' : ''} ${foundItemId === card.id ? 'ring-4 ring-amber-400 ring-offset-2 rounded-3xl z-20' : ''}`}>
                            <GridCellButton
                                onActivate={() => {
                                    selectItem(card);
                                }}
                                selectionMode={settings.selectionMode || 'release'}
                                dwellMs={settings.dwellMs || DEFAULT_DWELL_MS}
                                isPreviewArmed={previewItemId === card.id}
                                isScanFocused={scanner.focusedId === `card:${card.id}`}
                                dataPart="card-surface"
                                className={`
                                    absolute inset-0 rounded-3xl
                                    bg-white
                                    flex flex-col items-center overflow-hidden
                                    border-2 ${style.border}
                                    shadow-[0_4px_0_0] ${style.shadow}
                                    transition-all duration-100
                                    group
                                    ${isHidden ? 'opacity-50 grayscale' : ''}
                                `}
                            >
                                {/* Image Container - Always White for clean photo display */}
                                <div data-part="card-art" className="w-full flex-1 p-2 flex items-center justify-center bg-white relative min-h-0">
                                    <img
                                        src={card.imageUrl}
                                        // Decorative: the label below is the button's
                                        // accessible name, so alt text would duplicate it.
                                        alt=""
                                        className={`
                                            w-full h-full pointer-events-none transition-transform duration-200 group-hover:scale-105
                                            ${card.imageFit === 'contain' ? 'object-contain' : 'object-cover rounded-xl'}
                                        `}
                                        loading="lazy"
                                    />

                                    {isLink && <div className="absolute top-2 right-2 bg-purple-100 text-purple-600 p-1 rounded-full shadow-sm z-20"><ArrowUpRight size={16} strokeWidth={3} /></div>}
                                </div>

                                {/* Text Band - Colored based on part of speech */}
                                <div data-part="card-label" className={`w-full h-7 sm:h-12 flex items-center justify-center border-t-2 ${style.border} ${style.bg} px-0.5 shrink-0`}>
                                    <span className={`font-semibold text-center line-clamp-2 break-words ${getLabelSize()} ${style.text}`}>
                                        {displayLabel}
                                    </span>
                                </div>
                            </GridCellButton>

                            {/* Grammar badge. A sibling of the cell button, not
                                nested inside it, so both stay reachable. */}
                            {!isEditMode && (card.forms?.length ?? 0) > 0 && (
                                <button
                                    type="button"
                                    aria-label={`${t('forms.title')}: ${displayLabel}`}
                                    onClick={() => setFormsCard(card)}
                                    className={`absolute top-1 right-1 z-30 bg-white/95 backdrop-blur-sm rounded-full w-8 h-8 flex items-center justify-center shadow-sm border-2 border-slate-200 text-slate-600 hover:border-primary hover:text-primary active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary ${scanner.focusedId === `card-forms:${card.id}` ? 'ring-4 ring-sky-500 ring-offset-2' : ''}`}
                                >
                                    <Type size={15} strokeWidth={2.5} />
                                </button>
                            )}

                            {isEditMode && (
                                <>
                                    <button type="button" aria-label={t('modal.create.title_edit')} onClick={() => setEditOptionsItem({ item: card, type: 'card' })} className="absolute top-1 right-1 bg-white/90 backdrop-blur-sm rounded-full p-2 shadow-sm z-30 border border-slate-200 hover:bg-slate-100 active:scale-95 transition-all"><Settings2 size={16} className="text-slate-700" /></button>
                                    <div className="absolute bottom-[3.25rem] sm:bottom-[3.5rem] inset-x-2 flex justify-between z-30 pointer-events-none">
                                        <button type="button" aria-label={t('move.title')} onClick={() => reorderGrid(card.id, -1)} disabled={isFirst} className={`pointer-events-auto w-8 h-8 flex items-center justify-center rounded-full shadow-lg border-2 transition-all active:scale-95 backdrop-blur-md ${isFirst ? 'bg-slate-100/50 border-slate-200 text-slate-300 opacity-50 cursor-not-allowed' : 'bg-white border-slate-200 text-slate-700 hover:border-primary hover:text-primary hover:bg-slate-50'}`}><ArrowLeft size={16} strokeWidth={2.5} /></button>
                                        <button type="button" aria-label={t('move.title')} onClick={() => reorderGrid(card.id, 1)} disabled={isLast} className={`pointer-events-auto w-8 h-8 flex items-center justify-center rounded-full shadow-lg border-2 transition-all active:scale-95 backdrop-blur-md ${isLast ? 'bg-slate-100/50 border-slate-200 text-slate-300 opacity-50 cursor-not-allowed' : 'bg-white border-slate-200 text-slate-700 hover:border-primary hover:text-primary hover:bg-slate-50'}`}><ArrowRight size={16} strokeWidth={2.5} /></button>
                                    </div>
                                </>
                            )}
                        </div>
                    );
                }
            })}
        </div>
        
        {gridItems.length === 0 && (
            <div className="flex flex-col items-center justify-center h-80 space-y-6 animate-in fade-in duration-500 px-4">
                <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center text-slate-300">
                    <FolderPlus size={48} />
                </div>
                <div className="text-center space-y-3 max-w-sm mx-auto">
                    <p className="font-bold text-2xl text-slate-700">{t('app.empty_folder')}</p>
                    
                    {/*
                      A child who lands in an empty folder used to be shown
                      "Switch to Parent Mode to add folders or cards" — an
                      instruction they cannot act on, on a screen with no way
                      out. Give them the way out instead. At the root there is
                      nowhere to go back to, so the heading stands alone.
                    */}
                    {!isEditMode ? (
                        currentFolderId !== ROOT_FOLDER && (
                            <button
                                type="button"
                                onClick={() => navigateToFolder(ROOT_FOLDER)}
                                className="mx-auto flex items-center gap-2 px-5 py-3 bg-white border-2 border-slate-200 rounded-2xl text-slate-700 font-semibold shadow-sm hover:border-primary hover:text-primary active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary focus-visible:ring-offset-2"
                            >
                                <Home size={20} />
                                <span>{t('app.home_folder')}</span>
                            </button>
                        )
                    ) : (
                        <div className="text-slate-400 font-bold text-lg flex items-center justify-center gap-2 flex-wrap">
                            <span>{t('app.hint_tap')}</span>
                            <span className="inline-flex items-center justify-center bg-primary text-white w-8 h-8 rounded-xl shadow-md"><Plus size={20} strokeWidth={3}/></span>
                            <span>{t('app.hint_create')}</span>
                        </div>
                    )}
                </div>
            </div>
        )}
      </main>
      </div>

      {isEditMode && (
        <div 
            className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-lg border-t border-slate-200 p-4 z-50 flex items-center justify-between gap-4" 
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 1.5rem)' }}
        >
            <div className="flex-1 flex justify-start gap-4 sm:gap-8 pl-2">
                <button onClick={() => setIsProfileModalOpen(true)} className="flex flex-col items-center text-slate-500 group"><div className="p-2 rounded-2xl group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors"><User size={24} /></div><span className="text-[10px] font-bold group-hover:text-indigo-600">{t('nav.profiles')}</span></button>
                <button onClick={() => setIsBoardsModalOpen(true)} className="flex flex-col items-center text-slate-500 group"><div className="p-2 rounded-2xl group-hover:bg-purple-50 group-hover:text-purple-600 transition-colors"><Layers size={24} /></div><span className="text-[10px] font-bold group-hover:text-purple-600">{t('nav.boards')}</span></button>
            </div>
            <button onClick={() => setIsCreateSelectionOpen(true)} className="w-16 h-16 bg-primary text-white rounded-2xl flex items-center justify-center border-4 border-white shadow-xl -mt-12 active:scale-95 transition-transform shrink-0 z-10"><Plus size={32} /></button>
            <div className="flex-1 flex justify-end gap-4 sm:gap-8 pr-2">
                <button onClick={() => setIsSettingsOpen(true)} className="flex flex-col items-center text-slate-500 group"><div className="p-2 rounded-2xl group-hover:bg-slate-100 group-hover:text-slate-800 transition-colors"><Settings2 size={24} /></div><span className="text-[10px] font-bold group-hover:text-slate-800">{t('nav.settings')}</span></button>
            </div>
        </div>
      )}

      <HistoryModal isOpen={isHistoryOpen} onClose={() => setIsHistoryOpen(false)} historyIds={isHistoryOpen ? readHistory(currentProfileId) : []} library={library} onSelectSentence={setSentenceFromHistory} t={t} />
      <CreateSelectionModal isOpen={isCreateSelectionOpen} onClose={() => setIsCreateSelectionOpen(false)} onSelectCard={() => { setIsCreateSelectionOpen(false); setEditingItem(null); setIsCreateModalOpen(true); }} onSelectFolder={() => { setIsCreateSelectionOpen(false); setEditingFolder(null); setIsFolderModalOpen(true); }} onSelectLink={() => { setIsCreateSelectionOpen(false); setIsLinkBoardModalOpen(true); }} t={t} />
      <CreateCardModal voiceRate={settings.voiceRate} voicePitch={settings.voicePitch} isOpen={isCreateModalOpen} onClose={() => { setIsCreateModalOpen(false); setEditingItem(null); }} onSave={(d) => saveCard(d, editingItem?.id)} editItem={editingItem} t={t} language={settings.language} currentFolderName={currentFolderId === ROOT_FOLDER ? t('app.home_folder') : categories.find(c => c.id === currentFolderId)?.label} />
      <FolderModal isOpen={isFolderModalOpen} onClose={() => { setIsFolderModalOpen(false); setEditingFolder(null); }} onSave={(l, c, i) => saveFolderObj(l, c, i, editingFolder)} editFolder={editingFolder} t={t} language={settings.language} />
      <LinkBoardModal isOpen={isLinkBoardModalOpen} onClose={() => setIsLinkBoardModalOpen(false)} onSave={saveLinkBoard} boards={boards} currentBoardId={currentBoardId} t={t} />
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} settings={settings} onUpdateSettings={setSettings} onUpdateGridSize={setBoardGridSize} currentBoardLabel={boards.find(b => b.id === currentBoardId)?.label} t={t} />
      <BoardsModal isOpen={isBoardsModalOpen} onClose={() => setIsBoardsModalOpen(false)} boards={boards} currentBoardId={currentBoardId} onSwitchBoard={switchBoard} onCreateBoard={createBoard} onDeleteBoard={removeBoard} onUpdateBoard={updateBoard} t={t} />
      <ProfileSelectionModal 
        isOpen={isProfileModalOpen} 
        onClose={() => setIsProfileModalOpen(false)} 
        profiles={profiles} 
        currentProfileId={currentProfileId} 
        onSelectProfile={switchProfile} 
        onCreateProfile={createProfile} 
        onUpdateProfile={updateProfile} 
        onDeleteProfile={removeProfile} 
        t={t} 
        forceCreate={profiles.length === 0} 
        language={settings.language} 
        onUpdateLanguage={(l) => setSettings({...settings, language: l})} 
      />
      <EditOptionsModal isOpen={!!editOptionsItem} onClose={() => setEditOptionsItem(null)} item={editOptionsItem?.item || null} type={editOptionsItem?.type || 'card'} onEdit={() => { if(editOptionsItem?.type==='card') { setEditingItem(editOptionsItem.item as AACItem); setIsCreateModalOpen(true); } else { setEditingFolder(editOptionsItem?.item as Category); setIsFolderModalOpen(true); } }} onMove={() => setMoveModalItem(editOptionsItem)} onDelete={() => { if(editOptionsItem?.type==='card') setItemToDelete(editOptionsItem.item.id); else setFolderToDelete(editOptionsItem?.item.id ?? null); }} t={t} />
      <MoveItemModal isOpen={!!moveModalItem} onClose={() => setMoveModalItem(null)} itemToMove={moveModalItem} categories={categories.filter(c => c.boardId === currentBoardId)} onMove={(target) => { if(moveModalItem) moveItemToFolder(moveModalItem.item, moveModalItem.type, target); setMoveModalItem(null); }} t={t} />
      <SearchOverlay
        isOpen={isSearchActive}
        query={searchQuery}
        onQueryChange={setSearchQuery}
        results={searchResults}
        onClose={() => { setIsSearchActive(false); setSearchQuery(''); }}
        onJump={(hit) => {
            navigateToFolder(hit.openFolderId);
            // A folder hit opens the folder itself, so there is nothing inside
            // it to point at; a card hit lands next to two dozen siblings.
            setFoundItemId(hit.type === 'card' ? hit.id : null);
            setIsSearchActive(false);
            setSearchQuery('');
        }}
        t={t}
      />
      <KeyboardModal
        isOpen={isKeyboardOpen}
        onClose={() => setIsKeyboardOpen(false)}
        vocabulary={vocabulary}
        onSubmit={addTypedWord}
        language={settings.language}
        t={t}
      />
      <WordFormsModal
        card={formsCard}
        scanSettings={scanSettings}
        baseLabel={formsCard ? (formsCard.labelKey ? t(formsCard.labelKey as TranslationKey) : formsCard.label) : ''}
        onClose={() => setFormsCard(null)}
        onChoose={(text) => {
            if (!formsCard) return;
            // Same id as the base card so later edits and deletes still reach it;
            // only the spoken and displayed wording changes.
            selectItem({ ...formsCard, label: text, labelKey: undefined, textToSpeak: text });
        }}
        t={t}
      />
      <ConfirmationModal isOpen={!!itemToDelete || !!folderToDelete} onClose={() => { setItemToDelete(null); setFolderToDelete(null); }} onConfirm={() => { if(itemToDelete) deleteCard(itemToDelete).then(() => setItemToDelete(null)); else if(folderToDelete) deleteFolderObj(folderToDelete).then(() => setFolderToDelete(null)); }} isFolder={!!folderToDelete} t={t} />
    </>
  );
};
