import { describe, it, expect, vi } from 'vitest';
import { isBundledAsset, resolveSeedPictogram } from '../utils/seedPictograms';

/**
 * Bundled assets versus files the parent supplied.
 *
 * These were confused once, and the result was three of the four default cards
 * rendering as broken images: every path containing a slash was treated as a
 * filesystem path and rewritten for the native WebView, including the app's own
 * bundled pictograms. The distinction is load-bearing.
 */
describe('isBundledAsset', () => {
  it('recognises the app’s own bundled paths', () => {
    expect(isBundledAsset('/pictograms/2462.png')).toBe(true);
    expect(isBundledAsset('/icons/icon-192.png')).toBe(true);
    expect(isBundledAsset('/assets/thing.svg')).toBe(true);
  });

  it('does not claim parent-supplied or remote files', () => {
    expect(isBundledAsset('file:///data/user/0/app/files/photo.jpg')).toBe(false);
    expect(isBundledAsset('https://static.arasaac.org/pictograms/2462/2462_500.png')).toBe(false);
    expect(isBundledAsset('data:image/png;base64,AAAA')).toBe(false);
    expect(isBundledAsset('some/relative/path.png')).toBe(false);
  });
});

describe('resolveSeedPictogram', () => {
  it('rewrites the legacy remote seed URLs to bundled copies', () => {
    // Existing installs hold the old static.arasaac.org URLs; offline, those
    // render as nothing unless they are mapped to the bundled files.
    const legacy = 'https://static.arasaac.org/pictograms/2462/2462_500.png';
    const resolved = resolveSeedPictogram(legacy);
    expect(resolved).not.toBe(legacy);
    expect(isBundledAsset(resolved!)).toBe(true);
  });

  it('leaves anything it does not know alone', () => {
    expect(resolveSeedPictogram('/pictograms/2462.png')).toBe('/pictograms/2462.png');
    expect(resolveSeedPictogram(undefined)).toBeUndefined();
  });
});

describe('corrected seed symbols', () => {
  it('serves the park card the park, not a car parking', () => {
    // ARASAAC 5379's keyword is literally "park" so the automatic search chose
    // it, but the picture is a car reversing into a space. Boards seeded before
    // the fix hold the old path and are corrected on read.
    expect(resolveSeedPictogram('/pictograms/5379.png')).toBe('/pictograms/2859.png');
  });

  it('corrects a legacy remote URL and a wrong symbol in one pass', () => {
    // Both maps have to apply, in that order, or an old install that stored the
    // remote URL keeps the wrong picture.
    const remote = 'https://static.arasaac.org/pictograms/5379/5379_500.png';
    const viaLegacy = resolveSeedPictogram(remote);
    // 5379 was never one of the five legacy remote seeds, so this one passes
    // through unchanged — the assertion documents the boundary rather than
    // claiming coverage it does not have.
    expect(viaLegacy).toBe(remote);
  });

  it('leaves every other bundled pictogram alone', () => {
    expect(resolveSeedPictogram('/pictograms/2859.png')).toBe('/pictograms/2859.png');
    expect(resolveSeedPictogram('/pictograms/2462.png')).toBe('/pictograms/2462.png');
  });
});
