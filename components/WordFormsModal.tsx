import React from 'react';
import { X, Type } from 'lucide-react';
import { AACItem, ScanSettings } from '../types';
import { TranslationKey } from '../services/translations';
import { useScanner, ScanStop } from '../utils/useScanner';
import Dialog from './Dialog.tsx';

interface WordFormsModalProps {
  card: AACItem | null;
  baseLabel: string;
  onClose: () => void;
  /** Chosen wording — the base label or one of the card's forms. */
  onChoose: (text: string) => void;
  /** Switch-scanning settings, so this dialog is reachable by switch too. */
  scanSettings: ScanSettings;
  t: (key: TranslationKey) => string;
}

/**
 * Offers a card's alternative wordings. Reached from a badge on the card rather
 * than a long press: holding a cell already means "select" when the user has
 * chosen the dwell access method, and overloading it would break the input
 * method for the users who most depend on it.
 */
const WordFormsModal: React.FC<WordFormsModalProps> = ({ card, baseLabel, onClose, onChoose, scanSettings, t }) => {
  const forms = card?.forms || [];
  const options = React.useMemo(() => [baseLabel, ...forms], [baseLabel, forms.join('|')]);

  /**
   * This dialog runs its own scanner. The board's is disabled while it is open,
   * so without this a switch user could reach the grammar badge and then be
   * stuck in a dialog they cannot operate or dismiss — worse than not reaching
   * it at all. Close is the last stop, so there is always a way out.
   *
   * One option per row: every choice is a single word, and a second stage over
   * one item is a wasted press for someone who has very few.
   */
  const stops = React.useMemo((): ScanStop[] => [
    ...options.map((text, i) => ({
      id: `form:${i}`,
      row: i,
      onSelect: () => { onChoose(text); onClose(); },
    })),
    { id: 'form:close', row: options.length, onSelect: onClose },
  ], [options, onChoose, onClose]);

  const scanner = useScanner({ settings: scanSettings, stops, enabled: !!card });

  // Children of <Dialog> are evaluated before they are passed to it, so a

  // closed dialog must not render at all — its body reads state that only

  // exists while it is open.
  if (!card) return null;


  return (
    <Dialog
      isOpen={!!card}
      onClose={onClose}
      label={t('forms.title')}
      scrimClassName="fixed inset-0 z-[90] flex items-end sm:items-center justify-center bg-slate-900/50 backdrop-blur-sm p-0 sm:p-4"
      panelClassName="bg-white w-full max-w-sm sm:rounded-3xl rounded-t-3xl shadow-2xl overflow-hidden"
      panelStyle={{ paddingBottom: 'calc(var(--sa-bottom) + 1rem)' }}
    >
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 text-primary rounded-xl"><Type size={22} /></div>
            <h2 className="text-lg font-bold text-slate-800">{t('forms.title')}</h2>
          </div>
          <button onClick={onClose} aria-label={t('modal.categories.cancel')} className={`p-2 rounded-full hover:bg-slate-200 text-slate-500 ${scanner.focusedId === 'form:close' ? 'ring-4 ring-sky-500' : ''}`}>
            <X size={24} />
          </button>
        </div>

        <div className="p-4 grid gap-2 max-h-[60vh] overflow-y-auto">
          {options.map((text, i) => (
            <button
              key={`${text}-${i}`}
              type="button"
              onClick={() => { onChoose(text); onClose(); }}
              className={`w-full text-left px-4 py-3.5 rounded-2xl border-2 font-semibold text-slate-800 hover:border-primary hover:bg-primary/5 active:scale-[0.98] transition-all focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary ${scanner.focusedId === `form:${i}` ? 'border-sky-500 ring-4 ring-sky-500' : 'border-slate-200'}`}
            >
              {text}
            </button>
          ))}
        </div>
    </Dialog>
  );
};

export default WordFormsModal;
