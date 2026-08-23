
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

export interface AppSettings {
  voicePitch: number;
  voiceRate: number;
  gridColumns: 'small' | 'medium' | 'large';
  language: AppLanguage;
  maxSentenceLength: number; // 0 = unlimited, 1-5 = limit
  autoClearSentence: boolean;
}
