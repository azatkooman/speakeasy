import React from 'react';
import { X, Image as ImageIcon, FolderPlus, Plus, Link } from 'lucide-react';
import { TranslationKey } from '../services/translations';

interface CreateSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCard: () => void;
  onSelectFolder: () => void;
  onSelectLink: () => void;
  t: (key: TranslationKey) => string;
}

const CreateSelectionModal: React.FC<CreateSelectionModalProps> = ({ 
  isOpen, 
  onClose, 
  onSelectCard, 
  onSelectFolder, 
  onSelectLink,
  t 
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-slate-900/40 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-200">
      {/* Click outside to close */}
      <div className="absolute inset-0" onClick={onClose} />
      
      <div 
        className="bg-white w-full max-w-sm sm:rounded-3xl rounded-t-3xl shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-bottom-10 duration-200 relative z-10 border-t-4 sm:border-4 border-white"
        style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}
      >
        
        {/* Header */}
        <div className="p-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
             <div className="flex items-center gap-3">
                 <div className="p-2 bg-primary/10 text-primary rounded-xl">
                    <Plus size={24} strokeWidth={3} />
                 </div>
                 <h2 className="text-xl font-black text-slate-800">{t('create.menu_title')}</h2>
             </div>
             <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-200 text-slate-400">
                <X size={24} />
             </button>
        </div>

        {/* Actions Grid */}
        <div className="p-4 grid gap-3">
            <button 
                onClick={() => { onSelectCard(); onClose(); }}
                className="flex items-center gap-4 p-4 rounded-2xl border-2 border-slate-100 hover:border-primary/50 hover:bg-primary/5 transition-all group text-left active:scale-[0.98]"
            >
                <div className="p-4 bg-primary text-white rounded-2xl shadow-md group-hover:scale-110 transition-transform">
                    <ImageIcon size={28} />
                </div>
                <div>
                    <span className="block font-black text-lg text-slate-800">{t('modal.create.title_new')}</span>
                    <span className="text-sm font-medium text-slate-500">{t('create.menu_card_desc')}</span>
                </div>
            </button>

            <button 
                onClick={() => { onSelectFolder(); onClose(); }}
                className="flex items-center gap-4 p-4 rounded-2xl border-2 border-slate-100 hover:border-amber-400 hover:bg-amber-50 transition-all group text-left active:scale-[0.98]"
            >
                <div className="p-4 bg-amber-400 text-white rounded-2xl shadow-md group-hover:scale-110 transition-transform">
                    <FolderPlus size={28} />
                </div>
                <div>
                    <span className="block font-black text-lg text-slate-800">{t('app.new_folder')}</span>
                    <span className="text-sm font-medium text-slate-500">{t('create.menu_folder_desc')}</span>
                </div>
            </button>

            <button 
                onClick={() => { onSelectLink(); onClose(); }}
                className="flex items-center gap-4 p-4 rounded-2xl border-2 border-slate-100 hover:border-purple-400 hover:bg-purple-50 transition-all group text-left active:scale-[0.98]"
            >
                <div className="p-4 bg-purple-500 text-white rounded-2xl shadow-md group-hover:scale-110 transition-transform">
                    <Link size={28} />
                </div>
                <div>
                    <span className="block font-black text-lg text-slate-800">{t('link.title')}</span>
                    <span className="text-sm font-medium text-slate-500">{t('create.menu_link_desc')}</span>
                </div>
            </button>
        </div>
      </div>
    </div>
  );
};

export default CreateSelectionModal;