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
    <div className="bg-white flex flex-col z-30 relative shadow-sm border-b border-slate-200">
      
      {/* 1. The Strip Area - Compact Height */}
      <div className="h-32 sm:h-40 w-full bg-slate-50/50 relative flex items-center">
        {items.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center text-slate-300 pointer-events-none select-none">
                <span className="text-lg sm:text-xl font-bold tracking-tight border-2 border-dashed border-slate-200 px-6 py-3 rounded-2xl opacity-60">
                    {t('strip.tap_instruction')}
                </span>
            </div>
        )}
        
        <div 
          ref={scrollContainerRef}
          className="flex-1 min-w-0 flex items-center overflow-x-auto overflow-y-hidden px-4 space-x-3 no-scrollbar h-full py-4 overscroll-x-contain"
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
                                ? 'scale-105 z-20 ring-4 ring-primary ring-offset-2 rounded-2xl shadow-xl' 
                                : 'hover:-translate-y-1 z-10 active:scale-95'}
                        `}
                    >
                        {/* Card Container - WIDER for better text fit */}
                        <div 
                            className="h-24 w-24 sm:h-32 sm:w-32 rounded-2xl border-b-4 border-r-4 border-black/10 overflow-hidden shadow-sm bg-white flex flex-col items-center transition-colors"
                            style={{ backgroundColor: getItemColor(item) }}
                        >
                            <div className="flex-1 w-full p-1 bg-transparent flex items-center justify-center overflow-hidden">
                                <img 
                                    src={item.imageUrl} 
                                    alt={item.label} 
                                    className={`w-full h-full rounded-xl bg-white border border-white/60 pointer-events-none ${item.imageFit === 'contain' ? 'object-contain' : 'object-cover'}`}
                                />
                            </div>
                            <div className="h-8 sm:h-10 w-full flex items-center justify-center px-1 overflow-hidden pb-1">
                                <span className="text-[10px] sm:text-xs font-black text-slate-800 leading-[1.1] text-center line-clamp-2 break-words w-full px-0.5">
                                    {item.label}
                                </span>
                            </div>
                        </div>

                        {/* Remove Icon */}
                        <div className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-sm scale-0 group-hover:scale-100 transition-transform duration-200 z-30 border-2 border-white">
                            <X size={12} strokeWidth={3} />
                        </div>
                    </div>
                );
            })}
            
            {/* Spacer for centering the last item */}
            <div className="w-8 flex-shrink-0 h-full pointer-events-none" />
        </div>
      </div>

      {/* 2. The Control Bar - Slim & Integrated */}
      <div className="h-16 bg-white flex items-center gap-3 px-3 sm:px-4 py-2 relative z-40">
        
        {/* Left: Clear & History */}
        <div className="flex gap-2">
            <button 
                onClick={onClear}
                disabled={items.length === 0}
                className="w-12 h-12 rounded-xl bg-slate-100 text-slate-500 hover:bg-red-50 hover:text-red-500 flex items-center justify-center transition-all disabled:opacity-30 disabled:hover:bg-slate-100 disabled:hover:text-slate-500 active:scale-95"
                title={t('strip.clear')}
            >
                <RotateCcw size={20} strokeWidth={2.5} />
            </button>
            
            <button 
                onClick={onShowHistory}
                className="w-12 h-12 rounded-xl bg-slate-100 text-slate-500 hover:bg-blue-50 hover:text-blue-500 flex items-center justify-center transition-all active:scale-95"
                title={t('strip.history')}
            >
                <Clock size={20} strokeWidth={2.5} />
            </button>
        </div>

        {/* Center: Wide Play Button (Constrained Width) */}
        <div className="flex-1 flex justify-center px-2">
            <button
                onClick={onPlay}
                disabled={isPlaying || items.length === 0}
                className={`
                    w-full max-w-[220px] h-12 rounded-xl flex items-center justify-center gap-2 shadow-btn active:shadow-btn-active active:translate-y-[2px] transition-all
                    ${isPlaying 
                        ? 'bg-primary/10 text-primary border-2 border-primary/20' 
                        : items.length === 0
                            ? 'bg-slate-100 text-slate-300 cursor-not-allowed shadow-none'
                            : 'bg-primary text-white hover:brightness-110'}
                `}
            >
                {isPlaying ? (
                    <>
                        <Volume2 size={24} className="animate-pulse flex-shrink-0" />
                        <span className="font-bold uppercase tracking-wider text-sm hidden sm:inline truncate">{t('recorder.playing')}</span>
                    </>
                ) : (
                    <>
                        <Play size={24} fill="currentColor" className="flex-shrink-0" />
                        <span className="font-black uppercase tracking-wider text-sm truncate">{t('strip.speak')}</span>
                    </>
                )}
            </button>
        </div>
        
        {/* Right: Backspace */}
        <div>
             <button 
                onClick={onRemoveLastItem}
                disabled={items.length === 0}
                className="w-12 h-12 rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700 flex items-center justify-center transition-all disabled:opacity-30 disabled:hover:bg-slate-100 disabled:hover:text-slate-500 active:scale-95"
                title={t('strip.backspace')}
            >
                <Delete size={20} strokeWidth={2.5} />
            </button>
        </div>
      </div>
    </div>
  );
};

export default SentenceStrip;