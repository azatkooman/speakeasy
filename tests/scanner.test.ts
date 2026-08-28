// @vitest-environment happy-dom
import { describe, it, expect, vi } from 'vitest';
import { act } from 'react';
import { renderHook } from '@testing-library/react';
import { useScanner, ScanStop } from '../utils/useScanner';

/**
 * Switch scanning.
 *
 * The least observable code in the app, serving the users least able to report
 * a problem — three real bugs turned up here in one afternoon simply because
 * someone went looking. These tests are the part of that looking that repeats.
 */

const step = { mode: 'linear' as const, rateMs: 1200, auto: false };
const rowCol = { mode: 'rowColumn' as const, rateMs: 1200, auto: false };

const stops = (spec: Array<[string, number]>, log: string[]): ScanStop[] =>
  spec.map(([id, row]) => ({ id, row, onSelect: () => log.push(id) }));

const press = (key: string) =>
  act(() => { window.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true })); });

describe('linear scanning', () => {
  it('starts on the first stop and advances through every one', () => {
    const log: string[] = [];
    const { result } = renderHook(() =>
      useScanner({ settings: step, enabled: true, stops: stops([['a', 0], ['b', 0], ['c', 1]], log) }));

    expect(result.current.focusedId).toBe('a');
    press('ArrowRight'); expect(result.current.focusedId).toBe('b');
    press('ArrowRight'); expect(result.current.focusedId).toBe('c');
  });

  it('wraps around rather than dead-ending on the last stop', () => {
    const log: string[] = [];
    const { result } = renderHook(() =>
      useScanner({ settings: step, enabled: true, stops: stops([['a', 0], ['b', 0]], log) }));

    press('ArrowRight'); press('ArrowRight');
    expect(result.current.focusedId).toBe('a');
  });

  it('selects the highlighted stop', () => {
    const log: string[] = [];
    renderHook(() => useScanner({ settings: step, enabled: true, stops: stops([['a', 0], ['b', 0]], log) }));

    press('ArrowRight');
    press(' ');
    expect(log).toEqual(['b']);
  });

  it('does nothing at all while disabled', () => {
    const log: string[] = [];
    const { result } = renderHook(() =>
      useScanner({ settings: step, enabled: false, stops: stops([['a', 0]], log) }));

    press(' ');
    expect(log).toEqual([]);
    expect(result.current.focusedId).toBeNull();
    expect(result.current.active).toBe(false);
  });

  it('ignores switch keys while a parent is typing in a field', () => {
    const log: string[] = [];
    renderHook(() => useScanner({ settings: step, enabled: true, stops: stops([['a', 0]], log) }));

    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();
    press(' ');
    expect(log).toEqual([]);
    input.remove();
  });
});

describe('row-column scanning', () => {
  it('highlights rows before cells, and groups by the row a stop declares', () => {
    const log: string[] = [];
    const { result } = renderHook(() =>
      useScanner({
        settings: rowCol, enabled: true,
        // Two rows: the second holds two stops.
        stops: stops([['a', 0], ['b', 1], ['c', 1]], log),
      }));

    expect(result.current.focusedRow).toBe(0);
    expect(result.current.focusedId).toBeNull();      // no cell highlighted yet
    press('ArrowRight');
    expect(result.current.focusedRow).toBe(1);
  });

  it('selects a single-stop row directly, with no wasted second press', () => {
    const log: string[] = [];
    renderHook(() => useScanner({ settings: rowCol, enabled: true, stops: stops([['only', 0], ['x', 1]], log) }));

    press(' ');
    expect(log).toEqual(['only']);
  });

  it('opens a second stage for a row holding more than one stop', () => {
    const log: string[] = [];
    const { result } = renderHook(() =>
      useScanner({ settings: rowCol, enabled: true, stops: stops([['a', 0], ['b', 0]], log) }));

    press(' ');
    expect(log).toEqual([]);                          // nothing spoken yet
    expect(result.current.focusedId).toBe('a');        // now inside the row
    press('ArrowRight');
    expect(result.current.focusedId).toBe('b');
    press(' ');
    expect(log).toEqual(['b']);
  });

  it('groups a rail of single-stop rows one per row, not by a column count', () => {
    // The bug this replaced: rows were floor(index / cols), so a four-item rail
    // at three columns had its items grouped with unrelated grid cells.
    const log: string[] = [];
    const { result } = renderHook(() =>
      useScanner({
        settings: rowCol, enabled: true,
        stops: stops([['rail0', 0], ['rail1', 1], ['rail2', 2], ['cell', 3]], log),
      }));

    expect(result.current.focusedRow).toBe(0);
    press(' ');
    expect(log).toEqual(['rail0']);                   // straight through, no second stage
  });
});

describe('auto scanning', () => {
  it('advances on its own timer and stops when disabled', () => {
    vi.useFakeTimers();
    const log: string[] = [];
    const auto = { mode: 'linear' as const, rateMs: 500, auto: true };
    const { result, unmount } = renderHook(() =>
      useScanner({ settings: auto, enabled: true, stops: stops([['a', 0], ['b', 0]], log) }));

    expect(result.current.focusedId).toBe('a');
    act(() => { vi.advanceTimersByTime(500); });
    expect(result.current.focusedId).toBe('b');
    unmount();
    vi.useRealTimers();
  });
});

describe('held switches', () => {
  /*
   * An external AAC switch presents as a HID keyboard, so holding it down sends
   * repeated keydowns with repeat=true — the same as resting on a keyboard key.
   * Acting on those turns one intended press into a burst of selections.
   */
  const pressRepeat = (key: string) =>
    act(() => { window.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, repeat: true })); });

  it('selects once for a press, not once per auto-repeat', () => {
    const log: string[] = [];
    renderHook(() => useScanner({ settings: step, enabled: true, stops: stops([['a', 0], ['b', 0]], log) }));

    press(' ');                                  // the real press
    for (let i = 0; i < 12; i++) pressRepeat(' '); // the switch being held
    expect(log).toEqual(['a']);
  });

  it('does not advance on auto-repeat either', () => {
    const log: string[] = [];
    const { result } = renderHook(() =>
      useScanner({ settings: step, enabled: true, stops: stops([['a', 0], ['b', 0], ['c', 0]], log) }));

    press('ArrowRight');
    expect(result.current.focusedId).toBe('b');
    for (let i = 0; i < 10; i++) pressRepeat('ArrowRight');
    expect(result.current.focusedId).toBe('b');   // still where the user left it
  });

  it('still responds to the next genuine press after a held one', () => {
    const log: string[] = [];
    renderHook(() => useScanner({ settings: step, enabled: true, stops: stops([['a', 0], ['b', 0]], log) }));

    pressRepeat(' ');       // ignored
    press(' ');             // honoured
    expect(log).toEqual(['a']);
  });
});
