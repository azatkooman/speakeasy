/**
 * Recent-sentence history, stored per profile.
 *
 * This used to live in a single global `aac_history_ids` key, so two children
 * sharing a tablet shared and overwrote each other's recent sentences — and a
 * 15-slot buffer filled by a sibling is a buffer the other child cannot use.
 * Settings already moved onto the profile; history was left behind.
 */
const LEGACY_KEY = 'aac_history_ids';
const MAX_ENTRIES = 15;

/**
 * One word as it was actually said.
 *
 * History used to store card ids alone, which made it quietly lossy in four
 * ways: a typed word never enters the library so it could never come back at
 * all; a deleted card vanished from old utterances, silently changing what they
 * said; labels were re-resolved through the current language, so switching
 * language rewrote history retroactively; and a chosen word form collapsed back
 * to its base card. An utterance is a record of something a person said. It
 * should not change afterwards because their board did.
 *
 * `itemId` is kept only so restoring can prefer the live card's artwork when it
 * still exists. Nothing about the wording depends on it.
 */
export interface HistoryWord {
  /** Exactly what was spoken. */
  text: string;
  /** Exactly what the cell showed at the time. */
  label: string;
  /** The symbol as it was then, if there was one. */
  imageUrl?: string;
  /** Source card, when the word came from one. Absent for typed or spelled words. */
  itemId?: string;
}

export interface HistoryEntry {
  words: HistoryWord[];
  /** Interface language when it was said, so nothing is re-translated later. */
  language?: string;
  /** When it was said. */
  at?: number;
}

/**
 * Entries written before snapshots existed hold ids and nothing else. They are
 * readable but not reconstructable — the wording was never recorded — so they
 * keep the old behaviour of resolving against the library, and a word whose
 * card is gone is shown as missing rather than silently dropped.
 */
export const isLegacyWord = (w: HistoryWord): boolean => !w.label && !!w.itemId;

const keyFor = (profileId: string) => `${LEGACY_KEY}:${profileId}`;

/**
 * Reads either shape: the legacy `string[][]` of card ids, or the current list
 * of snapshots. Both can sit in the same key, since an install upgrades in
 * place and older entries are never rewritten.
 */
const parse = (raw: string | null): HistoryEntry[] => {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((entry: unknown): HistoryEntry[] => {
      if (Array.isArray(entry)) {
        // Legacy: a bare array of card ids.
        const words = entry
          .filter((id): id is string => typeof id === 'string')
          .map(id => ({ itemId: id, text: '', label: '' }));
        return words.length ? [{ words }] : [];
      }
      if (entry && typeof entry === 'object' && Array.isArray((entry as HistoryEntry).words)) {
        return [entry as HistoryEntry];
      }
      return [];
    });
  } catch {
    return [];
  }
};

/**
 * Moves the old global history onto the first profile that asks for it, which
 * in practice is whoever was using the app when they upgraded. Runs once — the
 * legacy key is removed afterwards.
 */
const adoptLegacyHistory = (profileId: string) => {
  const legacy = localStorage.getItem(LEGACY_KEY);
  if (legacy === null) return;
  if (localStorage.getItem(keyFor(profileId)) === null) {
    localStorage.setItem(keyFor(profileId), legacy);
  }
  localStorage.removeItem(LEGACY_KEY);
};

export const readHistory = (profileId: string): HistoryEntry[] => {
  if (!profileId) return [];
  adoptLegacyHistory(profileId);
  return parse(localStorage.getItem(keyFor(profileId)));
};

export const pushHistory = (profileId: string, entry: HistoryEntry): void => {
  if (!profileId || entry.words.length === 0) return;
  const next = [entry, ...readHistory(profileId)].slice(0, MAX_ENTRIES);
  try {
    localStorage.setItem(keyFor(profileId), JSON.stringify(next));
  } catch (e) {
    // Quota exhausted, or storage disabled. History is not worth failing over.
    console.warn('Could not save sentence history', e);
  }
};

export const clearHistory = (profileId: string): void => {
  if (!profileId) return;
  localStorage.removeItem(keyFor(profileId));
};
