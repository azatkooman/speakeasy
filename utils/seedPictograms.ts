/**
 * Bundled seed pictograms.
 *
 * The default cards used to reference static.arasaac.org at runtime, which
 * meant a first launch without a connection produced blank cards. They are
 * bundled instead, so the starter vocabulary works offline.
 *
 * These live in `public/` and are referenced by STABLE, unhashed paths on
 * purpose. The seeded URL is written into IndexedDB and persists for the life
 * of a profile — if these were bundler imports, their content-hashed filenames
 * would change on any future rebuild and silently break the default cards of
 * every existing install.
 *
 * Pictograms: ARASAAC (arasaac.org), author Sergio Palao, property of the
 * Government of Aragón, licensed CC BY-NC-SA. Redistributing them inside the
 * app requires visible attribution — the `create.attribution` translation key
 * already exists for this and still needs surfacing in the UI.
 */
const BASE = '/pictograms';

export const SEED_PICTOGRAMS = {
  iWant: `${BASE}/5441.png`,
  yes: `${BASE}/5584.png`,
  no: `${BASE}/5526.png`,
  stop: `${BASE}/7196.png`,
  apple: `${BASE}/2462.png`,
} as const;

/**
 * Maps the remote URLs that earlier versions wrote into IndexedDB onto the
 * bundled copies. Existing installs keep their stored remote URL — this is
 * applied at read time so their default cards also render offline, without
 * needing a database migration.
 */
const LEGACY_REMOTE_TO_LOCAL: Record<string, string> = {
  'https://static.arasaac.org/pictograms/5441/5441_500.png': SEED_PICTOGRAMS.iWant,
  'https://static.arasaac.org/pictograms/5584/5584_500.png': SEED_PICTOGRAMS.yes,
  'https://static.arasaac.org/pictograms/5526/5526_500.png': SEED_PICTOGRAMS.no,
  'https://static.arasaac.org/pictograms/7196/7196_500.png': SEED_PICTOGRAMS.stop,
  'https://static.arasaac.org/pictograms/2462/2462_500.png': SEED_PICTOGRAMS.apple,
};

/** True for an app-bundled asset path, which must not be rewritten as a native file URL. */
export const isBundledAsset = (path: string): boolean =>
  path.startsWith('/pictograms/') || path.startsWith('/assets/') || path.startsWith('/icons/');

export const resolveSeedPictogram = (url: string | undefined): string | undefined =>
  url ? LEGACY_REMOTE_TO_LOCAL[url] || url : url;
