
export type ColorTheme = 'yellow' | 'green' | 'blue' | 'pink' | 'orange' | 'purple' | 'red' | 'teal' | 'slate';

export interface ChildProfile {
  id: string;
  name: string;
  age: number;
  colorTheme: ColorTheme;
  createdAt: number;
  settings?: AppSettings;
}

export interface Board {
  id: string;
  profileId: string; // Associated Profile
  label: string;
  createdAt: number;
  /**
   * Fixed grid dimensions. NOT responsive: the column count used to come from
   * Tailwind breakpoints, so every word changed position when the tablet was
   * rotated or the window resized, destroying the motor memory a child builds
   * up. Cells scale; the grid does not reflow.
   */
  gridRows: number;
  gridCols: number;
}

export interface Category {
  id: string;
  profileId: string; // Associated Profile
  boardId: string; // Associated Board
  label: string;
  labelKey?: string; // For localization of default folders
  colorTheme: ColorTheme;
  parentId?: string; // If undefined or 'root', it's a top-level folder
  icon?: string; // Key from ICON_MAP
  /**
   * Absolute cell index within the parent folder's grid. Cards and folders
   * share one slot space, so each occupies a specific cell and nothing ever
   * reflows. Replaces `order`, which was compacted — hiding the third of
   * twelve items shifted the other nine.
   */
  slot?: number;
  order?: number; // legacy, read only by the v6 -> v7 migration
}

export interface AACItem {
  id: string;
  profileId: string; // Associated Profile
  boardId: string; // Associated Board
  label: string;
  labelKey?: string; // For localization of default cards
  imageUrl: string; // Base64 or Blob URL
  imageFit?: 'cover' | 'contain'; // 'cover' for photos (no strips), 'contain' for symbols (no crop)
  audioUrl?: string; // Base64 or Blob URL
  textToSpeak?: string; // Custom TTS text (optional)
  category: string; // References Category.id (Folder ID)
  colorTheme?: ColorTheme; // Optional override for Fitzgerald key color
  isVisible?: boolean; // If false, hidden in Child Mode
  linkedBoardId?: string; // If present, clicking this item switches to this board
  createdAt: number;
  /** Absolute cell index. See Category.slot. */
  slot?: number;
  order?: number; // legacy, read only by the v6 -> v7 migration
  /**
   * Pinned to the persistent core-word rail. Core items are board-scoped and
   * ignore `category`, so they stay on screen in every folder. Around 80% of
   * what anyone says is core vocabulary, and it used to disappear the moment a
   * child opened a folder.
   */
  isCore?: boolean;
}

export interface SavedSentence {
  id: string;
  items: AACItem[];
  createdAt: number;
}

export type AppLanguage = 'en' | 'ru' | 'fr' | 'es';

export type GridSize = 'small' | 'medium' | 'large';

export type Shell = 'youngLearner' | 'neutral';

export interface AppSettings {
  voicePitch: number;
  voiceRate: number;
  /**
   * Remembered grid-density preference. The authoritative dimensions live on
   * the Board (gridRows/gridCols) — this is what the Settings control shows as
   * selected, and changing it writes the mapped dimensions to the board.
   */
  gridColumns: GridSize;
  language: AppLanguage;
  maxSentenceLength: number; // 0 = unlimited, 1-5 = limit
  autoClearSentence: boolean;
  /**
   * Return to the home board after a fringe word is chosen, so the child
   * always re-orients from the same place. Off by default: it is genuinely
   * helpful for some children and disorienting for others.
   */
  returnHomeAfterSelect?: boolean;
  /**
   * Visual shell. AAC users keep a system for years — a child who starts at
   * five is using it at fifteen — so the playful look is a choice, not a
   * given. Same grid, same positions, same colours either way.
   */
  shell?: Shell;

  /**
   * How a press turns into a selection.
   * - 'release' (default): activates on lift, and only if the finger is still
   *   on the cell, so sliding off cancels. This is native click behaviour.
   * - 'press': activates the instant contact is made. Fastest, but a brushed
   *   hand selects.
   * - 'dwell': the cell must be held for dwellMs before it activates, which
   *   filters out tremor and involuntary contact.
   */
  selectionMode?: SelectionMode;
  /** Hold duration for selectionMode 'dwell'. */
  dwellMs?: number;
  /**
   * Two-stage selection. The first activation speaks the word without adding
   * it to the sentence; a second activation on the same cell commits it.
   * Essential for auditory scanning and for users who cannot see the symbol.
   */
  auditoryPreview?: boolean;
  /**
   * Switch scanning. A highlight walks the board and a switch selects what it
   * lands on. External AAC switches present as HID keyboards, so the switch
   * arrives as a keypress.
   */
  scan?: ScanSettings;
}

export type SelectionMode = 'release' | 'press' | 'dwell';

export type ScanMode = 'off' | 'linear' | 'rowColumn';

export interface ScanSettings {
  mode: ScanMode;
  /** Milliseconds each step is highlighted before advancing. */
  rateMs: number;
  /**
   * Automatic scanning advances on a timer and the switch selects.
   * Step scanning does not advance on its own: one switch moves, the other
   * selects. Users who cannot time a press against a moving highlight need
   * step mode.
   */
  auto: boolean;
}
