import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ScanSettings } from '../types';

/**
 * Switch scanning.
 *
 * A highlight walks the screen and a switch selects whatever it lands on. This
 * is how users who cannot reliably touch a specific cell — or touch at all —
 * operate an AAC device. External AAC switches present themselves as HID
 * keyboards, so a switch press arrives as a keydown; that is why this listens
 * for keys rather than for anything switch-specific.
 *
 * Two shapes, because they suit different users:
 *
 * - `linear` steps through every stop in turn. Simple to understand, but slow:
 *   reaching stop 30 of 40 means waiting through 29 others.
 * - `rowColumn` highlights whole rows first; selecting a row then scans the
 *   stops inside it. Far fewer steps on a large grid, at the cost of a
 *   two-stage mental model. A row holding a single stop selects that stop
 *   directly rather than opening a second stage over one item.
 *
 * And two timings:
 *
 * - `auto` advances on a timer, and the switch selects. One switch, but the
 *   user must press in time with a moving highlight.
 * - step mode does not advance by itself: one switch moves, the other selects.
 *   Users who cannot time a press against a moving target need this.
 *
 * Callers pass a flat list of stops, each declaring the row it belongs to and
 * what selecting it does. That replaces an earlier design of "cells plus a
 * column count", which computed rows as `floor(index / cols)`. Two things were
 * wrong with it: the core-word rail is a single column but occupied several
 * leading indices, so its items were silently grouped into rows with unrelated
 * grid cells; and anything that was not itself a cell — the grammar badge on a
 * card — could not be reached at all, because there was no index for it.
 */

export interface ScanStop {
  /** Stable identity, used to drive the highlight. */
  id: string;
  /** Visual row. Stops sharing a row are scanned together in rowColumn. */
  row: number;
  onSelect: () => void;
}

const SELECT_KEYS = [' ', 'Enter', 'Space'];
const ADVANCE_KEYS = ['ArrowRight', 'ArrowDown', 'Tab', '1'];

interface Options {
  settings: ScanSettings;
  stops: ScanStop[];
  enabled: boolean;
}

export const useScanner = ({ settings, stops, enabled }: Options) => {
  // In rowColumn, `level` is which stage we are in.
  const [level, setLevel] = useState<'row' | 'cell'>('row');
  const [rowIndex, setRowIndex] = useState(0);
  const [stopIndex, setStopIndex] = useState(0);
  const timerRef = useRef<number | null>(null);

  /** Rows that actually hold something, in visual order. */
  const rows = useMemo(() => {
    const set = new Set(stops.map(s => s.row));
    return [...set].sort((a, b) => a - b);
  }, [stops]);

  const stopsInRow = useCallback(
    (row: number) => stops.map((s, i) => ({ s, i })).filter(e => e.s.row === row).map(e => e.i),
    [stops],
  );

  const stop = useCallback(() => {
    if (timerRef.current !== null) { clearInterval(timerRef.current); timerRef.current = null; }
  }, []);

  // Reset whenever the screen underneath changes, so the highlight never points
  // at something that no longer exists. Keyed on the stop identities rather
  // than the array, which is rebuilt on every render.
  const signature = stops.map(s => s.id).join('|');
  useEffect(() => {
    setLevel('row');
    setRowIndex(rows[0] ?? 0);
    setStopIndex(0);
  }, [signature, settings.mode]);

  const advance = useCallback(() => {
    if (stops.length === 0) return;
    if (settings.mode === 'linear') {
      setStopIndex(prev => (prev + 1) % stops.length);
      return;
    }
    // rowColumn
    if (level === 'row') {
      if (rows.length === 0) return;
      setRowIndex(prev => {
        const at = rows.indexOf(prev);
        return rows[(at + 1) % rows.length];
      });
    } else {
      const inRow = stopsInRow(rowIndex);
      if (inRow.length === 0) { setLevel('row'); return; }
      setStopIndex(prev => {
        const at = inRow.indexOf(prev);
        return inRow[(at + 1) % inRow.length];
      });
    }
  }, [settings.mode, level, rowIndex, rows, stops.length, stopsInRow]);

  const select = useCallback(() => {
    if (stops.length === 0) return;
    if (settings.mode === 'linear') {
      stops[stopIndex]?.onSelect();
      return;
    }
    if (level === 'row') {
      const inRow = stopsInRow(rowIndex);
      if (inRow.length === 0) return;
      // A row with one stop needs no second stage: selecting the row is
      // unambiguous, and making the user press again to confirm a single
      // option is a wasted press for someone who has very few.
      if (inRow.length === 1) { stops[inRow[0]]?.onSelect(); return; }
      setLevel('cell');
      setStopIndex(inRow[0]);
    } else {
      stops[stopIndex]?.onSelect();
      setLevel('row');
    }
  }, [settings.mode, level, rowIndex, stopIndex, stops, stopsInRow]);

  // Keep the highlight on something real.
  useEffect(() => {
    if (!enabled) return;
    if (settings.mode === 'linear') {
      if (stops.length && stopIndex >= stops.length) setStopIndex(0);
    } else if (level === 'row') {
      if (rows.length && !rows.includes(rowIndex)) setRowIndex(rows[0]);
    }
  }, [enabled, settings.mode, level, rowIndex, stopIndex, rows, stops.length]);

  // Auto-advance timer.
  useEffect(() => {
    stop();
    if (!enabled || !settings.auto || settings.mode === 'off') return;
    timerRef.current = window.setInterval(advance, Math.max(300, settings.rateMs));
    return stop;
  }, [enabled, settings.auto, settings.mode, settings.rateMs, advance, stop]);

  // Switch input.
  useEffect(() => {
    if (!enabled || settings.mode === 'off') return;
    const onKey = (e: KeyboardEvent) => {
      // Never hijack keys while a parent is typing.
      const el = document.activeElement;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || (el as HTMLElement).isContentEditable)) return;

      if (SELECT_KEYS.includes(e.key)) {
        e.preventDefault();
        select();
      } else if (!settings.auto && ADVANCE_KEYS.includes(e.key)) {
        e.preventDefault();
        advance();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [enabled, settings.mode, settings.auto, select, advance]);

  const active = enabled && settings.mode !== 'off';
  const showingStop = active && (settings.mode === 'linear' || level === 'cell');

  return {
    active,
    /** Stop currently highlighted, or null while a whole row is highlighted. */
    focusedId: showingStop ? (stops[stopIndex]?.id ?? null) : null,
    /** Row currently highlighted in rowColumn's first stage. */
    focusedRow: active && settings.mode === 'rowColumn' && level === 'row' ? rowIndex : null,
  };
};
