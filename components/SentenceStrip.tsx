
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

const THEME_STYLES: Record<string, { border: string; bg: string; text: string }> = {
    'yellow': { border: 'border-yellow-400', bg: 'bg-yellow-50', text: 'text-yellow-900' },
    'green':  { border: 'border-green-500',  bg: 'bg-green-50',  text: 'text-green-900' },
    'blue':   { border: 'border-blue-400',   bg: 'bg-blue-50',   text: 'text-blue-900' },
    'pink':   { border: 'border-pink-400',   bg: 'bg-pink-50',   text: 'text-pink-900' },
    'orange': { border: 'border-orange-400', bg: 'bg-orange-50', text: 'text-orange-900' },
    'purple': { border: 'border-purple-400', bg: 'bg-purple-50', text: 'text-purple-900' },
    'teal':   { border: 'border-teal-400',   bg: 'bg-teal-50',   text: 'text-teal-900' },
    'red':    { border: 'border-red-500',    bg: 'bg-red-50',    text: 'text-red-900' },
    'slate':  { border: 'border-slate-400',  bg: 'bg-slate-50',  text: 'text-slate-900' },
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

  useEffect(() => {
    if (activeIndex !== null && itemsRef.current[activeIndex]) {
      itemsRef.current[activeIndex]?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center'
      });
    }
  }, [activeIndex]);

  useEffect(() => {
    if (!isPlaying && scrollContainerRef.current) {
        scrollContainerRef.current.scrollTo({
            left: 0,
            behavior: 'smooth'
        });
    }
  }, [isPlaying]);

  useEffect(() => {
    itemsRef.current = itemsRef.current.slice(0, items.length);
  }, [items]);

  const getItemStyle = (item: AACItem) => {
      let theme = item.colorTheme || 'slate';
      if (!item.colorTheme) {
        const cat = categories.find(c => c.id === item.category);
        if (cat) theme = cat.colorTheme;
      }
      return THEME_STYLES[theme] || THEME_STYLES['slate'];
  };

  return (
    <div className="bg-white flex flex-col z-30 relative shadow-sm border-b border-slate-200">
      
      {/*
        1. The Strip Area.
        Tapping the strip replays the sentence; it no longer deletes. A single
        mis-tap used to destroy part of the sentence with no undo, which for a
        user with any motor imprecision is a real hazard. Removal is the
        backspace in the control bar, or the per-tile ✕ — which is now always
        visible rather than appearing on hover, an event that never fires on
        touch.
        Height dropped from h-32/h-40 to h-24/h-28: the strip plus control bar
        was taking roughly a quarter of a tablet screen, and grid rows are
        worth more than large pictures of words already chosen.
      */}
      <div className="h-24 sm:h-28 w-full bg-slate-50/50 relative flex items-center">
        {items.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center text-slate-400 pointer-events-none select-none">
                <span className="text-base sm:text-lg font-semibold tracking-tight border-2 border-dashed border-slate-300/60 bg-slate-50/50 px-5 py-2.5 rounded-2xl">
                    {t('strip.tap_instruction')}
                </span>
            </div>
        )}

        {/* Announces the sentence as it is built, for screen-reader users. */}
        <p aria-live="polite" aria-atomic="true" className="sr-only">
            {items.filter(Boolean).map(i => (i.labelKey ? t(i.labelKey) : i.label)).join(' ')}
        </p>

        <div
          ref={scrollContainerRef}
          onClick={() => { if (items.length > 0) onPlay(); }}
          className="flex-1 min-w-0 flex items-center overflow-x-auto overflow-y-hidden px-4 space-x-3 no-scrollbar h-full py-3 overscroll-x-contain cursor-pointer"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
            {items.map((item, idx) => {
                if (!item) return null;

                const displayLabel = item.labelKey ? t(item.labelKey) : item.label;
                const style = getItemStyle(item);

                return (
                    <div
                        key={`${item.id}-${idx}`}
                        ref={(el) => { itemsRef.current[idx] = el; }}
                        className={`
                            flex-shrink-0 relative transition-all duration-300 transform select-none
                            ${activeIndex === idx
                                ? 'scale-105 z-20 ring-4 ring-primary ring-offset-2 rounded-2xl shadow-xl'
                                : 'z-10'}
                        `}
                    >
                        {/* Framed Card Style */}
                        <div className={`
                            h-[4.5rem] w-[4.5rem] sm:h-24 sm:w-24 rounded-2xl border-2 overflow-hidden shadow-sm bg-white flex flex-col items-center
                            ${style.border}
                        `}>
                            {/* Image Area - White Background */}
                            <div className="flex-1 w-full p-1 bg-white flex items-center justify-center overflow-hidden relative">
                                <img
                                    src={item.imageUrl}
                                    alt=""
                                    className={`w-full h-full pointer-events-none ${item.imageFit === 'contain' ? 'object-contain' : 'object-cover rounded-lg'}`}
                                />
                            </div>

                            {/* Text Area - Colored Band */}
                            <div className={`
                                h-6 sm:h-7 w-full flex items-center justify-center px-1 overflow-hidden
                                border-t-2 ${style.border} ${style.bg}
                            `}>
                                <span className={`text-[11px] sm:text-xs font-semibold text-center truncate leading-tight ${style.text}`}>
                                    {displayLabel}
                                </span>
                            </div>
                        </div>

                        {/* Remove — always visible; `hover` never happens on touch. */}
                        <button
                            type="button"
                            aria-label={`${t('strip.remove_item')}: ${displayLabel}`}
                            onClick={(e) => { e.stopPropagation(); onRemoveItem(idx); }}
                            className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-1 shadow-sm z-30 border-2 border-white active:scale-90 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-1"
                        >
                            <X size={12} strokeWidth={3} />
                        </button>
                    </div>
                );
            })}

            {/* Spacer */}
            <div className="w-8 flex-shrink-0 h-full pointer-events-none" />
        </div>
      </div>

      {/* 2. The Control Bar */}
      <div className="h-16 bg-white flex items-center gap-3 px-3 sm:px-4 py-2 relative z-40">
        
        <div className="flex gap-2">
            <button 
                onClick={onClear}
                disabled={items.length === 0}
                className="w-12 h-12 rounded-xl bg-slate-100 text-slate-500 hover:bg-red-50 hover:text-red-500 flex items-center justify-center transition-all disabled:opacity-50 disabled:hover:bg-slate-100 disabled:hover:text-slate-500 active:scale-95"
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

        <div className="flex-1 flex justify-center px-2">
            <button
                onClick={onPlay}
                disabled={isPlaying || items.length === 0}
                className={`
                    w-full max-w-[220px] h-12 rounded-xl flex items-center justify-center gap-2 shadow-btn active:shadow-btn-active active:translate-y-[2px] transition-all
                    ${isPlaying 
                        ? 'bg-primary/10 text-primary border-2 border-primary/20' 
                        : items.length === 0
                            ? 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none'
                            : 'bg-primary text-white hover:brightness-110'}
                `}
            >
                {isPlaying ? (
                    <>
                        <Volume2 size={24} className="animate-pulse flex-shrink-0" />
                        <span className="font-semibold tracking-wide text-sm hidden sm:inline truncate">{t('recorder.playing')}</span>
                    </>
                ) : (
                    <>
                        <Play size={24} fill="currentColor" className="flex-shrink-0" />
                        <span className="font-bold tracking-wide text-base truncate">{t('strip.speak')}</span>
                    </>
                )}
            </button>
        </div>
        
        <div>
             <button 
                onClick={onRemoveLastItem}
                disabled={items.length === 0}
                className="w-12 h-12 rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700 flex items-center justify-center transition-all disabled:opacity-50 disabled:hover:bg-slate-100 disabled:hover:text-slate-500 active:scale-95"
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
