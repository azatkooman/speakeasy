import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';

/**
 * Two regression classes, both found by measuring the running app rather than
 * reading the code, because both are invisible in source review:
 *
 *  1. A button whose only label is `hidden sm:inline` has NO accessible name on
 *     a phone — `display: none` removes it from the accessibility tree. The back
 *     button had this, on the device most people use.
 *
 *  2. A range input with an adjacent but unassociated <label> has no accessible
 *     name either. All five sliders in Settings had this, so a screen-reader
 *     user heard "slider" with no idea whether it set speech rate or scan speed.
 *
 * These are source-level checks, so they are approximations of the real
 * accessibility tree. They are here because they are cheap and because both
 * mistakes are easy to reintroduce; they do not replace checking a real one.
 */

const root = resolve(__dirname, '..');
const sources = [
  ...readdirSync(join(root, 'components')).filter(f => f.endsWith('.tsx')).map(f => join('components', f)),
  ...readdirSync(join(root, 'pages')).filter(f => f.endsWith('.tsx')).map(f => join('pages', f)),
];

/**
 * Extract whole JSX tags of a given element name. A plain regex cannot do this:
 * `onChange={(e) => …}` puts a `>` inside the tag, so `[^>]*` stops early and
 * silently matches nothing. This tracks quotes and brace depth instead.
 */
function jsxTags(src: string, name: string): string[] {
  const out: string[] = [];
  const open = new RegExp(`<${name}(?![a-zA-Z])`, 'g');
  let m: RegExpExecArray | null;
  while ((m = open.exec(src)) !== null) {
    let i = m.index + name.length + 1, depth = 0, quote: string | null = null;
    for (; i < src.length; i++) {
      const c = src[i];
      if (quote) { if (c === quote) quote = null; continue; }
      if (c === '"' || c === "'" || c === '`') { quote = c; continue; }
      if (c === '{') { depth++; continue; }
      if (c === '}') { depth--; continue; }
      if (depth === 0 && c === '>') { i++; break; }
    }
    out.push(src.slice(m.index, i));
  }
  return out;
}

/** Split a file into <button …> … </button> regions, allowing for nesting. */
function buttonBlocks(src: string): string[] {
  const out: string[] = [];
  const open = /<button(?![a-zA-Z])/g;
  let m: RegExpExecArray | null;
  while ((m = open.exec(src)) !== null) {
    const close = src.indexOf('</button>', m.index);
    out.push(src.slice(m.index, close === -1 ? src.length : close));
  }
  return out;
}

describe('accessible names', () => {
  it('gives a button an aria-label when its only label is hidden below a breakpoint', () => {
    const offenders: string[] = [];
    for (const file of sources) {
      const src = readFileSync(join(root, file), 'utf8');
      for (const block of buttonBlocks(src)) {
        const hidesLabel = /className="[^"]*\bhidden\s+(sm|md|lg):(inline|block|flex)/.test(block);
        if (hidesLabel && !/aria-label/.test(block)) {
          offenders.push(`${file}: ${block.slice(0, 80).replace(/\s+/g, ' ')}`);
        }
      }
    }
    expect(offenders, 'a label hidden at this width is not an accessible name').toEqual([]);
  });

  it('names every range input', () => {
    const offenders: string[] = [];
    for (const file of sources) {
      const src = readFileSync(join(root, file), 'utf8');
      // each <input … /> that declares type="range"
      for (const tag of jsxTags(src, 'input')) {
        if (!/type="range"/.test(tag)) continue;
        if (!/aria-label|aria-labelledby|\bid=/.test(tag)) {
          offenders.push(`${file}: ${tag.slice(0, 70).replace(/\s+/g, ' ')}`);
        }
      }
    }
    expect(offenders, 'an adjacent <label> without htmlFor names nothing').toEqual([]);
  });

  it('keeps range inputs on the class that gives them a 44px hit area', () => {
    // The element itself is the track: styled at 8px tall it is nearly unhittable.
    const settings = readFileSync(join(root, 'components/SettingsModal.tsx'), 'utf8');
    const ranges = jsxTags(settings, 'input').filter(t => /type="range"/.test(t));
    expect(ranges.length).toBeGreaterThan(0);
    for (const tag of ranges) {
      expect(tag, 'expected className="sa-range"').toMatch(/className="sa-range"/);
    }
  });
});
