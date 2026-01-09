import React from 'react';
import { X, Pencil, FolderInput, Trash2, Image as ImageIcon, Folder } from 'lucide-react';
import { AACItem, Category } from '../types';
import { TranslationKey } from '../services/translations';

interface EditOptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: AACItem | Category | null;
  type: 'card' | 'folder';
  onEdit: () => void;
  onMove: () => void;
  onDelete: () => void;
  t: (key: TranslationKey) => string;
}

const EditOptionsModal: React.FC<EditOptionsModalProps> = ({ 
  isOpen, 
  onClose, 
  item, 
  type,
  onEdit, 
  onMove, 
  onDelete,
  t 
}) => {
  if (!isOpen || !item) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-slate-900/40 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-200">
      {/* Click outside to close */}
      <div className="absolute inset-0" onClick={onClose} />
      
      <div 
        className="bg-white w-full max-w-sm sm:rounded-3xl rounded-t-3xl shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-bottom-10 duration-200 relative z-10 border-t-4 sm:border-4 border-white"
        style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}
      >
        
        {/* Header with Preview */}
        <div className="p-5 border-b border-slate-100 bg-slate-50 flex items-center gap-4">
             <div className="w-12 h-12 rounded-xl bg-white border-2 border-slate-200 shadow-sm overflow-hidden flex-shrink-0 flex items-center justify-center">
                 {type === 'card' ? (
                     <img src={(item as AACItem).imageUrl} className="w-full h-full object-cover" alt="" />
                 ) : (
                     <Folder size={24} className="text-slate-400" />
                 )}
             </div>
             <div className="flex-1 min-w-0">
                 <h2 className="text-lg font-black text-slate-800 truncate">{item.label}</h2>
                 <p className="text-xs text-slate-500 font-bold uppercase">{type === 'card' ? t('modal.create.title_edit') : t('folder.edit')}</p>
             </div>
             <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-200 text-slate-400">
                <X size={24} />
             </button>
        </div>

        {/* Actions Grid */}
        <div className="p-4 grid gap-3">
            <button 
                onClick={() => { onEdit(); onClose(); }}
                className="flex items-center gap-4 p-4 rounded-2xl border-2 border-slate-100 hover:border-blue-200 hover:bg-blue-50 transition-all group text-left"
            >
                <div className="p-3 bg-blue-100 text-blue-600 rounded-xl group-hover:scale-110 transition-transform">
                    <Pencil size={20} />
                </div>
                <div>
                    <span className="block font-bold text-slate-700">{type === 'card' ? t('modal.create.title_edit') : t('folder.edit')}</span>
                    <span className="text-xs text-slate-400">{type === 'card' ? t('edit_options.card_desc') : t('edit_options.folder_desc')}</span>
                </div>
            </button>

            <button 
                onClick={() => { onMove(); onClose(); }}
                className="flex items-center gap-4 p-4 rounded-2xl border-2 border-slate-100 hover:border-amber-200 hover:bg-amber-50 transition-all group text-left"
            >
                <div className="p-3 bg-amber-100 text-amber-600 rounded-xl group-hover:scale-110 transition-transform">
                    <FolderInput size={20} />
                </div>
                <div>
                    <span className="block font-bold text-slate-700">{t('move.title')}</span>
                    <span className="text-xs text-slate-400">{t('edit_options.move_desc')}</span>
                </div>
            </button>

            <button 
                onClick={() => { onDelete(); onClose(); }}
                className="flex items-center gap-4 p-4 rounded-2xl border-2 border-slate-100 hover:border-red-200 hover:bg-red-50 transition-all group text-left"
            >
                <div className="p-3 bg-red-100 text-red-600 rounded-xl group-hover:scale-110 transition-transform">
                    <Trash2 size={20} />
                </div>
                <div>
                    <span className="block font-bold text-slate-700">{t('modal.confirm.delete_title')}</span>
                    <span className="text-xs text-slate-400">{t('edit_options.delete_desc')}</span>
                </div>
            </button>
        </div>
      </div>
    </div>
  );
};

export default EditOptionsModal;