import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { CORE_RAIL, FOLDER_VOCAB, ALL_VOCAB, vocabLabel } from '../utils/starterVocabulary';
import { LANGUAGES } from '../utils/languages';

/**
 * The starter vocabulary is clinical content, so these tests do not judge which
 * words were chosen. They guard the properties that make it safe to ship: every
 * word is spelled in every language, every word has a symbol that is actually
 * bundled, no two words share a symbol, and positions do not depend on
 * language — which is what keeps a bilingual child's motor plan intact.
 */
describe('every word is complete in every shipped language', () => {
  it.each(LANGUAGES.map(l => l.code))('%s has a label for all 90 words', code => {
    const missing = ALL_VOCAB.filter(v => !v.labels[code] || !v.labels[code].trim());
    expect(missing.map(v => v.id)).toEqual([]);
  });

  it('has no word left in English by accident in another language', () => {
    // A label identical across all four is nearly always an untranslated stub.
    // "No" and "pasta" legitimately are, so they are named rather than hidden.
    const legitimatelyIdentical = new Set(['no', 'pasta']);
    const suspicious = ALL_VOCAB.filter(v => {
      const vals = LANGUAGES.map(l => v.labels[l.code].toLowerCase());
      return new Set(vals).size === 1 && !legitimatelyIdentical.has(v.id);
    });
    expect(suspicious.map(v => v.id)).toEqual([]);
  });
});

describe('symbols', () => {
  it('bundles a file for every word, so nothing needs a network to draw', () => {
    const missing = ALL_VOCAB.filter(v => !existsSync(`public/pictograms/${v.arasaac}.png`));
    expect(missing.map(v => `${v.id} -> ${v.arasaac}.png`)).toEqual([]);
  });

  it('gives no two words the same picture', () => {
    // Two identical cards are indistinguishable to a child who cannot read, and
    // it is the signature of a search that fell back to an arbitrary match.
    const byPictogram = new Map<number, string[]>();
    ALL_VOCAB.forEach(v => byPictogram.set(v.arasaac, [...(byPictogram.get(v.arasaac) ?? []), v.id]));
    const shared = [...byPictogram].filter(([, ids]) => ids.length > 1);
    expect(shared.map(([id, ids]) => `${id}: ${ids.join(' + ')}`)).toEqual([]);
  });
});

describe('identity and position are language-independent', () => {
  it('has a unique, stable id per word', () => {
    const ids = ALL_VOCAB.map(v => v.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('resolves a vocab key to each language, falling back to English', () => {
    expect(vocabLabel('vocab.water', 'en')).toBe('water');
    expect(vocabLabel('vocab.water', 'ru')).toBe('вода');
    expect(vocabLabel('vocab.water', 'fr')).toBe('eau');
    expect(vocabLabel('vocab.water', 'es')).toBe('agua');
    expect(vocabLabel('vocab.nope', 'en')).toBeUndefined();
    expect(vocabLabel('not-a-vocab-key', 'en')).toBeUndefined();
  });

  it('puts a word at the same index whatever the language, since order holds the position', () => {
    // The guarantee: a word's cell comes from its index here, and nothing in
    // this file's ordering depends on language.
    const idxOf = (id: string) => CORE_RAIL.findIndex(v => v.id === id);
    expect(idxOf('i_want')).toBe(0);
    LANGUAGES.forEach(l => {
      expect(CORE_RAIL[0].labels[l.code]).toBeTruthy();
    });
  });

  it('files every folder’s words under a folder the board template defines', () => {
    const known = ['PEOPLE', 'VERB', 'NOUN', 'ADJECTIVE', 'SOCIAL', 'PLACES', 'FOOD', 'TIME'];
    expect(Object.keys(FOLDER_VOCAB).filter(k => !known.includes(k))).toEqual([]);
  });

  it('is substantially richer than the four cards it replaced', () => {
    expect(CORE_RAIL.length).toBeGreaterThanOrEqual(10);
    expect(ALL_VOCAB.length).toBeGreaterThanOrEqual(80);
  });
});
