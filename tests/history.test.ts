import { describe, it, expect, beforeEach } from 'vitest';
import { installMemoryStorage } from './memory-storage';
import { readHistory, pushHistory, clearHistory, isLegacyWord, HistoryEntry } from '../utils/history';

/**
 * History is a record of things a person said. It should not change afterwards
 * because their board did.
 */
describe('utterances are stored as immutable snapshots', () => {
  beforeEach(() => { installMemoryStorage(); });

  const said = (words: Array<[string, string, string?]>): HistoryEntry => ({
    words: words.map(([text, label, itemId]) => ({ text, label, itemId })),
    language: 'en',
    at: 1000,
  });

  it('round-trips the exact wording, not the card it came from', () => {
    pushHistory('p1', said([['I want', 'I want', 'card1'], ['juice', 'juice', 'card2']]));

    const [entry] = readHistory('p1');
    expect(entry.words.map(w => w.text)).toEqual(['I want', 'juice']);
    expect(entry.words.map(w => w.label)).toEqual(['I want', 'juice']);
    expect(entry.language).toBe('en');
  });

  it('keeps a typed word, which has no card to resolve against', () => {
    // The bug: typed words got a synthetic `typed:` id that never enters the
    // library, so history stored an id that could never be found again.
    pushHistory('p1', { words: [{ text: 'grandma', label: 'grandma' }], at: 1 });

    const [entry] = readHistory('p1');
    expect(entry.words[0].text).toBe('grandma');
    expect(entry.words[0].itemId).toBeUndefined();
  });

  it('survives the card being renamed or deleted, because it does not consult it', () => {
    pushHistory('p1', said([['biscuit', 'biscuit', 'card1']]));
    // ...board changes, card1 renamed to "cookie" or removed entirely...
    const [entry] = readHistory('p1');
    expect(entry.words[0].label).toBe('biscuit');
  });

  it('records the chosen word form rather than the base label', () => {
    pushHistory('p1', said([['wanted', 'wanted', 'card1']]));
    expect(readHistory('p1')[0].words[0].text).toBe('wanted');
  });

  it('keeps newest first and caps the buffer', () => {
    for (let n = 0; n < 20; n++) pushHistory('p1', said([[`w${n}`, `w${n}`]]));
    const all = readHistory('p1');
    expect(all.length).toBe(15);
    expect(all[0].words[0].text).toBe('w19');
  });

  it('ignores an empty utterance', () => {
    pushHistory('p1', { words: [] });
    expect(readHistory('p1')).toEqual([]);
  });
});

describe('history stays per profile', () => {
  beforeEach(() => { installMemoryStorage(); });

  it('does not leak one child’s sentences to another', () => {
    pushHistory('pA', { words: [{ text: 'a', label: 'a' }] });
    pushHistory('pB', { words: [{ text: 'b', label: 'b' }] });

    expect(readHistory('pA').map(e => e.words[0].text)).toEqual(['a']);
    expect(readHistory('pB').map(e => e.words[0].text)).toEqual(['b']);
  });

  it('clearing one profile leaves the other alone', () => {
    pushHistory('pA', { words: [{ text: 'a', label: 'a' }] });
    pushHistory('pB', { words: [{ text: 'b', label: 'b' }] });
    clearHistory('pA');

    expect(readHistory('pA')).toEqual([]);
    expect(readHistory('pB')).toHaveLength(1);
  });
});

describe('entries written before snapshots existed', () => {
  beforeEach(() => { installMemoryStorage(); });

  it('reads the legacy id-only shape without discarding it', () => {
    localStorage.setItem('aac_history_ids:p1', JSON.stringify([['c1', 'c2']]));

    const [entry] = readHistory('p1');
    expect(entry.words.map(w => w.itemId)).toEqual(['c1', 'c2']);
    expect(entry.words.every(isLegacyWord)).toBe(true);
  });

  it('is distinguishable from a snapshot, so only it falls back to the library', () => {
    expect(isLegacyWord({ text: '', label: '', itemId: 'c1' })).toBe(true);
    expect(isLegacyWord({ text: 'juice', label: 'juice', itemId: 'c1' })).toBe(false);
    expect(isLegacyWord({ text: 'typed', label: 'typed' })).toBe(false);
  });

  it('adopts the old global key onto the first profile that asks', () => {
    localStorage.setItem('aac_history_ids', JSON.stringify([['old1']]));

    expect(readHistory('p1')[0].words[0].itemId).toBe('old1');
    expect(localStorage.getItem('aac_history_ids')).toBeNull();
  });

  it('reads a mixed store, since an install upgrades in place', () => {
    localStorage.setItem('aac_history_ids:p1', JSON.stringify([
      { words: [{ text: 'new', label: 'new' }], at: 2 },
      ['c1'],
    ]));

    const all = readHistory('p1');
    expect(all).toHaveLength(2);
    expect(all[0].words[0].text).toBe('new');
    expect(isLegacyWord(all[1].words[0])).toBe(true);
  });

  it('survives corrupt storage rather than throwing', () => {
    localStorage.setItem('aac_history_ids:p1', 'not json');
    expect(readHistory('p1')).toEqual([]);
  });
});
