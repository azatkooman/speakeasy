
export type ColorTheme = 'yellow' | 'green' | 'blue' | 'pink' | 'orange' | 'purple' | 'red' | 'teal' | 'slate';

export interface Category {
  id: string;
  label: string;
  colorTheme: ColorTheme;
}

export interface AACItem {
  id: string;
  label: string;
  imageUrl: string; // Base64 or Blob URL
  audioUrl?: string; // Base64 or Blob URL
  textToSpeak?: string; // Custom TTS text (optional)
  category: string; // References Category.id
  isVisible?: boolean; // If false, hidden in Child Mode
  createdAt: number;
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
}
