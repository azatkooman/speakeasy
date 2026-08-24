import React, { useEffect, useMemo, useState } from 'react';
import { X, Delete, CornerDownLeft, Keyboard as KeyboardIcon } from 'lucide-react';
import { TranslationKey } from '../services/translations';
import { AppLanguage } from '../types';
import { getKeyboardLayouts, SCRIPT_SWITCH_LABEL } from '../utils/keyboardLayouts';

interface KeyboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Every word the child's own vocabulary contains — the prediction source. */
  vocabulary: string[];
  onSubmit: (text: string) => void;
  /** Interface language — decides which layout opens by default. */
  language: AppLanguage;
  t: (key: TranslationKey) => string;
}

/**
 * Spelling keyboard, for children who read and write and would otherwise hit
 * the ceiling of a symbol-only board.
 *
 * Prediction comes from the child's own vocabulary rather than a bundled
 * frequency list. That is a deliberate trade: a real word list would be tens of
 * thousands of entries in each of four languages — a large download for an app
 * whose whole point is working offline — and it would suggest words this
 * particular child has never used. Their own board is already personalised, and
 * it works in every language without shipping anything.
 */

const KeyboardModal: React.FC<KeyboardModalProps> = ({ isOpen, onClose, vocabulary, onSubmit, language, t }) => {
  const [text, setText] = useState('');
  // Which of the two layouts is showing. Starts on the interface language's own.
  const [useAlternate, setUseAlternate] = useState(false);

  const { primary, alternate } = getKeyboardLayouts(language);
  const layout = useAlternate ? alternate : primary;

  // Changing the interface language returns the keyboard to that language's
  // layout. Held otherwise, so typing several foreign words in a row does not
  // mean re-pressing the script toggle for each one.
  useEffect(() => { setUseAlternate(false); }, [language]);

  // Closing discards a half-typed word rather than showing it again on reopen.
  useEffect(() => { if (!isOpen) setText(''); }, [isOpen]);

  const suggestions = useMemo(() => {
    const frag = text.trim().toLowerCase();
    if (!frag) return [];
    const seen = new Set<string>();
    const out: string[] = [];
    // Prefix matches first, then anything containing the fragment.
    for (const pass of [0, 1]) {
      for (const w of vocabulary) {
        const lower = w.toLowerCase();
        const hit = pass === 0 ? lower.startsWith(frag) : lower.includes(frag);
        if (hit && !seen.has(lower)) { seen.add(lower); out.push(w); }
        if (out.length >= 6) return out;
      }
    }
    return out;
  }, [text, vocabulary]);

  if (!isOpen) return null;

  const commit = (value: string) => {
    const v = value.trim();
    if (!v) return;
    onSubmit(v);
    setText('');
  };

  return (
    <div className="fixed inset-0 z-[95] flex items-end justify-center bg-slate-900/50 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onClose} />
      <div
        role="dialog"
        aria-label={t('keyboard.title')}
        className="relative z-10 bg-white w-full max-w-3xl rounded-t-3xl shadow-2xl overflow-hidden"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 0.75rem)' }}
      >
        <div className="flex items-center gap-3 p-4 border-b border-slate-100 bg-slate-50">
          <div className="p-2 bg-primary/10 text-primary rounded-xl"><KeyboardIcon size={20} /></div>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') commit(text); }}
            placeholder={t('keyboard.placeholder')}
            aria-label={t('keyboard.title')}
            autoFocus
            className="flex-1 min-w-0 px-4 py-3 bg-white rounded-xl border-2 border-slate-200 focus:border-primary outline-none text-lg font-semibold text-slate-900"
          />
          <button onClick={onClose} aria-label={t('modal.categories.cancel')} className="p-2 rounded-full hover:bg-slate-200 text-slate-500">
            <X size={24} />
          </button>
        </div>

        {/* Prediction row. Reserved height so the keys never jump as words
            appear and disappear under the user's finger. */}
        <div className="h-14 flex items-center gap-2 px-3 overflow-x-auto no-scrollbar border-b border-slate-100">
          {suggestions.length === 0 ? (
            <span className="text-xs font-medium text-slate-300 px-1">{t('keyboard.hint')}</span>
          ) : suggestions.map(w => (
            <button
              key={w}
              onClick={() => commit(w)}
              className="shrink-0 px-4 py-2 rounded-xl bg-primary/10 text-primary font-bold border-2 border-primary/20 hover:bg-primary/20 active:scale-95 transition-all"
            >
              {w}
            </button>
          ))}
        </div>

        <div className="p-2 sm:p-3 space-y-1.5 sm:space-y-2 bg-slate-50">
          {layout.rows.map((row, i) => (
            <div key={i} className="flex justify-center gap-1 sm:gap-1.5">
              {row.split('').map(ch => (
                <button
                  key={ch}
                  onClick={() => setText(prev => prev + ch)}
                  className="flex-1 max-w-[3rem] min-h-[44px] rounded-lg bg-white border border-slate-200 font-semibold text-slate-800 text-base sm:text-lg hover:border-primary active:scale-95 transition-all"
                >
                  {ch}
                </button>
              ))}
            </div>
          ))}
          {layout.accents.length > 0 && (
            <div className="flex justify-center gap-1 sm:gap-1.5">
              {layout.accents.map(ch => (
                <button
                  key={ch}
                  onClick={() => setText(prev => prev + ch)}
                  className="flex-1 max-w-[3rem] min-h-[44px] rounded-lg bg-white border border-slate-200 font-semibold text-slate-800 text-base sm:text-lg hover:border-primary active:scale-95 transition-all"
                >
                  {ch}
                </button>
              ))}
            </div>
          )}
          <div className="flex justify-center gap-1.5 pt-0.5">
            <button
              onClick={() => setUseAlternate(v => !v)}
              aria-pressed={useAlternate}
              aria-label={t('keyboard.script')}
              className="px-3 min-h-[44px] rounded-lg bg-white border border-slate-200 font-bold text-slate-600 text-sm hover:border-primary active:scale-95"
            >
              {SCRIPT_SWITCH_LABEL[useAlternate ? primary.script : alternate.script]}
            </button>
            <button
              onClick={() => setText(prev => prev + ' ')}
              className="flex-1 max-w-[16rem] min-h-[44px] rounded-lg bg-white border border-slate-200 font-semibold text-slate-600 hover:border-primary active:scale-95"
            >
              ␣
            </button>
            <button
              onClick={() => setText(prev => prev.slice(0, -1))}
              aria-label={t('strip.backspace')}
              className="px-4 min-h-[44px] rounded-lg bg-white border border-slate-200 text-slate-600 hover:border-primary active:scale-95 flex items-center justify-center"
            >
              <Delete size={20} />
            </button>
            <button
              onClick={() => commit(text)}
              aria-label={t('keyboard.add')}
              disabled={!text.trim()}
              className="px-4 min-h-[44px] rounded-lg bg-primary text-white font-bold disabled:bg-slate-300 active:scale-95 flex items-center justify-center gap-2"
            >
              <CornerDownLeft size={20} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KeyboardModal;
