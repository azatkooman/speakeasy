import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, Settings2, Folder } from 'lucide-react';
import { Category } from '../types';
import { getIconComponent } from '../utils/icons';

interface FolderCardProps {
  folder: Category;
  onClick: () => void;
  onReorderLeft: (e: React.MouseEvent) => void;
  onReorderRight: (e: React.MouseEvent) => void;
  canMoveLeft: boolean;
  canMoveRight: boolean;
  isEditMode: boolean;
  onEdit?: () => void;
}

const FolderCard: React.FC<FolderCardProps> = ({ 
  folder, 
  onClick, 
  onReorderLeft, 
  onReorderRight,
  canMoveLeft,
  canMoveRight,
  isEditMode,
  onEdit
}) => {
  const [imageError, setImageError] = useState(false);

  // Map themes to visual styles
  const getThemeStyles = (theme: string) => {
    switch(theme) {
      case 'yellow': return 'bg-yellow-100 border-yellow-300 text-yellow-800';
      case 'green': return 'bg-green-100 border-green-300 text-green-800';
      case 'blue': return 'bg-blue-100 border-blue-300 text-blue-800';
      case 'pink': return 'bg-pink-100 border-pink-300 text-pink-800';
      case 'orange': return 'bg-orange-100 border-orange-300 text-orange-800';
      case 'purple': return 'bg-purple-100 border-purple-300 text-purple-800';
      case 'teal': return 'bg-teal-100 border-teal-300 text-teal-800';
      case 'red': return 'bg-red-100 border-red-300 text-red-800';
      default: return 'bg-slate-100 border-slate-300 text-slate-800';
    }
  };

  const styleClass = getThemeStyles(folder.colorTheme);
  
  // Robustly detect if icon is a built-in Lucide icon name or an image URL (http/data/file/capacitor)
  const isSimpleIcon = folder.icon && !folder.icon.includes('/') && !folder.icon.startsWith('data:') && !folder.icon.startsWith('http');
  const isImageIcon = !isSimpleIcon;
  
  const IconComponent = isSimpleIcon ? getIconComponent(folder.icon) : null;

  return (
    <div className="relative aspect-[4/5] group select-none" onClick={onClick}>
      {/* Visual Stack/Shadow Effect */}
      <div className="absolute inset-0 bg-slate-800/10 rounded-3xl translate-x-2 translate-y-2 -z-20" />
      <div className="absolute inset-0 bg-white rounded-3xl translate-x-1 translate-y-1 border-2 border-slate-100 -z-10" />

      {/* Main Folder Card */}
      <div 
        className={`
          absolute inset-0 rounded-3xl flex flex-col
          border-b-4 border-r-4 shadow-sm active:border-0 active:translate-y-1 active:translate-x-1 transition-all cursor-pointer overflow-hidden z-10
          ${styleClass}
        `}
      >
        {/* Tab Visual */}
        <div className="h-6 w-full relative">
            <div className="absolute top-0 left-0 w-1/3 h-full bg-black/10 rounded-br-2xl border-b border-r border-black/5" />
            {isEditMode && (
                 <button 
                     onClick={(e) => { e.stopPropagation(); onEdit?.(); }}
                     className="absolute top-1 right-1 bg-white/90 backdrop-blur-sm rounded-full p-1.5 shadow-sm z-30 border border-slate-200 hover:bg-slate-50 active:scale-95 transition-all"
                 >
                     <Settings2 size={14} className="text-slate-700" />
                 </button>
            )}
        </div>

        {/* Content Area */}
        <div className="flex-1 w-full flex items-center justify-center overflow-hidden px-3 pb-0 relative">
             <div className="w-full h-full bg-white/40 rounded-2xl flex items-center justify-center border border-white/40 p-2 shadow-inner relative">
                {isImageIcon && !imageError ? (
                    <img 
                      src={folder.icon} 
                      alt={folder.label} 
                      className="w-full h-full object-contain drop-shadow-sm"
                      onError={() => setImageError(true)} 
                    />
                ) : (
                    IconComponent ? (
                      <IconComponent size={40} strokeWidth={1.5} className="opacity-80 drop-shadow-sm w-12 h-12 sm:w-16 sm:h-16" />
                    ) : (
                      <Folder size={40} strokeWidth={1.5} className="opacity-80 drop-shadow-sm w-12 h-12 sm:w-16 sm:h-16" />
                    )
                )}
                
                {/* Reorder Arrows - Overlaying the bottom of the image area for space efficiency */}
                {isEditMode && (
                    <div className="absolute bottom-2 inset-x-2 flex justify-between z-20">
                        <button 
                            onClick={(e) => { e.stopPropagation(); onReorderLeft(e); }}
                            disabled={!canMoveLeft}
                            className={`
                                w-9 h-9 flex items-center justify-center rounded-full shadow-lg border-2 transition-all active:scale-95 backdrop-blur-md
                                ${!canMoveLeft 
                                    ? 'bg-slate-100/50 border-slate-200/50 text-slate-300 cursor-not-allowed opacity-50' 
                                    : 'bg-white border-slate-200 text-slate-700 hover:border-primary hover:text-primary hover:bg-slate-50'}
                            `}
                        >
                            <ArrowLeft size={20} strokeWidth={2.5} />
                        </button>
                        <button 
                            onClick={(e) => { e.stopPropagation(); onReorderRight(e); }}
                            disabled={!canMoveRight}
                            className={`
                                w-9 h-9 flex items-center justify-center rounded-full shadow-lg border-2 transition-all active:scale-95 backdrop-blur-md
                                ${!canMoveRight 
                                    ? 'bg-slate-100/50 border-slate-200/50 text-slate-300 cursor-not-allowed opacity-50' 
                                    : 'bg-white border-slate-200 text-slate-700 hover:border-primary hover:text-primary hover:bg-slate-50'}
                            `}
                        >
                            <ArrowRight size={20} strokeWidth={2.5} />
                        </button>
                    </div>
                )}
             </div>
        </div>
      
        <div className="w-full text-center py-2 px-1 relative h-11 sm:h-12 flex items-center justify-center">
          <span className="font-black text-sm sm:text-base uppercase tracking-wide line-clamp-2 leading-tight block px-1">
            {folder.label}
          </span>
        </div>
      </div>
    </div>
  );
};

export default FolderCard;