import React, { useMemo } from 'react';
import { X, Folder, Home, ChevronRight, Check } from 'lucide-react';
import { AACItem, Category } from '../types';
import { ROOT_FOLDER } from '../services/storage';
import { TranslationKey } from '../services/translations';

interface MoveItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemToMove: { item: AACItem | Category, type: 'card' | 'folder' } | null;
  categories: Category[];
  onMove: (targetFolderId: string) => void;
  t: (key: TranslationKey) => string;
}

const MoveItemModal: React.FC<MoveItemModalProps> = ({ isOpen, onClose, itemToMove, categories, onMove, t }) => {
  if (!isOpen || !itemToMove) return null;

  const { item, type } = itemToMove;

  // Determine current parent ID for highlighting
  const currentParentId = type === 'card' 
    ? (item as AACItem).category 
    : (item as Category).parentId || ROOT_FOLDER;

  // Helper to check if a folder is a descendant of the folder being moved (to prevent circular nesting)
  const isDescendant = (potentialParentId: string, movingFolderId: string): boolean => {
    if (potentialParentId === movingFolderId) return true;
    if (potentialParentId === ROOT_FOLDER) return false;
    
    const parent = categories.find(c => c.id === potentialParentId);
    if (!parent) return false; // Should not happen
    if (parent.parentId === movingFolderId) return true;
    if (!parent.parentId || parent.parentId === ROOT_FOLDER) return false;
    
    return isDescendant(parent.parentId, movingFolderId);
  };

  // Filter valid destinations
  const validDestinations = useMemo(() => {
    const dests: { id: string; label: string; depth: number }[] = [];
    
    // Always add Root/Home
    dests.push({ id: ROOT_FOLDER, label: t('move.home'), depth: 0 });

    // Recursive function to build tree
    const addChildren = (parentId: string, depth: number) => {
        const children = categories
            .filter(c => (c.parentId || ROOT_FOLDER) === parentId)
            .sort((a, b) => (a.order || 0) - (b.order || 0));

        children.forEach(child => {
            // If we are moving a folder, we cannot move it into itself or its children
            if (type === 'folder') {
                if (child.id === item.id) return; // Can't move into self
                if (isDescendant(child.id, item.id)) return; // Can't move into children
            }
            
            dests.push({ id: child.id, label: child.label, depth });
            addChildren(child.id, depth + 1);
        });
    };

    addChildren(ROOT_FOLDER, 1);
    return dests;
  }, [categories, item, type, t]);

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh] border-4 border-white">
        
        <div className="flex justify-between items-center p-5 border-b border-slate-100 bg-slate-50">
          <div>
            <h2 className="text-xl font-black text-slate-800">{t('move.title')}</h2>
            <p className="text-xs text-slate-500 font-bold truncate max-w-[200px]">
                {t('move.moving')} <span className="text-primary">{item.label}</span>
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-200 text-slate-600 transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-slate-50/50">
           <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 px-2">{t('move.destination')}</p>
           
           {validDestinations.map((dest) => {
               const isCurrent = dest.id === currentParentId;
               return (
                   <button
                        key={dest.id}
                        onClick={() => !isCurrent && onMove(dest.id)}
                        disabled={isCurrent}
                        className={`
                            w-full flex items-center text-left p-3 rounded-xl transition-all border-2
                            ${isCurrent 
                                ? 'bg-primary/5 border-primary/20 text-primary cursor-default' 
                                : 'bg-white border-slate-200 hover:border-primary hover:shadow-md text-slate-700 active:scale-[0.98]'}
                        `}
                        style={{ marginLeft: `${dest.depth * 12}px`, width: `calc(100% - ${dest.depth * 12}px)` }}
                   >
                       <div className="mr-3 text-slate-400">
                           {dest.id === ROOT_FOLDER ? <Home size={18} /> : <Folder size={18} />}
                       </div>
                       <span className={`font-bold flex-1 ${isCurrent ? 'font-black' : ''}`}>
                           {dest.label}
                       </span>
                       {isCurrent && <Check size={18} />}
                   </button>
               );
           })}

           {validDestinations.length === 0 && (
               <div className="p-4 text-center text-slate-400 font-bold">{t('move.no_folders')}</div>
           )}
        </div>
      </div>
    </div>
  );
};

export default MoveItemModal;