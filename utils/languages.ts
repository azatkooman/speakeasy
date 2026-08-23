import { AppLanguage } from '../types';

/**
 * Single source of truth for the app's supported languages.
 *
 * Everything that varies per language lives here so that adding one is a
 * single edit. Previously each call site hardcoded its own list, which is how
 * the profile picker ended up stuck on a two-way en/ru toggle after French and
 * Spanish were added everywhere else.
 *
 * - `nativeLabel` is deliberately in the language itself, so a parent who
 *   cannot read the current UI language can still find their own.
 * - `bcp47` is the region-qualified tag for TTS. See BCP47_TAGS in
 *   services/voice.ts, which must stay in sync with this list.
 * - `voiceTestPhrase` is spoken by the "test voice" button in Settings.
 */
export interface LanguageOption {
  code: AppLanguage;
  nativeLabel: string;
  bcp47: string;
  voiceTestPhrase: string;
}

export const LANGUAGES: LanguageOption[] = [
  { code: 'en', nativeLabel: 'English',  bcp47: 'en-US', voiceTestPhrase: 'Hello, this is a voice test' },
  { code: 'ru', nativeLabel: 'Русский',  bcp47: 'ru-RU', voiceTestPhrase: 'Привет, это проверка голоса' },
  { code: 'fr', nativeLabel: 'Français', bcp47: 'fr-FR', voiceTestPhrase: 'Bonjour, ceci est un test vocal' },
  { code: 'es', nativeLabel: 'Español',  bcp47: 'es-ES', voiceTestPhrase: 'Hola, esto es una prueba de voz' },
];

export const getLanguageOption = (code: AppLanguage): LanguageOption =>
  LANGUAGES.find(l => l.code === code) || LANGUAGES[0];

/**
 * Best-effort match of the device locale to a supported language, used only for
 * the very first launch before a profile exists. Falls back to English.
 */
export const detectDeviceLanguage = (): AppLanguage => {
  if (typeof navigator === 'undefined' || !navigator.language) return 'en';
  const prefix = navigator.language.toLowerCase().split('-')[0];
  return LANGUAGES.find(l => l.code === prefix)?.code || 'en';
};
