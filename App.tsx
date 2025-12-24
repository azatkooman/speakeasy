import React, { useState, useEffect, useRef } from 'react';
import { Plus, Lock, Unlock, Image as ImageIcon, Search, X, Pencil, Settings2, Layers, ChevronDown, ChevronUp, Grid as GridIcon, Eye, EyeOff } from 'lucide-react';
import { AACItem, Category, ColorTheme, AppSettings, AppLanguage } from './types';
import { saveItem, getAllItems, deleteItem, getAllCategories, saveCategory, deleteCategory, clearLegacyStorage } from './services/storage';
import { getTranslation, TranslationKey } from './services/translations';
import { voiceService } from './services/voice';
import SentenceStrip from './components/SentenceStrip';
import CreateCardModal from './components/CreateCardModal';
import ConfirmationModal from './components/ConfirmationModal';
import CategoryManagerModal from './components/CategoryManagerModal';
import SettingsModal from './components/SettingsModal';
import HistoryModal from './components/HistoryModal';
import ParentGateModal from './components/ParentGateModal';

// Default settings
const DEFAULT_SETTINGS: AppSettings = {
  voicePitch: 1.0,
  voiceRate: 0.9,
  gridColumns: 'medium',
  language: 'en',
};

const playAudio = (audioUrl: string): Promise<void> => {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => resolve(), 10000);
    try {
      const audio = new Audio(audioUrl);
      audio.load();
      audio.onended = () => { clearTimeout(timeout); resolve(); };
      audio.onerror = () => { clearTimeout(timeout); resolve(); };
      audio.play().catch(() => { clearTimeout(timeout); resolve(); });
    } catch (e) {
      clearTimeout(timeout);
      resolve();
    }
  });
};

const THEME_STYLES: Record<ColorTheme, { bg: string; border: string; text: string }> = {
  'yellow': { bg: 'bg-card-yellow', border: 'border-yellow-400', text: 'text-yellow-900' },
  'green': { bg: 'bg-card-green', border: 'border-green-400', text: 'text-green-900' },
  'blue': { bg: 'bg-card-blue', border: 'border-blue-400', text: 'text-blue-900' },
  'pink': { bg: 'bg-card-pink', border: 'border-pink-400', text: 'text-pink-900' },
  'orange': { bg: 'bg-card-orange', border: 'border-orange-400', text: 'text-orange-900' },
  'purple': { bg: 'bg-card-purple', border: 'border-purple-400', text: 'text-purple-900' },
  'teal': { bg: 'bg-card-teal', border: 'border-teal-400', text: 'text-teal-900' },
  'red': { bg: 'bg-card-red', border: 'border-red-400', text: 'text-red-900' },
  'slate': { bg: 'bg-card-slate', border: 'border-slate-400', text: 'text-slate-900' },
};

const DEFAULT_CARD_STYLE = THEME_STYLES['slate'];

interface CategoryButtonProps {
  cat?: Category;
  isAll?: boolean;
  isSelected: boolean;
  onClick: () => void;
  t: (key: TranslationKey) => string;
}

const CategoryButton: React.FC<CategoryButtonProps> = ({ cat, isAll = false, isSelected, onClick, t }) => {
  let style = { bg: 'bg-white', text: 'text-slate-600', border: 'border-slate-200' };
  if (isAll) {
      style = isSelected 
          ? { bg: 'bg-slate-800', text: 'text-white', border: 'border-slate-800' }
          : { bg: 'bg-white', text: 'text-slate-600', border: 'border-slate-200' };
  } else if (cat) {
      const themeStyle = THEME_STYLES[cat.colorTheme];
      style = isSelected
          ? { bg: themeStyle.bg, text: themeStyle.text, border: themeStyle.border }
          : { bg: 'bg-white', text: themeStyle.text, border: 'border-slate-200' };
  }
  return (
      <button
          onClick={onClick}
          className={`px-4 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap border-2 flex-shrink-0 ${style.bg} ${style.text} ${style.border} ${isSelected ? 'shadow-btn translate-y-[-2px] border-current' : 'hover:border-slate-300 hover:bg-slate-50'}`}
      >
          {isAll ? t('nav.all') : cat?.label}
      </button>
  );
};

function App() {
  const [library, setLibrary] = useState<AACItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [sentence, setSentence] = useState<AACItem[]>([]);
  
  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('aac_settings');
    const parsed = saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
    if (!parsed.language) parsed.language = 'en';
    return parsed;
  });

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<AACItem | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  
  // History is now strictly IDs to prevent storage quota issues
  const [historyIds, setHistoryIds] = useState<string[][]>([]);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [isCategoryExpanded, setIsCategoryExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchActive, setIsSearchActive] = useState(false);
  const unlockTimerRef = useRef<number | null>(null);
  const ignoreNextClick = useRef(false);
  const [isHoldingUnlock, setIsHoldingUnlock] = useState(false);

  const t = (key: TranslationKey) => getTranslation(settings.language, key);

  useEffect(() => {
    clearLegacyStorage(); // Cleanup bloated storage on boot
    loadData();
    const savedHistory = localStorage.getItem('aac_history_ids');
    if (savedHistory) {
        try { setHistoryIds(JSON.parse(savedHistory)); } catch (e) { console.error("History parse fail", e); }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('aac_settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
      if (!isEditMode) {
          setIsSearchActive(false);
          setSearchQuery('');
      }
  }, [isEditMode]);

  const loadData = async () => {
    try {
      const [items, cats] = await Promise.all([getAllItems(), getAllCategories()]);
      setLibrary(items.sort((a, b) => b.createdAt - a.createdAt));
      setCategories(cats);
    } catch (error) {
      console.error("Failed to load data", error);
    }
  };

  const speakText = async (text: string) => {
    if (!text || text.trim() === '') return;
    await voiceService.speak({
      text,
      language: settings.language,
      rate: settings.voiceRate,
      pitch: settings.voicePitch,
    });
  };

  const handleSaveItem = async (itemData: Omit<AACItem, 'id' | 'createdAt'>) => {
    if (editingItem) {
        await saveItem({ ...editingItem, ...itemData });
    } else {
        await saveItem({ ...itemData, id: crypto.randomUUID(), createdAt: Date.now(), isVisible: itemData.isVisible ?? true });
    }
    await loadData();
    setEditingItem(null);
  };

  const handleDeleteCategory = async (id: string) => {
    try {
        await deleteCategory(id);
        if (selectedCategory === id) setSelectedCategory('ALL');
        await loadData();
    } catch (e) { console.error(e); }
  };

  const confirmDelete = async () => {
    if (itemToDelete) {
      const targetId = itemToDelete;
      try {
        await deleteItem(targetId);
        // Sentence strip is naturally filtered
        setSentence(prev => prev.filter(item => item && item.id !== targetId));
        // History automatically handles deletion because lookups will fail for that ID
        await loadData();
      } catch (error) { console.error(error); } finally { setItemToDelete(null); }
    }
  };

  const addToSentence = (item: AACItem) => {
    if (isPlaying || !item) return;
    setSentence(prev => [...prev, item]);
    playItemSound(item);
  };

  const playItemSound = async (item: AACItem) => {
    if (!item) return;
    try {
      if (item.audioUrl) {
        await playAudio(item.audioUrl);
      } else {
        const text = (item.textToSpeak || item.label || '').trim();
        if (text) await speakText(text);
      }
    } catch (e) {
      if (item.label) await speakText(item.label);
    }
  };

  const addToHistory = (items: AACItem[]) => {
      if (!items || items.length === 0) return;
      setHistoryIds(prev => {
        const newIds = [items.map(i => i.id), ...prev].slice(0, 15);
        try {
            localStorage.setItem('aac_history_ids', JSON.stringify(newIds));
        } catch (e) {
            console.error("Storage failed, clearing some history", e);
            const truncated = newIds.slice(0, 5);
            localStorage.setItem('aac_history_ids', JSON.stringify(truncated));
            return truncated;
        }
        return newIds;
      });
  };

  const playSentence = async () => {
    const validSentence = sentence.filter(item => !!item && (item.label || item.textToSpeak || item.audioUrl));
    if (validSentence.length === 0 || isPlaying) return;
    
    addToHistory(validSentence);
    setIsPlaying(true);
    
    try {
      for (let i = 0; i < validSentence.length; i++) {
        setActiveIndex(i);
        await Promise.race([
          playItemSound(validSentence[i]),
          new Promise(resolve => setTimeout(resolve, 8000))
        ]);
        await new Promise(r => setTimeout(r, 100));
      }
    } catch (err) { console.error(err); } finally {
      setActiveIndex(null);
      setIsPlaying(false);
      await voiceService.stop();
    }
  };

  const startUnlock = () => {
    if (isEditMode) return;
    setIsHoldingUnlock(true);
    unlockTimerRef.current = window.setTimeout(() => {
      setIsEditMode(true);
      setIsHoldingUnlock(false);
      ignoreNextClick.current = true;
      if (navigator.vibrate) navigator.vibrate([40, 40]);
    }, 2500);
  };

  /**
   * Helper function to determine the responsive grid column classes 
   * based on the 'gridColumns' setting.
   */
  const getGridClass = () => {
    switch (settings.gridColumns) {
      case 'small':
        return 'grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10';
      case 'large':
        return 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5';
      case 'medium':
      default:
        return 'grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6';
    }
  };

  const filteredLibrary = library.filter(item => {
    const matchCategory = searchQuery ? true : (selectedCategory === 'ALL' || item.category === selectedCategory);
    const matchVisibility = isEditMode || (item.isVisible !== false);
    const matchSearch = !searchQuery || item.label.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCategory && matchVisibility && matchSearch;
  });

  const getCardStyle = (categoryId: string) => {
    const cat = categories.find(c => c.id === categoryId);
    return cat ? THEME_STYLES[cat.colorTheme] : DEFAULT_CARD_STYLE;
  };

  return (
    <div className="h-screen w-full bg-background pattern-grid flex flex-col overflow-hidden font-sans">
      <div className="flex justify-between items-center px-4 py-3 bg-white/90 backdrop-blur-sm border-b border-slate-200 z-20 shrink-0" style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}>
        {isSearchActive ? (
            <div className="flex-1 flex items-center gap-3">
                <div className="relative flex-1">
                    <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder={t('search.placeholder')} autoFocus className="w-full pl-10 pr-4 py-2.5 bg-slate-100 border-2 border-primary/20 rounded-xl outline-none font-bold" />
                    <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                </div>
                <button onClick={() => { setIsSearchActive(false); setSearchQuery(''); }} className="p-2.5 bg-slate-100 text-slate-500 rounded-xl"><X size={20} /></button>
            </div>
        ) : (
            <>
                <div className="flex items-center space-x-2">
                    <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center text-white font-black text-lg shadow-md">S</div>
                    <h1 className="font-extrabold text-slate-700 text-xl hidden sm:block">{t('app.title')}</h1>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={() => setIsSearchActive(true)} className="p-2.5 rounded-full bg-slate-100 text-slate-400"><Search size={20} /></button>
                    <button 
                        onMouseDown={startUnlock} onMouseUp={() => setIsHoldingUnlock(false)} onTouchStart={startUnlock} onTouchEnd={() => setIsHoldingUnlock(false)}
                        onClick={() => { if(!ignoreNextClick.current && isEditMode) setIsEditMode(false); ignoreNextClick.current = false; }}
                        className={`relative overflow-hidden p-2 pr-4 rounded-full flex items-center space-x-2 border-2 ${isEditMode ? 'bg-red-50 text-red-600' : 'bg-white text-slate-400'}`}
                    >
                        {!isEditMode && <div className={`absolute inset-0 bg-slate-200/80 transition-transform ease-linear origin-left ${isHoldingUnlock ? 'scale-x-100 duration-[2500ms]' : 'scale-x-0'}`} />}
                        <div className={`relative z-10 p-1.5 rounded-full ${isEditMode ? 'bg-red-100' : 'bg-slate-100'}`}>{isEditMode ? <Unlock size={16} /> : <Lock size={16} />}</div>
                        <div className="relative z-10 flex flex-col items-start"><span className="text-xs font-bold uppercase">{isHoldingUnlock ? t('mode.holding') : (isEditMode ? t('mode.parent') : t('mode.child'))}</span></div>
                    </button>
                </div>
            </>
        )}
      </div>

      <SentenceStrip items={sentence} categories={categories} onRemoveItem={(i) => setSentence(prev => prev.filter((_, idx) => idx !== i))} onRemoveLastItem={() => setSentence(prev => prev.slice(0, -1))} onClear={() => setSentence([])} onPlay={playSentence} onShowHistory={() => setIsHistoryOpen(true)} isPlaying={isPlaying} activeIndex={activeIndex} t={t} />

      <div className="relative shrink-0 bg-white/50 border-b border-slate-200/60 z-20 backdrop-blur-md">
        <div className={`flex items-center ${isCategoryExpanded ? 'h-0 opacity-0 overflow-hidden' : 'h-auto opacity-100'}`}>
             <div className="flex-1 overflow-x-auto no-scrollbar flex space-x-2 px-4 py-3">
                <CategoryButton isAll isSelected={selectedCategory === 'ALL'} onClick={() => setSelectedCategory('ALL')} t={t} />
                {categories.map(cat => <CategoryButton key={cat.id} cat={cat} isSelected={selectedCategory === cat.id} onClick={() => setSelectedCategory(cat.id)} t={t} />)}
             </div>
             <button onClick={() => setIsCategoryExpanded(true)} className="w-12 flex items-center justify-center text-slate-500"><ChevronDown size={20} /></button>
        </div>
        {isCategoryExpanded && (
             <div className="bg-white p-4 grid grid-cols-2 gap-3 animate-in slide-in-from-top-2 duration-200">
                <CategoryButton isAll isSelected={selectedCategory === 'ALL'} onClick={() => {setSelectedCategory('ALL'); setIsCategoryExpanded(false);}} t={t} />
                {categories.map(cat => <CategoryButton key={cat.id} cat={cat} isSelected={selectedCategory === cat.id} onClick={() => {setSelectedCategory(cat.id); setIsCategoryExpanded(false);}} t={t} />)}
                <button onClick={() => setIsCategoryExpanded(false)} className="col-span-full py-2 text-slate-400 font-bold flex items-center justify-center"><ChevronUp size={20} /></button>
             </div>
        )}
      </div>

      <main className={`flex-1 overflow-y-auto p-4 ${isEditMode ? 'pb-40' : 'pb-32'}`}>
        <div className={`grid gap-4 max-w-7xl mx-auto ${getGridClass()}`}>
            {isEditMode && <button onClick={() => setIsCreateModalOpen(true)} className="aspect-[4/5] rounded-3xl border-4 border-dashed border-slate-300 flex flex-col items-center justify-center bg-slate-50 opacity-60 hover:opacity-100 transition-all"><Plus size={32} className="text-primary mb-2" /><span className="text-slate-500 font-bold">{t('modal.create.title_new')}</span></button>}
            {filteredLibrary.map((item) => {
                if (!item) return null;
                const style = getCardStyle(item.category);
                const isHidden = item.isVisible === false;
                return (
                    <div key={item.id} onClick={() => addToSentence(item)} className={`relative aspect-[4/5] rounded-3xl p-2 flex flex-col gap-2 border-b-4 border-r-4 shadow-sm active:border-0 active:translate-y-1 ${style.bg} ${style.border} ${isHidden ? 'opacity-50 grayscale' : ''}`}>
                        <div className="flex-1 w-full bg-white rounded-2xl overflow-hidden border-2 border-white/50"><img src={item.imageUrl} alt={item.label} className="w-full h-full object-cover" loading="lazy" /></div>
                        <div className="h-8 flex items-center justify-center"><span className={`font-black text-sm text-center line-clamp-1 ${style.text}`}>{item.label}</span></div>
                        {isEditMode && (
                            <div className="absolute top-0 right-0 flex gap-1 p-1">
                                <button onClick={(e) => { e.stopPropagation(); setEditingItem(item); setIsCreateModalOpen(true); }} className="p-2 bg-white rounded-full shadow-md text-blue-500"><Pencil size={14} /></button>
                                <button onClick={(e) => { e.stopPropagation(); setItemToDelete(item.id); }} className="p-2 bg-white rounded-full shadow-md text-red-500"><X size={14} /></button>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
      </main>

      {isEditMode && (
        <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-lg border-t border-slate-200 p-4 z-50 flex items-center justify-between" style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}>
            <button onClick={() => setIsCategoryManagerOpen(true)} className="flex flex-col items-center text-slate-500"><Layers size={24} /><span className="text-[10px] font-bold">{t('nav.categories')}</span></button>
            <button onClick={() => setIsCreateModalOpen(true)} className="w-16 h-16 bg-primary text-white rounded-2xl flex items-center justify-center border-4 border-white shadow-xl -mt-12"><Plus size={32} /></button>
            <button onClick={() => setIsSettingsOpen(true)} className="flex flex-col items-center text-slate-500"><Settings2 size={24} /><span className="text-[10px] font-bold">{t('nav.settings')}</span></button>
        </div>
      )}

      <CreateCardModal isOpen={isCreateModalOpen} onClose={() => { setIsCreateModalOpen(false); setEditingItem(null); }} onSave={handleSaveItem} editItem={editingItem} categories={categories} t={t} language={settings.language} />
      <CategoryManagerModal isOpen={isCategoryManagerOpen} onClose={() => setIsCategoryManagerOpen(false)} categories={categories} onSaveCategory={async (c) => { await saveCategory(c); loadData(); }} onDeleteCategory={handleDeleteCategory} t={t} />
      <ConfirmationModal isOpen={!!itemToDelete} onClose={() => setItemToDelete(null)} onConfirm={confirmDelete} t={t} />
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} settings={settings} onUpdateSettings={setSettings} onExportData={() => {}} onImportData={() => {}} t={t} />
      <HistoryModal isOpen={isHistoryOpen} onClose={() => setIsHistoryOpen(false)} historyIds={historyIds} library={library} onSelectSentence={setSentence} t={t} />
    </div>
  );
}

export default App;