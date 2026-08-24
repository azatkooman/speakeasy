import { AppLanguage } from '../types';

/**
 * Keyboard layouts for the spelling keyboard, one per shipped language.
 *
 * Two things this fixes, both of which were real defects:
 *
 * 1. The layout used to be a single boolean starting at `false`, so the
 *    keyboard always opened on QWERTY — a Russian parent had to reach for the
 *    script toggle before typing anything.
 * 2. The Latin rows were bare ASCII, so French and Spanish had no accented
 *    letters at all. `niño`, `canción`, `café` and `être` were untypeable. For
 *    a keyboard whose entire job is reaching words that are not on the board,
 *    that removed most of the vocabulary it existed to unlock.
 *
 * Each language gets the layout its own system keyboard uses — AZERTY for
 * French, ЙЦУКЕН for Russian — because that is the arrangement the child
 * already sees everywhere else on the device. Accented characters sit on their
 * own row rather than behind a long press: holding a key means "select" for
 * users on the dwell access method, and overloading it here would break input
 * for exactly the people who most depend on it.
 *
 * Mirrors the shape of utils/languages.ts: adding a language is one edit here.
 */

export type KeyboardScript = 'latin' | 'cyrillic';

export interface KeyboardLayout {
  script: KeyboardScript;
  /** Letter rows, in the order this locale's own keyboard presents them. */
  rows: string[];
  /** Accented letters and punctuation the language needs. Own row; may be empty. */
  accents: string[];
}

const LAYOUTS: Record<AppLanguage, KeyboardLayout> = {
  // QWERTY. English needs no accents.
  en: {
    script: 'latin',
    rows: ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'],
    accents: [],
  },
  // ЙЦУКЕН, the standard Russian layout. ё is a key of its own there too.
  ru: {
    script: 'cyrillic',
    rows: ['йцукенгшщзхъ', 'фывапролджэ', 'ячсмитьбю'],
    accents: ['ё'],
  },
  // AZERTY, as on a French keyboard: m moves to the home row, w to the bottom.
  fr: {
    script: 'latin',
    rows: ['azertyuiop', 'qsdfghjklm', 'wxcvbn'],
    accents: ['é', 'è', 'ê', 'à', 'â', 'ù', 'û', 'ô', 'î', 'ç'],
  },
  // Spanish QWERTY carries ñ on the home row, where a Spanish keyboard has it.
  es: {
    script: 'latin',
    rows: ['qwertyuiop', 'asdfghjklñ', 'zxcvbnm'],
    accents: ['á', 'é', 'í', 'ó', 'ú', 'ü', '¿', '¡'],
  },
};

/** Shown on the button that switches scripts: what you get if you press it. */
export const SCRIPT_SWITCH_LABEL: Record<KeyboardScript, string> = {
  latin: 'ABC',
  cyrillic: 'АБВ',
};

/**
 * The layout for `language`, plus the one the script toggle reaches.
 *
 * The alternate is the other script rather than a hardcoded Latin/Cyrillic
 * pair, so a parent on a Russian interface can still type a French word and a
 * parent on a French one can still type a Russian name. QWERTY is the Latin
 * alternate because it is the layout most widely recognised for typing a word
 * from a language that is not the interface language.
 */
export const getKeyboardLayouts = (
  language: AppLanguage,
): { primary: KeyboardLayout; alternate: KeyboardLayout } => {
  const primary = LAYOUTS[language] || LAYOUTS.en;
  return {
    primary,
    alternate: primary.script === 'cyrillic' ? LAYOUTS.en : LAYOUTS.ru,
  };
};
