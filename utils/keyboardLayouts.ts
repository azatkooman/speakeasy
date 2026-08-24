import { AppLanguage } from '../types';

/**
 * Keyboard layouts for the spelling keyboard, one per shipped language.
 *
 * The keyboard shows exactly the layout of the language selected in Settings —
 * there is no script switcher. A board is configured once by a parent for one
 * child in one language, and a key that silently rearranges the whole keyboard
 * is a key a child can press by accident and then be unable to undo.
 *
 * Two defects this replaced:
 *
 * 1. The layout was a single boolean starting at `false`, so the keyboard
 *    always opened on QWERTY regardless of the interface language.
 * 2. The Latin rows were bare ASCII, so French and Spanish had no accented
 *    letters at all. `niño`, `canción`, `café` and `être` were untypeable —
 *    for a keyboard whose whole job is reaching words that are not on the
 *    board, that removed most of the vocabulary it existed to unlock.
 *
 * Each language gets the layout its own system keyboard uses — AZERTY for
 * French, ЙЦУКЕН for Russian — because that is the arrangement the child
 * already sees everywhere else on the device.
 *
 * Accented characters sit on their own row rather than behind a long press:
 * holding a key means "select" for users on the dwell access method, and
 * overloading it here would break input for exactly the people who most depend
 * on it. A language whose extra letters fit naturally among the others puts
 * them there instead and leaves `accents` empty — Russian's ё beside е,
 * Spanish's ñ on the home row. The separate row is for the ten French accents,
 * which would not fit inline.
 *
 * Mirrors the shape of utils/languages.ts: adding a language is one edit here.
 */

export interface KeyboardLayout {
  /** Letter rows, in the order this locale's own keyboard presents them. */
  rows: string[];
  /** Accented letters and punctuation the language needs. Own row; may be empty. */
  accents: string[];
}

const LAYOUTS: Record<AppLanguage, KeyboardLayout> = {
  // QWERTY. English needs no accents.
  en: {
    rows: ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'],
    accents: [],
  },
  // ЙЦУКЕН. A physical Russian keyboard puts ё off on its own next to the
  // number row, but here it sits directly after е, where someone looking for
  // it will actually look — it is a variant of that letter, not a stray key.
  // That makes the top row 13 keys wide; see the note on accents below.
  ru: {
    rows: ['йцукеёнгшщзхъ', 'фывапролджэ', 'ячсмитьбю'],
    accents: [],
  },
  // AZERTY, as on a French keyboard: m moves to the home row, w to the bottom.
  fr: {
    rows: ['azertyuiop', 'qsdfghjklm', 'wxcvbn'],
    accents: ['é', 'è', 'ê', 'à', 'â', 'ù', 'û', 'ô', 'î', 'ç'],
  },
  // Spanish QWERTY carries ñ on the home row, where a Spanish keyboard has it.
  es: {
    rows: ['qwertyuiop', 'asdfghjklñ', 'zxcvbnm'],
    accents: ['á', 'é', 'í', 'ó', 'ú', 'ü', '¿', '¡'],
  },
};

/** The keyboard for `language`. Falls back to English for an unknown code. */
export const getKeyboardLayout = (language: AppLanguage): KeyboardLayout =>
  LAYOUTS[language] || LAYOUTS.en;
