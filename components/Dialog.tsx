import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useSpeakEasy } from '../contexts/SpeakEasyContext.tsx';

interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  /** Accessible name for the dialog. Required — an unnamed dialog is announced as nothing. */
  label: string;
  /** Classes for the panel itself. The scrim and centring are handled here. */
  panelClassName?: string;
  /** Classes for the scrim/positioning layer, for z-index and placement. */
  scrimClassName?: string;
  /** Inline styles for the panel — safe-area padding on bottom sheets, mostly. */
  panelStyle?: React.CSSProperties;
  /** Escape and scrim clicks close by default; a destructive confirm may not want that. */
  dismissible?: boolean;
  children: React.ReactNode;
}

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),' +
  'textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

/**
 * How many dialogs are currently open. Only the outermost one may make the app
 * behind it inert — otherwise closing a nested dialog would wake the background
 * up while its parent was still showing.
 */
let openCount = 0;

/**
 * One accessible dialog for the whole app.
 *
 * Every modal here was a plain <div> over a scrim: no role, no accessible name,
 * no focus handling, no Escape, and nothing stopping Tab from walking straight
 * out into the board behind it. A screen-reader user got no announcement that
 * anything had opened, and a keyboard user could focus cards they could not see.
 *
 * What this provides:
 *  - role="dialog" and aria-modal, named by `label`
 *  - focus moved in on open and returned to the trigger on close, so a keyboard
 *    user is not dropped back at the top of the document
 *  - Tab and Shift+Tab cycling inside the panel
 *  - Escape to close
 *  - the app behind it marked inert and aria-hidden
 *
 * Rendered through a portal to document.body, which is what makes inertness
 * possible: the dialog has to sit outside the subtree being made inert. The
 * portal wrapper carries `data-shell` so the visual shell's tokens — radii,
 * fills, typeface — still apply to dialog content that no longer descends from
 * the shell element.
 */
const Dialog: React.FC<DialogProps> = ({
  isOpen,
  onClose,
  label,
  panelClassName = 'bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden',
  scrimClassName = 'fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4',
  panelStyle,
  dismissible = true,
  children,
}) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreFocusTo = useRef<HTMLElement | null>(null);
  const { settings } = useSpeakEasy();

  // Focus in on open, back to the trigger on close.
  useEffect(() => {
    if (!isOpen) return;
    restoreFocusTo.current = document.activeElement as HTMLElement | null;

    const panel = panelRef.current;
    // A frame's grace: children that autofocus should win over this.
    const id = window.setTimeout(() => {
      if (!panel) return;
      if (panel.contains(document.activeElement)) return;
      const first = panel.querySelector<HTMLElement>(FOCUSABLE);
      (first ?? panel).focus();
    }, 0);

    return () => {
      window.clearTimeout(id);
      const target = restoreFocusTo.current;
      if (!target) return;
      /*
       * Deferred by a tick. This cleanup runs during React's commit for the
       * update that closed the dialog, and focusing then lands before the
       * surrounding tree has finished re-rendering — the trigger ends up
       * detached and focus falls back to <body>, which drops a keyboard user at
       * the top of the document. Restoring after the commit puts them back on
       * the control they opened.
       *
       * Still guarded: a dialog that deleted the thing that opened it has
       * nowhere to go back to.
       */
      window.setTimeout(() => {
        if (document.contains(target)) target.focus();
      }, 0);
    };
  }, [isOpen]);

  // Inertness for everything behind, ref-counted so nested dialogs behave.
  useEffect(() => {
    if (!isOpen) return;
    const root = document.querySelector<HTMLElement>('[data-shell]');
    openCount += 1;
    if (root && openCount === 1) {
      root.setAttribute('inert', '');
      root.setAttribute('aria-hidden', 'true');
    }
    return () => {
      openCount -= 1;
      if (root && openCount === 0) {
        root.removeAttribute('inert');
        root.removeAttribute('aria-hidden');
      }
    };
  }, [isOpen]);

  // Escape, and Tab cycling inside the panel.
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && dismissible) {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== 'Tab') return;
      const panel = panelRef.current;
      if (!panel) return;
      const focusable = [...panel.querySelectorAll<HTMLElement>(FOCUSABLE)]
        .filter(el => el.offsetParent !== null || el === document.activeElement);
      if (focusable.length === 0) { e.preventDefault(); return; }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      else if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    };
    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, [isOpen, dismissible, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div data-shell={settings.shell || 'youngLearner'} className="font-sans">
      <div className={scrimClassName}>
        {/* The scrim is a sibling of the panel, not its parent, so a click
            inside the panel cannot bubble out and dismiss it. */}
        {dismissible && (
          <div className="absolute inset-0" aria-hidden="true" onClick={onClose} />
        )}
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-label={label}
          tabIndex={-1}
          className={`relative z-10 outline-none ${panelClassName}`}
          style={panelStyle}
        >
          {children}
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default Dialog;
