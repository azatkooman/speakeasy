import { useCallback, useEffect, useRef, useState } from 'react';
import { SelectionMode } from '../types';

export const DEFAULT_DWELL_MS = 600;

interface Options {
  mode: SelectionMode;
  dwellMs: number;
  onActivate: () => void;
  disabled?: boolean;
}

/**
 * Turns a press into a selection according to the user's chosen access method.
 *
 * Every cell in the app routes through this so the three modes behave
 * identically everywhere, and so a card cannot accidentally keep plain
 * `onClick` semantics while the rest of the board honours dwell.
 *
 * Pointer events rather than mouse/touch pairs: they cover touch, mouse, pen
 * and stylus in one path, and `setPointerCapture` is what makes "slide off to
 * cancel" reliable — without it a finger leaving the element mid-press stops
 * generating events on it and the cancel never fires.
 */
export const useSelectable = ({ mode, dwellMs, onActivate, disabled }: Options) => {
  const timerRef = useRef<number | null>(null);
  const firedRef = useRef(false);
  const [dwellProgress, setDwellProgress] = useState(0);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setDwellProgress(0);
  }, []);

  useEffect(() => clearTimer, [clearTimer]);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (disabled) return;
    firedRef.current = false;
    // Keep receiving events even if the finger drifts outside the element.
    try { (e.currentTarget as Element).setPointerCapture(e.pointerId); } catch { /* not critical */ }

    if (mode === 'press') {
      firedRef.current = true;
      onActivate();
      return;
    }
    if (mode === 'dwell') {
      setDwellProgress(1);
      timerRef.current = window.setTimeout(() => {
        firedRef.current = true;
        timerRef.current = null;
        setDwellProgress(0);
        onActivate();
      }, dwellMs);
    }
  }, [disabled, mode, dwellMs, onActivate]);

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    if (disabled) return;
    const wasDwelling = timerRef.current !== null;
    clearTimer();
    if (mode !== 'release') return;
    if (firedRef.current || wasDwelling) return;
    // Only count as a selection if the lift happened over the cell. Compared
    // against the element's own rect rather than document.elementFromPoint():
    // hit-testing is defeated by any overlay sitting on top, and returns null
    // for points it considers outside the visual viewport.
    const rect = (e.currentTarget as Element).getBoundingClientRect();
    const inside =
      e.clientX >= rect.left && e.clientX <= rect.right &&
      e.clientY >= rect.top  && e.clientY <= rect.bottom;
    if (inside) onActivate();
  }, [disabled, mode, clearTimer, onActivate]);

  const onPointerCancel = useCallback(() => clearTimer(), [clearTimer]);

  /**
   * Keyboard and assistive tech dispatch a plain click with no pointer events.
   * Those must always activate, whatever the pointer mode is, or the board
   * becomes unreachable by keyboard, switch access and screen reader.
   */
  const onClick = useCallback((e: React.MouseEvent) => {
    if (disabled) return;
    if (e.detail !== 0) return; // a real pointer-driven click; already handled
    onActivate();
  }, [disabled, onActivate]);

  return {
    handlers: { onPointerDown, onPointerUp, onPointerCancel, onClick },
    /** 1 while a dwell is counting down, for a progress affordance. */
    dwellProgress,
    dwellMs,
  };
};
