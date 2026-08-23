
import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, Settings2, Folder } from 'lucide-react';
import { Category } from '../types';
import { getIconComponent } from '../utils/icons';
import { useSpeakEasy } from '../contexts/SpeakEasyContext';
import { TranslationKey } from '../services/translations';

interface FolderCardProps {
  folder: Category;
  onClick: () => void;
  onReorderLeft: (e: React.MouseEvent) => void;
  onReorderRight: (e: React.MouseEvent) => void;
  canMoveLeft: boolean;
  canMoveRight: boolean;
  isEditMode: boolean;
  onEdit?: () => void;
  /** Highlighted by the switch scanner. */
  isScanFocused?: boolean;
}

const FOLDER_THEMES: Record<string, { bg: string; border: string; shadow: string; tabBorder: string }> = {
    'yellow': { bg: 'bg-yellow-100', border: 'border-yellow-400', shadow: 'shadow-yellow-700', tabBorder: 'border-yellow-400' },
    'green':  { bg: 'bg-green-100',  border: 'border-green-500',  shadow: 'shadow-green-700',  tabBorder: 'border-green-500' },
    'blue':   { bg: 'bg-blue-100',   border: 'border-blue-400',   shadow: 'shadow-blue-700',   tabBorder: 'border-blue-400' },
    'pink':   { bg: 'bg-pink-100',   border: 'border-pink-400',   shadow: 'shadow-pink-700',   tabBorder: 'border-pink-400' },
    'orange': { bg: 'bg-orange-100', border: 'border-orange-500', shadow: 'shadow-orange-700', tabBorder: 'border-orange-500' },
    'purple': { bg: 'bg-purple-100', border: 'border-purple-400', shadow: 'shadow-purple-700', tabBorder: 'border-purple-400' },
    'teal':   { bg: 'bg-teal-100',   border: 'border-teal-500',   shadow: 'shadow-teal-700',   tabBorder: 'border-teal-500' },
    'red':    { bg: 'bg-red-100',    border: 'border-red-500',    shadow: 'shadow-red-700',    tabBorder: 'border-red-500' },
    'slate':  { bg: 'bg-slate-100',  border: 'border-slate-400',  shadow: 'shadow-slate-600',  tabBorder: 'border-slate-400' },
};

const FolderCard: React.FC<FolderCardProps> = ({ 
  folder, 
  onClick, 
  onReorderLeft, 
  onReorderRight,
  canMoveLeft,
  canMoveRight,
  isEditMode,
  onEdit,
  isScanFocused
}) => {
  const { t } = useSpeakEasy();
  const [imageError, setImageError] = useState(false);

  const theme = FOLDER_THEMES[folder.colorTheme] || FOLDER_THEMES['slate'];
  
  const isSimpleIcon = folder.icon && !folder.icon.includes('/') && !folder.icon.startsWith('data:') && !folder.icon.startsWith('http');
  const isImageIcon = !isSimpleIcon;
  const IconComponent = isSimpleIcon ? getIconComponent(folder.icon) : null;
  const displayLabel = folder.labelKey ? t(folder.labelKey as TranslationKey) : folder.label;

  return (
    // The folder itself is one <button>, so keyboard, screen reader and switch
    // access can reach it. Edit controls sit outside it as siblings — nesting
    // them would be invalid HTML and would break that traversal.
    <div className="relative aspect-[4/5] select-none">
      {/* `group` lives on the button, not the wrapper, so the press-down effect
          below responds to activating the control rather than to :active on a
          non-interactive div. */}
      <button
        type="button"
        onClick={onClick}
        className={`group absolute inset-0 flex flex-col pt-3 text-left rounded-3xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary focus-visible:ring-offset-2 ${isScanFocused ? 'ring-4 ring-sky-500 ring-offset-2 z-30' : ''}`}
      >
        {/* Folder Tab Effect */}
        <div className={`
          absolute top-0 left-0 w-1/2 h-8 rounded-t-xl z-0 border-t-2 border-l-2 border-r-2
          ${theme.bg} ${theme.tabBorder}
        `} />

        {/* Main Folder Body */}
        <div className={`
            relative flex-1 w-full rounded-b-3xl rounded-tr-3xl flex flex-col
            border-2 border-t-2 shadow-[0_4px_0_0] group-active:shadow-none group-active:translate-y-[4px] group-active:border-b-2
            transition-all duration-100 z-10 cursor-pointer overflow-hidden
            ${theme.bg} ${theme.border} ${theme.shadow}
        `}>
          {/* Content Area - Reduced Padding for larger icon */}
          <div className="flex-1 w-full flex items-center justify-center p-2 relative min-h-0">
               <div className="w-full h-full bg-white/40 rounded-xl flex items-center justify-center border border-black/5 p-1 shadow-sm relative overflow-hidden">
                  {isImageIcon && !imageError ? (
                      <img
                        src={folder.icon}
                        // Decorative: the label below names the button.
                        alt=""
                        className="w-full h-full object-contain drop-shadow-sm opacity-90"
                        onError={() => setImageError(true)}
                      />
                  ) : (
                      IconComponent ? (
                        <IconComponent
                          className="w-[80%] h-[80%] opacity-85 drop-shadow-sm text-slate-800"
                          strokeWidth={1.5}
                        />
                      ) : (
                        <Folder
                          className="w-[80%] h-[80%] opacity-85 drop-shadow-sm text-slate-800"
                          strokeWidth={1.5}
                        />
                      )
                  )}
               </div>
          </div>

          <div className="w-full text-center py-2 px-1 relative min-h-[44px] sm:min-h-[48px] flex items-center justify-center bg-black/5 border-t border-black/5 shrink-0">
            <span className="font-semibold text-sm sm:text-base tracking-wide line-clamp-2 leading-tight block px-1 text-slate-900">
              {displayLabel}
            </span>
          </div>
        </div>
      </button>

      {isEditMode && (
        <>
          <button
            type="button"
            aria-label={t('folder.edit')}
            onClick={() => onEdit?.()}
            className="absolute top-3 right-1 z-30 bg-white/90 backdrop-blur-sm rounded-full p-1.5 shadow-sm border border-slate-200 hover:bg-slate-50 active:scale-95 transition-all"
          >
            <Settings2 size={14} className="text-slate-700" />
          </button>
          <div className="absolute bottom-[3.25rem] sm:bottom-[3.5rem] inset-x-3 flex justify-between z-30 pointer-events-none">
            <button
              type="button"
              aria-label={t('move.title')}
              onClick={onReorderLeft}
              disabled={!canMoveLeft}
              className={`pointer-events-auto w-7 h-7 flex items-center justify-center rounded-full shadow-lg border-2 transition-all active:scale-95 backdrop-blur-md ${!canMoveLeft ? 'bg-slate-100/50 border-slate-200/50 text-slate-300 cursor-not-allowed opacity-50' : 'bg-white border-slate-200 text-slate-700 hover:border-primary hover:text-primary hover:bg-slate-50'}`}
            >
              <ArrowLeft size={14} strokeWidth={2.5} />
            </button>
            <button
              type="button"
              aria-label={t('move.title')}
              onClick={onReorderRight}
              disabled={!canMoveRight}
              className={`pointer-events-auto w-7 h-7 flex items-center justify-center rounded-full shadow-lg border-2 transition-all active:scale-95 backdrop-blur-md ${!canMoveRight ? 'bg-slate-100/50 border-slate-200/50 text-slate-300 cursor-not-allowed opacity-50' : 'bg-white border-slate-200 text-slate-700 hover:border-primary hover:text-primary hover:bg-slate-50'}`}
            >
              <ArrowRight size={14} strokeWidth={2.5} />
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default FolderCard;
