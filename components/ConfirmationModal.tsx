
import React from 'react';
import { Trash2 } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isFolder?: boolean;
  t: (key: any) => string;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ isOpen, onClose, onConfirm, isFolder, t }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 border-4 border-white">
        <div className="p-6 flex flex-col items-center text-center space-y-4">
          <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-2 shadow-inner">
            <Trash2 size={36} strokeWidth={2.5} />
          </div>
          <h2 className="text-2xl font-black text-slate-800 leading-tight">{t('modal.confirm.delete_title')}</h2>
          <p className="text-slate-500 font-medium text-lg leading-relaxed px-2">
            {isFolder ? t('modal.confirm.delete_folder_desc') : t('modal.confirm.delete_desc')}
          </p>
        </div>
        
        <div className="grid grid-cols-2 gap-3 p-4 bg-slate-50 border-t border-slate-100">
          <button
            onClick={onClose}
            className="py-3.5 rounded-2xl font-bold text-slate-600 bg-white border-b-4 border-slate-200 hover:bg-slate-50 active:border-b-0 active:translate-y-1 transition-all"
          >
            {t('modal.confirm.cancel')}
          </button>
          <button
            onClick={onConfirm}
            className="py-3.5 rounded-2xl font-bold text-white bg-red-500 border-b-4 border-red-700 hover:bg-red-600 active:border-b-0 active:translate-y-1 transition-all flex items-center justify-center"
          >
            {t('modal.confirm.yes')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;