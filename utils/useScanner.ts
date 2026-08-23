import { useCallback, useEffect, useRef, useState } from 'react';
import { ScanSettings } from '../types';

/**
 * Switch scanning.
 *
 * A highlight walks the board and a switch selects whatever it lands on. This
 * is how users who cannot reliably touch a specific cell — or touch at all —
 * operate an AAC device. External AAC switches present themselves as HID
 * keyboards, so a switch press arrives as a keydown; that is why this listens
 * for keys rather than for anything switch-specific.
 *
 * Two shapes, because they suit different users:
 *
 * - `linear` steps through every cell in turn. Simple to understand, but slow:
 *   reaching cell 30 of 40 means waiting through 29 others.
 * - `rowColumn` highlights whole rows first; selecting a row then scans the
 *   cells inside it. Far fewer steps on a large grid, at the cost of a
 *   two-stage mental model.
 *
 * And two timings:
 *
 * - `auto` advances on a timer, and the switch selects. One switch, but the
 *   user must press in time with a moving highlight.
 * - step mode does not advance by itself: one switch moves, the other selects.
 *   Users who cannot time a press against a moving target need this.
 */

const SELECT_KEYS = [' ', 'Enter', 'Space'];
const ADVANCE_KEYS = ['ArrowRight', 'ArrowDown', 'Tab', '1'];

interface Options {
  settings: ScanSettings;
  /** Total cells, laid out row-major. */
  count: number;
  cols: number;
  enabled: boolean;
  /** Cells that hold nothing — skipped, so the scan never dwells on a gap. */
  isEmpty: (index: number) => boolean;
  onSelect: (index: number) => void;
}

export const useScanner = ({ settings, count, cols, enabled, isEmpty, onSelect }: Options) => {
  // In rowColumn, `level` is which stage we are in.
  const [level, setLevel] = useState<'row' | 'cell'>('row');
  const [rowIndex, setRowIndex] = useState(0);
  const [cellIndex, setCellIndex] = useState(0);
  const timerRef = useRef<number | null>(null);

  const rows = Math.max(1, Math.ceil(count / cols));
  const rowCount = rows;

  /** Row indices that contain at least one occupied cell. */
  const usableRows = useCallback(() => {
    const out: number[] = [];
    for (let r = 0; r < rowCount; r++) {
      let has = false;
      for (let c = 0; c < cols; c++) {
        const i = r * cols + c;
        if (i < count && !isEmpty(i)) { has = true; break; }
      }
      if (has) out.push(r);
    }
    return out;
  }, [rowCount, cols, count, isEmpty]);

  /** Occupied cell indices, optionally restricted to one row. */
  const usableCells = useCallback((row?: number) => {
    const out: number[] = [];
    const from = row === undefined ? 0 : row * cols;
    const to = row === undefined ? count : Math.min(count, from + cols);
    for (let i = from; i < to; i++) if (!isEmpty(i)) out.push(i);
    return out;
  }, [cols, count, isEmpty]);

  const stop = useCallback(() => {
    if (timerRef.current !== null) { clearInterval(timerRef.current); timerRef.current = null; }
  }, []);

  // Reset whenever the board underneath changes, so the highlight never points
  // at a cell that no longer exists.
  useEffect(() => {
    setLevel('row');
    setRowIndex(0);
    setCellIndex(0);
  }, [count, cols, settings.mode]);

  const advance = useCallback(() => {
    if (settings.mode === 'linear') {
      const cells = usableCells();
      if (cells.length === 0) return;
      setCellIndex(prev => {
        const at = cells.indexOf(prev);
        return cells[(at + 1) % cells.length];
      });
      return;
    }
    // rowColumn
    if (level === 'row') {
      const rowsWithContent = usableRows();
      if (rowsWithContent.length === 0) return;
      setRowIndex(prev => {
        const at = rowsWithContent.indexOf(prev);
        return rowsWithContent[(at + 1) % rowsWithContent.length];
      });
    } else {
      const cells = usableCells(rowIndex);
      if (cells.length === 0) { setLevel('row'); return; }
      setCellIndex(prev => {
        const at = cells.indexOf(prev);
        return cells[(at + 1) % cells.length];
      });
    }
  }, [settings.mode, level, rowIndex, usableCells, usableRows]);

  const select = useCallback(() => {
    if (settings.mode === 'linear') {
      onSelect(cellIndex);
      return;
    }
    if (level === 'row') {
      const cells = usableCells(rowIndex);
      if (cells.length === 0) return;
      setLevel('cell');
      setCellIndex(cells[0]);
    } else {
      onSelect(cellIndex);
      setLevel('row');
    }
  }, [settings.mode, level, cellIndex, rowIndex, usableCells, onSelect]);

  // Initialise the highlight onto something real.
  useEffect(() => {
    if (!enabled) return;
    if (settings.mode === 'linear') {
      const cells = usableCells();
      if (cells.length && isEmpty(cellIndex)) setCellIndex(cells[0]);
    } else if (level === 'row') {
      const rws = usableRows();
      if (rws.length && !rws.includes(rowIndex)) setRowIndex(rws[0]);
    }
  }, [enabled, settings.mode, level, rowIndex, cellIndex, usableCells, usableRows, isEmpty]);

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

  return {
    active,
    /** Cell currently highlighted, or null when a whole row is highlighted. */
    focusedCell: active && (settings.mode === 'linear' || level === 'cell') ? cellIndex : null,
    /** Row currently highlighted in rowColumn's first stage. */
    focusedRow: active && settings.mode === 'rowColumn' && level === 'row' ? rowIndex : null,
  };
};
