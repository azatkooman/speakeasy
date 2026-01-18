
export type ColorTheme = 'yellow' | 'green' | 'blue' | 'pink' | 'orange' | 'purple' | 'red' | 'teal' | 'slate';

export interface ChildProfile {
  id: string;
  name: string;
  age: number;
  colorTheme: ColorTheme;
  createdAt: number;
}

export interface Board {
  id: string;
  profileId: string; // Associated Profile
  label: string;
  createdAt: number;
}

export interface Category {
  id: string;
  profileId: string; // Associated Profile
  boardId: string; // Associated Board
  label: string;
  colorTheme: ColorTheme;
  parentId?: string; // If undefined or 'root', it's a top-level folder
  icon?: string; // Key from ICON_MAP
  order?: number;
}

export interface AACItem {
  id: string;
  profileId: string; // Associated Profile
  boardId: string; // Associated Board
  label: string;
  imageUrl: string; // Base64 or Blob URL
  imageFit?: 'cover' | 'contain'; // 'cover' for photos (no strips), 'contain' for symbols (no crop)
  audioUrl?: string; // Base64 or Blob URL
  textToSpeak?: string; // Custom TTS text (optional)
  category: string; // References Category.id (Folder ID)
  colorTheme?: ColorTheme; // Optional override for Fitzgerald key color
  isVisible?: boolean; // If false, hidden in Child Mode
  linkedBoardId?: string; // If present, clicking this item switches to this board
  createdAt: number;
  order?: number;
}

export interface SavedSentence {
  id: string;
  items: AACItem[];
  createdAt: number;
}

export type AppLanguage = 'en' | 'ru';

export interface AppSettings {
  voicePitch: number;
  voiceRate: number;
  gridColumns: 'small' | 'medium' | 'large';
  language: AppLanguage;
  maxSentenceLength: number; // 0 = unlimited, 1-5 = limit
  autoClearSentence: boolean;
}