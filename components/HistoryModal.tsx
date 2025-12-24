import React from 'react';
import { X, Clock, RotateCcw } from 'lucide-react';
import { AACItem } from '../types';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  historyIds: string[][];
  library: AACItem[];
  onSelectSentence: (items: AACItem[]) => void;
  t: (key: any) => string;
}

const HistoryModal: React.FC<HistoryModalProps> = ({ isOpen, onClose, historyIds, library, onSelectSentence, t }) => {
  if (!isOpen) return null;

  // Map IDs to actual items from library. If an item was deleted, it will be missing here.
  const hydratedHistory = historyIds
    .map(ids => ids.map(id => library.find(item => item.id === id)).filter((item): item is AACItem => !!item))
    .filter(sentence => sentence.length > 0);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh] border-4 border-white">
        <div className="flex justify-between items-center p-5 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center space-x-2">
             <div className="p-2 bg-blue-100 text-blue-600 rounded-xl"><Clock size={24} /></div>
             <h2 className="text-2xl font-black text-slate-800">{t('modal.history.title')}</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-200 text-slate-600"><X size={24} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50">
          {hydratedHistory.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                <Clock size={48} className="mb-3 opacity-20" />
                <p className="font-bold">{t('modal.history.empty')}</p>
            </div>
          ) : (
            hydratedHistory.map((sentence, idx) => (
                <button
                  key={idx}
                  onClick={() => { onSelectSentence(sentence); onClose(); }}
                  className="w-full bg-white p-3 rounded-2xl border-2 border-slate-200 hover:border-primary transition-all flex items-center gap-3 text-left shadow-sm active:scale-95"
                >
                  <div className="flex -space-x-2 overflow-hidden py-1">
                      {sentence.slice(0, 5).map((item, i) => (
                        <div key={i} className="w-10 h-10 rounded-full border-2 border-white bg-slate-200 relative shadow-sm overflow-hidden">
                            <img src={item.imageUrl} className="w-full h-full object-cover" alt="" />
                        </div>
                      ))}
                      {sentence.length > 5 && (
                          <div className="w-10 h-10 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500">+{sentence.length - 5}</div>
                      )}
                  </div>
                  <div className="flex-1 min-w-0">
                      <p className="font-bold text-slate-700 truncate text-sm">
                          {sentence.map(i => i.label).join(' ')}
                      </p>
                  </div>
                  <div className="p-2 text-slate-300"><RotateCcw size={16} /></div>
                </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default HistoryModal;