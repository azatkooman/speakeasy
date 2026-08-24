import { useEffect, useState } from 'react';

/**
 * Smallest a cell may get before its label clips and its symbol collapses.
 * Below roughly this width a card stops being readable, which for a
 * communication board means it stops working.
 */
export const MIN_CELL_PX = 78;

/**
 * How many columns to actually render for a board.
 *
 * Phase 04a fixed the column count to the board's own `gridCols` so that
 * rotating a tablet could no longer relocate every word — a child navigating by
 * muscle memory loses the board when that happens. But applying a tablet's six
 * columns to a phone gives ~60px cells: labels clip, folder icons collapse, and
 * the board is unusable.
 *
 * The distinction that matters is *when* positions move. A layout that differs
 * between a phone and a tablet is fine — a child using one device sees one
 * stable arrangement. A layout that changes on the same device, mid-session, is
 * the thing that breaks people.
 *
 * So the column count is derived from the SMALLER viewport dimension. That is
 * the same in portrait and landscape, so rotation cannot change it, while a
 * phone still gets a column count it can actually show. Slots are untouched:
 * a card keeps its slot, only the width the grid wraps at differs per device.
 */
export const useRenderedCols = (boardCols: number, reservedPx = 0): number => {
  const compute = () => {
    if (typeof window === 'undefined') return boardCols;
    // Rotation-invariant: the shorter edge of the device, not of the viewport.
    const shortEdge = Math.min(window.innerWidth, window.innerHeight);
    const available = shortEdge - reservedPx;
    const fits = Math.floor(available / MIN_CELL_PX);
    return Math.max(1, Math.min(boardCols, fits));
  };

  const [cols, setCols] = useState(compute);

  useEffect(() => {
    const onResize = () => setCols(compute());
    onResize();
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boardCols, reservedPx]);

  return cols;
};
