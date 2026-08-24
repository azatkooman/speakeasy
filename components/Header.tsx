
import React, { useRef, useState } from 'react';
import { Search, X, ChevronLeft, Lock, Unlock, Hand } from 'lucide-react';
import { useSpeakEasy } from '../contexts/SpeakEasyContext.tsx';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

export const Header: React.FC = () => {
  const { 
    isSearchActive, searchQuery, setSearchQuery, setIsSearchActive, 
    boardHistory, navigateBackBoard, 
    isEditMode, setEditMode, t 
  } = useSpeakEasy();

  const unlockTimerRef = useRef<number | null>(null);
  const ignoreNextClick = useRef(false);
  const [isHoldingUnlock, setIsHoldingUnlock] = useState(false);
  const [showOnboardingHint, setShowOnboardingHint] = useState(!localStorage.getItem('aac_onboarding_completed'));

  const triggerHaptic = async () => {
      try {
          await Haptics.impact({ style: ImpactStyle.Heavy });
      } catch (e) {
          // Fallback
          if (navigator.vibrate) navigator.vibrate([50]);
      }
  };

  const startUnlock = () => {
    if (isEditMode) return;
    if (unlockTimerRef.current) clearTimeout(unlockTimerRef.current);
    
    setIsHoldingUnlock(true);
    unlockTimerRef.current = window.setTimeout(() => {
      setEditMode(true);
      setIsHoldingUnlock(false);
      ignoreNextClick.current = true;
      triggerHaptic();

      if (showOnboardingHint) {
          localStorage.setItem('aac_onboarding_completed', 'true');
          setShowOnboardingHint(false);
      }

      setTimeout(() => {
          if (ignoreNextClick.current) ignoreNextClick.current = false;
      }, 1000);
    }, 1500);
  };

  const cancelUnlock = () => {
      if (unlockTimerRef.current) {
          clearTimeout(unlockTimerRef.current);
          unlockTimerRef.current = null;
      }
      setIsHoldingUnlock(false);
  };

  const handleLockToggle = () => {
      if (ignoreNextClick.current) {
          ignoreNextClick.current = false;
          return;
      }
      if (isEditMode) {
          setEditMode(false);
          setIsSearchActive(false);
          setSearchQuery('');
          ignoreNextClick.current = false;
          try {
             Haptics.impact({ style: ImpactStyle.Light });
          } catch(e) {}
      }
  };

  return (
      <div 
        className="flex justify-between items-center px-4 py-3 bg-white/90 backdrop-blur-sm border-b border-slate-200 z-40 shrink-0 transition-all" 
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 0.75rem)' }}
      >
        {isSearchActive ? (
            <div className="flex-1 flex items-center gap-3">
                <div className="relative flex-1">
                    <input 
                        type="text" 
                        value={searchQuery} 
                        onChange={(e) => setSearchQuery(e.target.value)} 
                        placeholder={t('search.placeholder')} 
                        autoFocus 
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-100 border-2 border-primary/20 rounded-xl outline-none font-bold text-slate-800 placeholder:text-slate-500 text-base" 
                    />
                    <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                </div>
                <button onClick={() => { setIsSearchActive(false); setSearchQuery(''); }} className="p-2.5 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 active:bg-slate-300 transition-colors"><X size={20} /></button>
            </div>
        ) : (
            <>
                <div className="flex items-center gap-3">
                    {boardHistory.length > 0 ? (
                        <button 
                            onClick={navigateBackBoard}
                            className="bg-white border-2 border-slate-200 text-slate-700 hover:text-primary hover:border-primary px-3 py-2 rounded-xl flex items-center gap-2 font-bold shadow-sm active:scale-95 transition-all"
                        >
                            <ChevronLeft size={24} strokeWidth={3} />
                            <span className="hidden sm:inline">{t('header.back')}</span>
                        </button>
                    ) : (
                        <div className="flex items-center space-x-2">
                            <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center text-white font-black text-lg shadow-md">S</div>
                            <h1 className="font-extrabold text-slate-700 text-xl hidden sm:block">{t('app.title')}</h1>
                        </div>
                    )}
                </div>
                
                <div className="flex items-center gap-3 relative">
                    {/* Parent-only. In child mode, search replaces the board with a
                        packed list of results, so every symbol a child has memorised
                        appears somewhere else. */}
                    {isEditMode && (
                        <button aria-label={t('search.placeholder')} onClick={() => setIsSearchActive(true)} className="p-2.5 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 active:bg-slate-300 transition-colors"><Search size={20} /></button>
                    )}
                    
                    {/* Lock Button */}
                    <div className="relative z-20">
                        <button 
                            onMouseDown={startUnlock} 
                            onMouseUp={cancelUnlock} 
                            onMouseLeave={cancelUnlock}
                            onTouchStart={startUnlock} 
                            onTouchEnd={cancelUnlock}
                            onTouchCancel={cancelUnlock}
                            onClick={handleLockToggle}
                            className={`relative overflow-hidden p-1.5 pr-4 rounded-full flex items-center space-x-2 border-2 transition-all active:scale-95 ${isEditMode ? 'bg-red-50 text-red-600 border-red-200' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'} ${showOnboardingHint && !isEditMode ? 'ring-4 ring-blue-400/30' : ''}`}
                        >
                            {!isEditMode && <div className={`absolute inset-0 bg-slate-200/80 transition-transform ease-linear origin-left ${isHoldingUnlock ? 'scale-x-100 duration-[1500ms]' : 'scale-x-0'}`} />}
                            <div className={`relative z-10 p-1.5 rounded-full ${isEditMode ? 'bg-red-100' : 'bg-slate-100'}`}>{isEditMode ? <Unlock size={16} /> : <Lock size={16} />}</div>
                            <div className="relative z-10 flex flex-col items-start"><span className="text-xs font-bold uppercase tracking-tight">{isHoldingUnlock ? t('mode.holding') : (isEditMode ? t('mode.parent') : t('mode.child'))}</span></div>
                        </button>

                        {/* Onboarding Tooltip */}
                        {showOnboardingHint && !isEditMode && (
                            <div className="absolute top-full right-0 mt-2 sm:mt-4 w-[min(18rem,calc(100vw-2rem))] bg-slate-900 text-white p-3 sm:p-4 rounded-2xl shadow-2xl z-50 animate-in slide-in-from-top-2 duration-300 pointer-events-auto border border-slate-800">
                                <div className="absolute -top-2 right-5 w-4 h-4 bg-slate-900 border-t border-l border-slate-800 rotate-45"></div>
                                <div className="flex gap-3 sm:gap-4">
                                    <div className="bg-indigo-500/20 p-2 sm:p-3 rounded-full h-fit flex-shrink-0">
                                        <Hand size={24} className="text-indigo-400" />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-bold text-base text-white mb-1">{t('mode.parent')}</h3>
                                        <p className="text-slate-300 text-sm leading-snug mb-3">
                                            {t('onboarding.unlock_hint')}
                                        </p>
                                        <button 
                                            onClick={() => { localStorage.setItem('aac_onboarding_completed', 'true'); setShowOnboardingHint(false); }}
                                            className="py-2 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition-colors w-full active:bg-indigo-700"
                                        >
                                            {t('onboarding.dismiss')}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </>
        )}
      </div>
  );
};
