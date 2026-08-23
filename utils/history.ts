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

const keyFor = (profileId: string) => `${LEGACY_KEY}:${profileId}`;

const parse = (raw: string | null): string[][] => {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(Array.isArray) : [];
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

export const readHistory = (profileId: string): string[][] => {
  if (!profileId) return [];
  adoptLegacyHistory(profileId);
  return parse(localStorage.getItem(keyFor(profileId)));
};

export const pushHistory = (profileId: string, itemIds: string[]): void => {
  if (!profileId || itemIds.length === 0) return;
  const next = [itemIds, ...readHistory(profileId)].slice(0, MAX_ENTRIES);
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
