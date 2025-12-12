import React from 'react';
import { Play, RotateCcw, X, Volume2, Delete, Clock } from 'lucide-react';
import { AACItem, Category } from '../types';

interface SentenceStripProps {
  items: AACItem[];
  categories: Category[];
  onRemoveItem: (index: number) => void;
  onRemoveLastItem: () => void;
  onClear: () => void;
  onPlay: () => void;
  onShowHistory: () => void;
  isPlaying: boolean;
  activeIndex: number | null;
  t: (key: any) => string;
}

const THEME_COLORS: Record<string, string> = {
    'yellow': '#fef9c3',
    'green': '#dcfce7',
    'blue': '#dbeafe',
    'pink': '#fce7f3',
    'orange': '#ffedd5',
    'purple': '#f3e8ff',
    'teal': '#ccfbf1',
    'red': '#fee2e2',
    'slate': '#f1f5f9',
};

const SentenceStrip: React.FC<SentenceStripProps> = ({ 
  items, 
  categories,
  onRemoveItem, 
  onRemoveLastItem,
  onClear, 
  onPlay,
  onShowHistory,
  isPlaying,
  activeIndex,
  t
}) => {
  const getItemColor = (categoryId: string) => {
      const cat = categories.find(c => c.id === categoryId);
      // Safe fallback: if category deleted, return slate/gray
      if (!cat) return '#f1f5f9'; 
      return THEME_COLORS[cat.colorTheme] || '#f1f5f9';
  };

  return (
    <div className="bg-white flex flex-col z-30 relative border-b border-slate-200">
      
      {/* Reduced height slightly (h-32) for better landscape fit on mobile */}
      <div className="h-32 sm:h-44 w-full bg-slate-100/50 relative flex items-center">
        {items.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center text-slate-300 pointer-events-none select-none">
                <span className="text-lg sm:text-xl font-bold tracking-tight border-2 border-dashed border-slate-200 px-6 py-3 rounded-xl">
                    {t('strip.tap_instruction')}
                </span>
            </div>
        )}
        
        {/* Added w-0 (min-w-0 behavior in flex) to ensure horizontal scrolling works */}
        <div className="flex-1 w-0 flex items-center overflow-x-auto px-4 sm:px-6 space-x-2 sm:space-x-4 no-scrollbar h-full py-2 sm:py-4">
            {items.map((item, idx) => (
            <div 
                key={`${item.id}-${idx}`}
                onClick={() => onRemoveItem(idx)}
                className={`
                    flex-shrink-0 relative group cursor-pointer transition-all duration-300 transform
                    ${activeIndex === idx 
                        ? 'scale-110 -translate-y-2 z-20 ring-4 ring-primary ring-offset-4 rounded-2xl shadow-2xl' 
                        : 'hover:-translate-y-1 z-10'}
                `}
            >
                {/* Adjusted card size for the new container height */}
                <div 
                    className="h-20 w-16 sm:h-32 sm:w-28 rounded-2xl border-b-4 border-r-4 border-black/10 overflow-hidden shadow-md bg-white flex flex-col items-center"
                    style={{ backgroundColor: getItemColor(item.category) }}
                >
                    <div className="flex-1 w-full p-1.5 bg-transparent">
                         <img 
                            src={item.imageUrl} 
                            alt={item.label} 
                            className="w-full h-full object-cover rounded-xl bg-white" 
                         />
                    </div>
                    <div className="h-6 sm:h-8 w-full flex items-center justify-center text-[10px] sm:text-sm font-black text-slate-800 leading-none">
                        {item.label}
                    </div>
                </div>
                <div className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md transition-transform scale-90 hover:scale-110 z-30">
                    <X size={14} strokeWidth={3} />
                </div>
            </div>
            ))}
        </div>
      </div>

      <div className="h-16 bg-white flex items-center justify-between px-4 sm:px-6 border-t border-slate-100">
        <div className="flex-1 flex justify-start gap-2">
            <button 
                onClick={onClear}
                disabled={items.length === 0}
                className="text-slate-400 hover:text-red-500 hover:bg-red-50 font-bold text-sm flex items-center space-x-2 px-3 py-2 rounded-xl transition-all disabled:opacity-30"
                title={t('strip.clear')}
            >
                <RotateCcw size={20} strokeWidth={2.5} />
            </button>
            <button 
                onClick={onShowHistory}
                className="text-slate-400 hover:text-blue-500 hover:bg-blue-50 font-bold text-sm flex items-center space-x-2 px-3 py-2 rounded-xl transition-all"
                title={t('strip.history')}
            >
                <Clock size={20} strokeWidth={2.5} />
            </button>
        </div>

        <div className="flex-0">
            <button
            onClick={onPlay}
            disabled={isPlaying || items.length === 0}
            className={`
                flex items-center space-x-3 px-8 py-3 rounded-full font-black text-lg shadow-btn transition-all
                ${isPlaying 
                    ? 'bg-slate-100 text-primary ring-2 ring-primary/20' 
                    : items.length === 0
                        ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                        : 'bg-primary text-white hover:brightness-110 active:shadow-btn-active active:translate-y-1'}
            `}
            >
                {isPlaying ? <Volume2 size={24} className="animate-bounce" /> : <Play size={24} fill="currentColor" />}
                <span>{t('strip.speak')}</span>
            </button>
        </div>
        
        <div className="flex-1 flex justify-end">
             <button 
                onClick={onRemoveLastItem}
                disabled={items.length === 0}
                className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 font-bold text-sm flex items-center space-x-2 px-3 py-2 rounded-xl transition-all disabled:opacity-30"
            >
                <span className="hidden sm:inline">{t('strip.backspace')}</span>
                <Delete size={20} strokeWidth={2.5} />
            </button>
        </div>
      </div>
    </div>
  );
};

export default SentenceStrip;