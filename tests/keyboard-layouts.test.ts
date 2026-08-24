import { describe, it, expect } from 'vitest';
import { getKeyboardLayout } from '../utils/keyboardLayouts';
import { LANGUAGES } from '../utils/languages';

/**
 * The spelling keyboard is the escape hatch for words that are not on the
 * board, so a language whose letters it cannot type loses that hatch entirely.
 * It shipped that way once: the Latin rows were bare ASCII, so French and
 * Spanish could not spell `café` or `niño`.
 */
describe('every shipped language has a usable keyboard', () => {
  it.each(LANGUAGES.map(l => l.code))('%s has letter rows', code => {
    const layout = getKeyboardLayout(code);
    expect(layout.rows.length).toBeGreaterThanOrEqual(3);
    layout.rows.forEach(row => expect(row.length).toBeGreaterThan(0));
  });

  it.each(LANGUAGES.map(l => l.code))('%s repeats no key', code => {
    const layout = getKeyboardLayout(code);
    const keys = [...layout.rows.join(''), ...layout.accents];
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('can type the words that were previously impossible', () => {
    const canType = (code: any, word: string) => {
      const l = getKeyboardLayout(code);
      const keys = new Set([...l.rows.join(''), ...l.accents]);
      return [...word].every(ch => keys.has(ch));
    };

    expect(canType('es', 'niño')).toBe(true);
    expect(canType('es', 'canción')).toBe(true);
    expect(canType('fr', 'café')).toBe(true);
    expect(canType('fr', 'être')).toBe(true);
    expect(canType('ru', 'ёлка')).toBe(true);
    expect(canType('en', 'hello')).toBe(true);
  });

  it('gives each language its own locale layout, not QWERTY for everything', () => {
    expect(getKeyboardLayout('fr').rows[0]).toBe('azertyuiop');
    expect(getKeyboardLayout('ru').rows[0].startsWith('йцуке')).toBe(true);
    expect(getKeyboardLayout('es').rows[1]).toContain('ñ');
    expect(getKeyboardLayout('en').rows[0]).toBe('qwertyuiop');
  });

  it('puts ё beside е rather than on its own row', () => {
    const ru = getKeyboardLayout('ru');
    expect(ru.rows[0]).toContain('её');
    expect(ru.accents).toEqual([]);
  });

  it('keeps an accents row only where the letters cannot fit inline', () => {
    expect(getKeyboardLayout('fr').accents.length).toBeGreaterThan(0);
    expect(getKeyboardLayout('en').accents).toEqual([]);
    expect(getKeyboardLayout('ru').accents).toEqual([]);
  });

  it('falls back to English for a code it does not know', () => {
    expect(getKeyboardLayout('xx' as any).rows[0]).toBe('qwertyuiop');
  });
});
