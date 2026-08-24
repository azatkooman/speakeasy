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
