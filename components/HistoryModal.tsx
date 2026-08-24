
import React from 'react';
import { X, Clock, RotateCcw, Type } from 'lucide-react';
import { AACItem } from '../types';
import { HistoryEntry, HistoryWord, isLegacyWord } from '../utils/history.ts';
import Dialog from './Dialog.tsx';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  entries: HistoryEntry[];
  /** Only for legacy entries, which recorded ids and no wording. */
  library: AACItem[];
  onSelectSentence: (entry: HistoryEntry) => void;
  t: (key: any) => string;
}

const HistoryModal: React.FC<HistoryModalProps> = ({ isOpen, onClose, entries, library, onSelectSentence, t }) => {

  /*
   * Words are read from the snapshot, not resolved against the board. Only
   * legacy entries — ids with no recorded wording — still look the card up, and
   * a legacy word whose card is gone is shown as unavailable rather than
   * dropped. Dropping it silently rewrote what the sentence said.
   */
  const view = (w: HistoryWord): { label: string; imageUrl?: string; missing: boolean } => {
    if (!isLegacyWord(w)) return { label: w.label, imageUrl: w.imageUrl, missing: false };
    const live = library.find(i => i.id === w.itemId);
    if (live) return { label: live.labelKey ? t(live.labelKey) : live.label, imageUrl: live.imageUrl, missing: false };
    return { label: t('modal.history.unavailable'), imageUrl: undefined, missing: true };
  };

  const rendered = entries
    .map(entry => ({ entry, words: entry.words.map(view) }))
    .filter(r => r.words.length > 0);

  // Children of <Dialog> are evaluated before they are passed to it, so a

  // closed dialog must not render at all — its body reads state that only

  // exists while it is open.

  if (!(isOpen)) return null;


  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      label={t('modal.history.title')}
      scrimClassName="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      panelClassName="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh] border-4 border-white"
    >
        <div className="flex justify-between items-center p-5 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center space-x-2">
             <div className="p-2 bg-blue-100 text-blue-600 rounded-xl"><Clock size={24} /></div>
             <h2 className="text-2xl font-black text-slate-800">{t('modal.history.title')}</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-200 text-slate-600"><X size={24} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50">
          {rendered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                <Clock size={48} className="mb-3 opacity-20" />
                <p className="font-bold">{t('modal.history.empty')}</p>
            </div>
          ) : (
            rendered.map(({ entry, words }, idx) => (
                <button
                  key={idx}
                  onClick={() => { onSelectSentence(entry); onClose(); }}
                  className="w-full bg-white p-3 rounded-2xl border-2 border-slate-200 hover:border-primary transition-all flex items-center gap-3 text-left shadow-sm active:scale-95"
                >
                  <div className="flex -space-x-2 overflow-hidden py-1">
                      {words.slice(0, 5).map((w, i) => (
                        <div key={i} className={`w-10 h-10 rounded-full border-2 border-white relative shadow-sm overflow-hidden flex items-center justify-center ${w.missing ? 'bg-slate-100 text-slate-300' : 'bg-slate-200'}`}>
                            {w.imageUrl
                              ? <img src={w.imageUrl} className="w-full h-full object-cover" alt="" />
                              : <Type size={14} />}
                        </div>
                      ))}
                      {words.length > 5 && (
                          <div className="w-10 h-10 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500">+{words.length - 5}</div>
                      )}
                  </div>
                  <div className="flex-1 min-w-0">
                      <p className="font-bold text-slate-700 truncate text-sm">
                          {words.map(w => w.label).join(' ')}
                      </p>
                  </div>
                  <div className="p-2 text-slate-300"><RotateCcw size={16} /></div>
                </button>
            ))
          )}
        </div>
    </Dialog>
  );
};

export default HistoryModal;
