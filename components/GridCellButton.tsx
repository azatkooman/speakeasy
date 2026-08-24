import React from 'react';
import { SelectionMode } from '../types';
import { useSelectable } from '../utils/useSelectable';

interface GridCellButtonProps {
  onActivate: () => void;
  selectionMode: SelectionMode;
  dwellMs: number;
  /** Armed by auditory preview: spoken once, waiting for the confirming press. */
  isPreviewArmed?: boolean;
  /** Highlighted by the scanner. */
  isScanFocused?: boolean;
  className?: string;
  ariaLabel?: string;
  /** Styling hook for the visual shells — see the [data-part] rules in index.css. */
  dataPart?: string;
  children: React.ReactNode;
}

/**
 * One selectable cell. Every card and rail button goes through here so all
 * three access methods, the auditory-preview cue and the scanner highlight
 * behave identically across the board — rather than each call site
 * re-implementing onClick and quietly diverging.
 *
 * The caller must supply a position class (`absolute inset-0` for a grid cell,
 * `relative` for a rail button): the dwell fill is positioned against this
 * element. This used to hardcode `relative` here, which silently beat the
 * `absolute inset-0` that callers pass — Tailwind emits `relative` after
 * `absolute`, so class order in the attribute does not decide it. The effect
 * was that every grid card sat in flow and its artwork set the cell's height,
 * making cards 14px taller than the folders beside them in the same row.
 */
const GridCellButton: React.FC<GridCellButtonProps> = ({
  onActivate,
  selectionMode,
  dwellMs,
  isPreviewArmed,
  isScanFocused,
  className = '',
  ariaLabel,
  dataPart,
  children,
}) => {
  const { handlers, dwellProgress } = useSelectable({ mode: selectionMode, dwellMs, onActivate });

  return (
    <button
      type="button"
      aria-label={ariaLabel}
      data-part={dataPart}
      {...handlers}
      className={`
        cursor-pointer text-left
        focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary focus-visible:ring-offset-2
        ${selectionMode === 'dwell' ? '' : 'active:translate-y-[3px] active:shadow-none'}
        ${isPreviewArmed ? 'ring-4 ring-amber-400 ring-offset-2 z-20' : ''}
        ${isScanFocused ? 'ring-4 ring-sky-500 ring-offset-2 z-30' : ''}
        ${className}
      `}
    >
      {children}

      {/* Dwell affordance: fills over dwellMs so the user can see the hold
          registering, and see that lifting early cancelled it. */}
      {dwellProgress > 0 && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute bottom-0 left-0 h-1.5 w-full bg-primary/80 rounded-full origin-left"
          style={{ animation: `dwellFill ${dwellMs}ms linear forwards` }}
        />
      )}
    </button>
  );
};

export default GridCellButton;
