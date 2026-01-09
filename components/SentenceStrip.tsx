import React, { useRef, useEffect } from 'react';
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
  const itemsRef = useRef<(HTMLDivElement | null)[]>([]);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to active item when it changes (during playback)
  useEffect(() => {
    if (activeIndex !== null && itemsRef.current[activeIndex]) {
      itemsRef.current[activeIndex]?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center'
      });
    }
  }, [activeIndex]);

  // Scroll back to the beginning when playback stops
  useEffect(() => {
    if (!isPlaying && scrollContainerRef.current) {
        scrollContainerRef.current.scrollTo({
            left: 0,
            behavior: 'smooth'
        });
    }
  }, [isPlaying]);

  // Reset refs array when items change to ensure indices match
  useEffect(() => {
    itemsRef.current = itemsRef.current.slice(0, items.length);
  }, [items]);

  const getItemColor = (item: AACItem) => {
      if (item.colorTheme && THEME_COLORS[item.colorTheme]) return THEME_COLORS[item.colorTheme];
      const cat = categories.find(c => c.id === item.category);
      if (!cat) return '#f1f5f9'; 
      return THEME_COLORS[cat.colorTheme] || '#f1f5f9';
  };

  return (
    <div className="bg-white flex flex-col z-30 relative shadow-md">
      
      {/* Main Strip Area - Significantly Larger */}
      <div className="h-52 sm:h-72 w-full bg-slate-50 relative flex items-center border-b border-slate-200">
        {items.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center text-slate-300 pointer-events-none select-none">
                <span className="text-xl sm:text-3xl font-black tracking-tight border-4 border-dashed border-slate-200 px-8 py-4 rounded-3xl opacity-60">
                    {t('strip.tap_instruction')}
                </span>
            </div>
        )}
        
        <div 
          ref={scrollContainerRef}
          className="flex-1 min-w-0 flex items-center overflow-x-auto overflow-y-hidden px-4 sm:px-8 space-x-3 sm:space-x-6 no-scrollbar h-full py-6 overscroll-x-contain"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
            {items.map((item, idx) => {
                if (!item) return null; 
                
                return (
                    <div 
                        key={`${item.id}-${idx}`}
                        ref={(el) => { itemsRef.current[idx] = el; }}
                        onClick={() => onRemoveItem(idx)}
                        className={`
                            flex-shrink-0 relative group cursor-pointer transition-all duration-300 transform select-none
                            ${activeIndex === idx 
                                ? 'scale-110 -translate-y-2 z-20 ring-4 ring-primary ring-offset-4 rounded-3xl shadow-2xl' 
                                : 'hover:-translate-y-1 z-10 active:scale-95'}
                        `}
                    >
                        {/* Card Container - Large Dimensions */}
                        <div 
                            className="h-36 w-32 sm:h-52 sm:w-44 rounded-3xl border-b-[6px] border-r-[6px] border-black/10 overflow-hidden shadow-lg bg-white flex flex-col items-center transition-colors"
                            style={{ backgroundColor: getItemColor(item) }}
                        >
                            <div className="flex-1 w-full p-2 bg-transparent">
                                <img 
                                    src={item.imageUrl} 
                                    alt={item.label} 
                                    className="w-full h-full object-cover rounded-2xl bg-white border-2 border-white/60 pointer-events-none" 
                                />
                            </div>
                            <div className="h-10 sm:h-14 w-full flex items-center justify-center px-1 overflow-hidden pb-1">
                                <span className="text-sm sm:text-lg font-black text-slate-800 leading-tight text-center line-clamp-2 break-words w-full px-0.5">
                                    {item.label}
                                </span>
                            </div>
                        </div>

                        {/* Remove Icon - Top Right (Larger touch target) */}
                        <div className="absolute -top-3 -right-3 bg-red-500 text-white rounded-full p-2 shadow-md scale-0 group-hover:scale-100 transition-transform duration-200 z-30 border-4 border-white">
                            <X size={20} strokeWidth={4} />
                        </div>
                    </div>
                );
            })}
            
            {/* Spacer for centering the last item */}
            <div className="w-1/2 flex-shrink-0 h-full pointer-events-none" />
        </div>
      </div>

      {/* Control Bar - Taller, Icon Only */}
      <div className="h-24 sm:h-28 bg-white flex items-center justify-between px-6 sm:px-10 border-t border-slate-100 relative z-40">
        
        {/* Left Actions - Icons Only */}
        <div className="flex-1 flex justify-start gap-4 sm:gap-6">
            <button 
                onClick={onClear}
                disabled={items.length === 0}
                className="group flex items-center justify-center transition-all disabled:opacity-30 active:scale-90"
                title={t('strip.clear')}
            >
                <div className="w-14 h-14 sm:w-16 sm:h-16 bg-red-50 text-red-400 border-2 border-red-100 rounded-2xl flex items-center justify-center group-hover:bg-red-100 group-hover:border-red-200 group-hover:text-red-500 transition-colors shadow-sm">
                    <RotateCcw size={28} strokeWidth={2.5} />
                </div>
            </button>
            
            <button 
                onClick={onShowHistory}
                className="group flex items-center justify-center transition-all active:scale-90"
                title={t('strip.history')}
            >
                <div className="w-14 h-14 sm:w-16 sm:h-16 bg-blue-50 text-blue-400 border-2 border-blue-100 rounded-2xl flex items-center justify-center group-hover:bg-blue-100 group-hover:border-blue-200 group-hover:text-blue-500 transition-colors shadow-sm">
                    <Clock size={28} strokeWidth={2.5} />
                </div>
            </button>
        </div>

        {/* Center Play Button - Massive Floating Button */}
        <div className="flex-0 -mt-12 sm:-mt-16 pointer-events-auto">
            <button
            onClick={onPlay}
            disabled={isPlaying || items.length === 0}
            className={`
                w-24 h-24 sm:w-28 sm:h-28 rounded-full flex items-center justify-center shadow-2xl border-[8px] border-white transition-all transform duration-300
                ${isPlaying 
                    ? 'bg-white text-primary ring-4 ring-primary/20 scale-110' 
                    : items.length === 0
                        ? 'bg-slate-100 text-slate-300 border-slate-50 cursor-not-allowed shadow-none'
                        : 'bg-primary text-white hover:brightness-110 hover:scale-105 active:scale-95 active:shadow-inner'}
            `}
            >
                {isPlaying ? <Volume2 size={42} className="animate-bounce" strokeWidth={3} /> : <Play size={48} fill="currentColor" className="ml-2" />}
            </button>
        </div>
        
        {/* Right Actions - Icon Only */}
        <div className="flex-1 flex justify-end">
             <button 
                onClick={onRemoveLastItem}
                disabled={items.length === 0}
                className="group flex items-center justify-center transition-all disabled:opacity-30 active:scale-90"
                title={t('strip.backspace')}
            >
                <div className="w-14 h-14 sm:w-16 sm:h-16 bg-slate-100 text-slate-500 border-2 border-slate-200 rounded-2xl flex items-center justify-center group-hover:bg-slate-200 group-hover:border-slate-300 group-hover:text-slate-700 transition-colors shadow-sm">
                    <Delete size={28} strokeWidth={2.5} />
                </div>
            </button>
        </div>
      </div>
    </div>
  );
};

export default SentenceStrip;