import React, { useState, useEffect, useRef } from 'react';
import { Plus, Lock, Unlock, Image as ImageIcon, Search, X, Pencil, Settings2, Layers, ChevronDown, ChevronUp, Grid as GridIcon, Eye, EyeOff } from 'lucide-react';
import { AACItem, Category, ColorTheme, AppSettings, AppLanguage } from './types';
import { saveItem, getAllItems, deleteItem, getAllCategories, saveCategory, deleteCategory } from './services/storage';
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
  return new Promise((resolve, reject) => {
    const audio = new Audio(audioUrl);
    // Important for iOS: load audio before playing
    audio.load();
    audio.onended = () => resolve();
    audio.onerror = (e) => reject(e);
    audio.play().catch(reject);
  });
};

// Styles mapping based on ColorTheme
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
          className={`
              px-4 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap border-2 flex-shrink-0
              ${style.bg} ${style.text} ${style.border}
              ${isSelected ? 'shadow-btn translate-y-[-2px] border-current' : 'hover:border-slate-300 hover:bg-slate-50'}
          `}
      >
          {isAll ? t('nav.all') : cat?.label}
      </button>
  );
};

function App() {
  const [library, setLibrary] = useState<AACItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [sentence, setSentence] = useState<AACItem[]>([]);
  
  // Settings State
  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('aac_settings');
    // Migration for existing users who don't have language set
    const parsed = saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
    if (!parsed.language) parsed.language = 'en';
    return parsed;
  });

  // Modal States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isParentGateOpen, setIsParentGateOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<AACItem | null>(null);
  
  // Playback States
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  
  // History State
  const [history, setHistory] = useState<AACItem[][]>([]);
  
  // Delete Confirmation State
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  
  // UX State
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [isCategoryExpanded, setIsCategoryExpanded] = useState(false);
  
  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchActive, setIsSearchActive] = useState(false);

  // Unlock (Press & Hold) State
  const unlockTimerRef = useRef<number | null>(null);
  const ignoreNextClick = useRef(false);
  const [isHoldingUnlock, setIsHoldingUnlock] = useState(false);

  // Translation Helper
  const t = (key: TranslationKey) => getTranslation(settings.language, key);

  useEffect(() => {
    loadData();
    const savedHistory = localStorage.getItem('aac_history');
    if (savedHistory) {
        try {
            setHistory(JSON.parse(savedHistory));
        } catch (e) {
            console.error("Failed to parse history", e);
        }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('aac_settings', JSON.stringify(settings));
  }, [settings]);

  // Clear search when leaving edit mode
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
    await voiceService.speak({
      text,
      language: settings.language,
      rate: settings.voiceRate,
      pitch: settings.voicePitch,
    });
  };

  const handleSaveItem = async (itemData: Omit<AACItem, 'id' | 'createdAt'>) => {
    if (editingItem) {
        const updatedItem: AACItem = {
            ...editingItem,
            ...itemData,
        };
        await saveItem(updatedItem);
    } else {
        const newItem: AACItem = {
            ...itemData,
            id: crypto.randomUUID(),
            createdAt: Date.now(),
            isVisible: itemData.isVisible !== undefined ? itemData.isVisible : true,
        };
        await saveItem(newItem);
    }
    await loadData();
    setEditingItem(null);
  };

  const handleSaveCategory = async (cat: Category) => {
    await saveCategory(cat);
    await loadData();
  };

  const handleDeleteCategory = async (id: string) => {
    try {
        await deleteCategory(id);
        // Reset selection if current was deleted
        if (selectedCategory === id) setSelectedCategory('ALL');
        await loadData();
    } catch (error) {
        console.error("Failed to delete category", error);
    }
  };

  const handleEditItem = (item: AACItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingItem(item);
    setIsCreateModalOpen(true);
  };

  const toggleVisibility = async (item: AACItem, e: React.MouseEvent) => {
      e.stopPropagation();
      const updatedItem = { ...item, isVisible: !item.isVisible };
      await saveItem(updatedItem);
      await loadData();
  };

  const handleDeleteClick = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setItemToDelete(id);
  };

  const confirmDelete = async () => {
    if (itemToDelete) {
      await deleteItem(itemToDelete);
      await loadData();
      setItemToDelete(null);
    }
  };

  const addToSentence = (item: AACItem) => {
    setSentence([...sentence, item]);
    playItemSound(item);
  };

  const removeFromSentence = (index: number) => {
    const newSentence = [...sentence];
    newSentence.splice(index, 1);
    setSentence(newSentence);
  };

  const removeLastFromSentence = () => {
    setSentence((prev) => {
      if (prev.length === 0) return prev;
      const newSentence = [...prev];
      newSentence.pop();
      return newSentence;
    });
  };

  const clearSentence = () => setSentence([]);

  const playItemSound = async (item: AACItem) => {
    try {
      if (item.audioUrl) {
        await playAudio(item.audioUrl);
      } else {
        await speakText(item.textToSpeak || item.label);
      }
    } catch (e) {
      console.warn("Audio playback failed, falling back to TTS", e);
      await speakText(item.textToSpeak || item.label);
    }
  };

  const addToHistory = (items: AACItem[]) => {
      if (items.length === 0) return;
      const newHistory = [items, ...history].slice(0, 10); // Keep last 10
      setHistory(newHistory);
      localStorage.setItem('aac_history', JSON.stringify(newHistory));
  };

  const playSentence = async () => {
    if (sentence.length === 0 || isPlaying) return;
    
    // Add to history when played
    addToHistory(sentence);

    setIsPlaying(true);
    for (let i = 0; i < sentence.length; i++) {
      setActiveIndex(i);
      await playItemSound(sentence[i]);
      await new Promise(r => setTimeout(r, 200));
    }
    setActiveIndex(null);
    setIsPlaying(false);
  };

  const handleModalClose = () => {
      setIsCreateModalOpen(false);
      setEditingItem(null);
  };

  const startUnlock = () => {
    if (isEditMode) return;
    setIsHoldingUnlock(true);
    unlockTimerRef.current = window.setTimeout(() => {
      setIsEditMode(true);
      setIsHoldingUnlock(false);
      ignoreNextClick.current = true;
      if (navigator.vibrate) navigator.vibrate([50, 50, 50]);
    }, 3000);
  };

  const cancelUnlock = () => {
    if (unlockTimerRef.current) {
      clearTimeout(unlockTimerRef.current);
      unlockTimerRef.current = null;
    }
    setIsHoldingUnlock(false);
  };

  const handleLockClick = () => {
      if (ignoreNextClick.current) {
          ignoreNextClick.current = false;
          return;
      }
      if (isEditMode) {
          setIsEditMode(false);
      }
  };

  const exportData = () => {
    const data = {
        items: library,
        categories: categories,
        version: 1
    };
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `speakeasy-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const importData = (file: File) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
          try {
              const json = JSON.parse(e.target?.result as string);
              if (json.items && Array.isArray(json.items)) {
                  for (const item of json.items) {
                      await saveItem(item);
                  }
              }
              if (json.categories && Array.isArray(json.categories)) {
                  for (const cat of json.categories) {
                      await saveCategory(cat);
                  }
              }
              await loadData();
              alert("Backup restored successfully!");
              setIsSettingsOpen(false);
          } catch (err) {
              alert("Failed to parse backup file.");
              console.error(err);
          }
      };
      reader.readAsText(file);
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

  const getGridClass = () => {
      switch (settings.gridColumns) {
          case 'large': return 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4';
          case 'small': return 'grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8';
          default: return 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6';
      }
  };

  return (
    <div className="h-screen w-full bg-background pattern-grid flex flex-col overflow-hidden font-sans">
      
      {/* Header */}
      <div className="flex justify-between items-center px-4 py-3 bg-white/90 backdrop-blur-sm border-b border-slate-200 z-20 shrink-0 transition-all"
           style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}
      >
        {isSearchActive ? (
            <div className="flex-1 flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="relative flex-1">
                    <input 
                        type="text" 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder={t('search.placeholder')}
                        autoFocus
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-100 border-2 border-primary/20 rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none font-bold text-slate-700 placeholder-slate-400"
                    />
                    <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                </div>
                <button 
                    onClick={() => { setIsSearchActive(false); setSearchQuery(''); }}
                    className="p-2.5 bg-slate-100 text-slate-500 rounded-xl hover:bg-slate-200 hover:text-slate-800"
                >
                    <X size={20} />
                </button>
            </div>
        ) : (
            <>
                <div className="flex items-center space-x-2">
                <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center text-white font-black text-lg shadow-md shadow-primary/20">
                    S
                </div>
                <h1 className="font-extrabold text-slate-700 text-xl tracking-tight hidden sm:block">{t('app.title')}</h1>
                </div>
                
                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => setIsSearchActive(true)}
                        className={`
                            p-2.5 rounded-full transition-all duration-200
                            ${searchQuery ? 'bg-primary text-white shadow-sm' : 'bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-600'}
                        `}
                    >
                        <Search size={20} strokeWidth={2.5} />
                    </button>

                    <button 
                        onMouseDown={startUnlock}
                        onMouseUp={cancelUnlock}
                        onMouseLeave={cancelUnlock}
                        onTouchStart={startUnlock}
                        onTouchEnd={cancelUnlock}
                        onContextMenu={(e) => e.preventDefault()}
                        onClick={handleLockClick}
                        className={`
                            relative overflow-hidden select-none
                            p-2 pr-4 rounded-full transition-all duration-300 flex items-center space-x-2 border-2 
                            ${isEditMode 
                                ? 'bg-red-50 border-red-200 text-red-600' 
                                : 'bg-white border-slate-200 text-slate-400 hover:bg-slate-50'}
                        `}
                    >
                        {!isEditMode && (
                            <div 
                                className={`absolute inset-0 bg-slate-200/80 transition-transform ease-linear origin-left ${isHoldingUnlock ? 'scale-x-100 duration-[3000ms]' : 'scale-x-0 duration-75'}`}
                            />
                        )}
                        <div className={`relative z-10 p-1.5 rounded-full ${isEditMode ? 'bg-red-100' : 'bg-slate-100'}`}>
                            {isEditMode ? <Unlock size={16} /> : <Lock size={16} />}
                        </div>
                        <div className="relative z-10 flex flex-col items-start">
                            <span className="text-xs font-bold uppercase tracking-wider leading-none">
                                {isHoldingUnlock ? t('mode.holding') : (isEditMode ? t('mode.parent') : t('mode.child'))}
                            </span>
                            <span className="text-[10px] font-semibold opacity-70 leading-none mt-0.5">
                                    {isHoldingUnlock ? t('mode.keep_pressing') : (isEditMode ? t('mode.tap_lock') : t('mode.hold_edit'))}
                            </span>
                        </div>
                    </button>
                </div>
            </>
        )}
      </div>

      {/* Sentence Strip */}
      <div className="z-30 shadow-xl shrink-0">
        <SentenceStrip 
          items={sentence}
          categories={categories}
          onRemoveItem={removeFromSentence}
          onRemoveLastItem={removeLastFromSentence}
          onClear={clearSentence}
          onPlay={playSentence}
          onShowHistory={() => setIsHistoryOpen(true)}
          isPlaying={isPlaying}
          activeIndex={activeIndex}
          t={t}
        />
      </div>

      {/* Category Navigation */}
      <div className="relative shrink-0 bg-white/50 border-b border-slate-200/60 z-20 backdrop-blur-md">
        <div className={`flex items-center ${isCategoryExpanded ? 'opacity-0 pointer-events-none h-0' : 'opacity-100 h-auto'}`}>
             {/* Added min-w-0 to ensure flex child scrolls correctly */}
             <div 
                className="flex-1 min-w-0 overflow-x-auto overflow-y-hidden no-scrollbar flex space-x-2 px-4 py-3 relative overscroll-x-contain"
                style={{ WebkitOverflowScrolling: 'touch' }}
             >
                <CategoryButton isAll isSelected={searchQuery ? true : selectedCategory === 'ALL'} onClick={() => { if(searchQuery){setSearchQuery(''); setIsSearchActive(false);} setSelectedCategory('ALL'); setIsCategoryExpanded(false); }} t={t} />
                {categories.map(cat => (
                    <CategoryButton key={cat.id} cat={cat} isSelected={!searchQuery && selectedCategory === cat.id} onClick={() => { if(searchQuery){setSearchQuery(''); setIsSearchActive(false);} setSelectedCategory(cat.id); setIsCategoryExpanded(false); }} t={t} />
                ))}
                <div className="w-8 flex-shrink-0"></div>
             </div>
             
             <div className="absolute left-0 top-0 bottom-0 w-4 bg-gradient-to-r from-white/80 to-transparent pointer-events-none"></div>
             <div className="absolute right-12 top-0 bottom-0 w-8 bg-gradient-to-l from-white/80 to-transparent pointer-events-none"></div>

             <button 
                onClick={() => setIsCategoryExpanded(true)}
                className="absolute right-0 top-0 bottom-0 w-12 flex items-center justify-center bg-white/80 backdrop-blur-sm text-slate-500 border-l border-slate-100 hover:text-primary active:bg-slate-100"
             >
                 <ChevronDown size={20} />
             </button>
        </div>

        {isCategoryExpanded && (
             <div className="absolute top-0 left-0 right-0 bg-white shadow-2xl border-b border-slate-200 animate-in slide-in-from-top-2 duration-200 z-50 pb-6">
                <div className="flex justify-between items-center p-3 border-b border-slate-100 bg-slate-50/50 mb-2">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider pl-2">{t('modal.create.category')}</span>
                    <button 
                        onClick={() => setIsCategoryExpanded(false)}
                        className="p-2 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200"
                    >
                        <ChevronUp size={20} />
                    </button>
                </div>
                <div className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 max-h-[50vh] overflow-y-auto">
                    <CategoryButton isAll isSelected={searchQuery ? true : selectedCategory === 'ALL'} onClick={() => { if(searchQuery){setSearchQuery(''); setIsSearchActive(false);} setSelectedCategory('ALL'); setIsCategoryExpanded(false); }} t={t} />
                    {categories.map(cat => (
                        <CategoryButton key={cat.id} cat={cat} isSelected={!searchQuery && selectedCategory === cat.id} onClick={() => { if(searchQuery){setSearchQuery(''); setIsSearchActive(false);} setSelectedCategory(cat.id); setIsCategoryExpanded(false); }} t={t} />
                    ))}
                </div>
             </div>
        )}
        
        {isCategoryExpanded && (
            <div 
                className="fixed inset-0 bg-black/20 z-[-1]" 
                onClick={() => setIsCategoryExpanded(false)}
            />
        )}
      </div>

      {/* Main Library Grid */}
      <main className={`flex-1 overflow-y-auto p-4 sm:p-6 ${isEditMode ? 'pb-40' : 'pb-32'}`}>
        <div className={`grid gap-4 sm:gap-6 max-w-7xl mx-auto ${getGridClass()}`}>
            
            {library.length === 0 ? (
                <div className="col-span-full flex flex-col items-center justify-center py-10 sm:py-20 text-center px-4 animate-in fade-in zoom-in duration-500">
                    <div className="w-32 h-32 bg-primary/10 rounded-full flex items-center justify-center mb-6 animate-pulse">
                        <ImageIcon size={64} className="text-primary/40" />
                    </div>
                    <h2 className="text-3xl font-black text-slate-800 mb-3">{t('empty.welcome')}</h2>
                    <p className="text-slate-500 mb-8 max-w-md text-lg leading-relaxed">
                        {t('empty.instruction')}
                    </p>
                </div>
            ) : (
                <>
                    {isEditMode && (
                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="aspect-[4/5] rounded-3xl border-4 border-dashed border-slate-300 hover:border-primary hover:bg-white flex flex-col items-center justify-center group transition-all active:scale-95 bg-slate-50 opacity-60 hover:opacity-100"
                    >
                        <div className="w-12 h-12 bg-white border-2 border-slate-200 text-primary rounded-full flex items-center justify-center mb-2 shadow-sm">
                            <Plus size={24} strokeWidth={3} />
                        </div>
                        <span className="text-slate-500 font-bold text-sm">{t('modal.create.title_new')}</span>
                    </button>
                    )}

                    {filteredLibrary.map((item) => {
                        const style = getCardStyle(item.category);
                        const isHidden = item.isVisible === false;
                        
                        return (
                            <div
                                key={item.id}
                                onClick={() => addToSentence(item)}
                                className={`
                                    relative aspect-[4/5] rounded-3xl p-2 flex flex-col gap-2 cursor-pointer transition-all duration-150
                                    border-b-4 border-r-4 active:border-b-0 active:border-r-0 active:translate-y-1 active:translate-x-1
                                    ${style.bg} ${style.border} shadow-sm hover:brightness-105 group
                                    ${isHidden ? 'opacity-50 grayscale bg-slate-100 border-slate-300' : ''}
                                `}
                            >
                                <div className="flex-1 w-full bg-white rounded-2xl overflow-hidden shadow-inner border-2 border-white/50 relative">
                                    <img 
                                        src={item.imageUrl} 
                                        alt={item.label} 
                                        className="w-full h-full object-cover"
                                        loading="lazy"
                                    />
                                    <div className="absolute inset-0 bg-black opacity-0 group-active:opacity-10 transition-opacity" />
                                    {isHidden && isEditMode && (
                                        <div className="absolute inset-0 bg-slate-900/10 flex items-center justify-center pointer-events-none">
                                            <div className="bg-slate-900/60 p-2 rounded-full text-white backdrop-blur-sm">
                                                <EyeOff size={24} />
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div className="h-8 w-full flex items-center justify-center">
                                    <span className={`font-black text-sm sm:text-lg leading-tight text-center line-clamp-1 px-1 ${style.text}`}>
                                        {item.label}
                                    </span>
                                </div>
                                
                                {isEditMode && (
                                    <>
                                        <button 
                                            onClick={(e) => handleDeleteClick(item.id, e)}
                                            className="absolute -top-2 -right-2 bg-white text-red-500 border-2 border-red-100 p-2 rounded-full shadow-md hover:bg-red-50 hover:scale-110 transition-transform z-20"
                                            title={t('modal.confirm.delete_title')}
                                        >
                                            <X size={16} strokeWidth={3} />
                                        </button>
                                        <button 
                                            onClick={(e) => handleEditItem(item, e)}
                                            className="absolute -top-2 right-8 bg-white text-blue-500 border-2 border-blue-100 p-2 rounded-full shadow-md hover:bg-blue-50 hover:scale-110 transition-transform z-20"
                                            title={t('modal.create.title_edit')}
                                        >
                                            <Pencil size={16} strokeWidth={3} />
                                        </button>
                                        <button 
                                            onClick={(e) => toggleVisibility(item, e)}
                                            className={`absolute -top-2 left-[-8px] bg-white border-2 p-2 rounded-full shadow-md hover:scale-110 transition-transform z-20 ${isHidden ? 'text-slate-400 border-slate-200' : 'text-primary border-violet-100'}`}
                                            title={isHidden ? t('modal.create.visible') : t('modal.create.hidden')}
                                        >
                                            {isHidden ? <EyeOff size={16} strokeWidth={3} /> : <Eye size={16} strokeWidth={3} />}
                                        </button>
                                    </>
                                )}
                            </div>
                        );
                    })}

                    {filteredLibrary.length === 0 && library.length > 0 && (
                    <div className="col-span-full flex flex-col items-center justify-center py-20 text-slate-400 opacity-60">
                        <Search size={48} className="mb-4" />
                        <p className="text-lg font-bold">
                            {searchQuery ? `${t('search.no_results')} "${searchQuery}"` : t('empty.no_cards')}
                        </p>
                        {!isEditMode && !searchQuery && (
                            <p className="text-sm mt-2">{t('empty.hidden_hint')}</p>
                        )}
                    </div>
                    )}
                </>
            )}
        </div>
      </main>

      {isEditMode && (
        <div 
            className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-lg border-t border-slate-200 p-4 z-50 flex items-center justify-between animate-in slide-in-from-bottom-full duration-300 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]"
            style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}
        >
            
            <button 
                onClick={() => setIsCategoryManagerOpen(true)}
                className={`flex flex-col items-center space-y-1 transition-all w-20 ${isSearchActive ? 'hidden sm:flex' : 'flex'} text-slate-500 hover:text-slate-800 active:scale-95`}
            >
                <div className="p-2 bg-slate-100 rounded-xl">
                    <Layers size={24} />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wide">{t('nav.categories')}</span>
            </button>

            {/* Centered Add Card Button */}
            <div className="absolute left-1/2 -translate-x-1/2 -top-12">
                 <button 
                    onClick={() => setIsCreateModalOpen(true)}
                    className="flex flex-col items-center justify-center active:scale-95 transition-transform"
                >
                    <div className="w-16 h-16 bg-primary text-white rounded-2xl shadow-xl shadow-primary/30 flex items-center justify-center border-4 border-white">
                        <Plus size={32} strokeWidth={3} />
                    </div>
                    <span className="mt-2 text-xs font-black text-primary uppercase tracking-wide bg-white/80 px-2 py-0.5 rounded-md shadow-sm backdrop-blur-sm">{t('nav.add_card')}</span>
                </button>
            </div>

            <button 
                onClick={() => setIsSettingsOpen(true)}
                className={`flex flex-col items-center space-y-1 transition-all w-20 ${isSearchActive ? 'hidden sm:flex' : 'flex'} text-slate-500 hover:text-slate-800 active:scale-95`}
            >
                <div className="p-2 bg-slate-100 rounded-xl">
                    <Settings2 size={24} />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wide">{t('nav.settings')}</span>
            </button>
        </div>
      )}

      <CreateCardModal 
        isOpen={isCreateModalOpen}
        onClose={handleModalClose}
        onSave={handleSaveItem}
        editItem={editingItem}
        categories={categories}
        t={t}
        language={settings.language}
      />
      
      <CategoryManagerModal
        isOpen={isCategoryManagerOpen}
        onClose={() => setIsCategoryManagerOpen(false)}
        categories={categories}
        onSaveCategory={handleSaveCategory}
        onDeleteCategory={handleDeleteCategory}
        t={t}
      />
      
      <ConfirmationModal 
        isOpen={!!itemToDelete}
        onClose={() => setItemToDelete(null)}
        onConfirm={confirmDelete}
        t={t}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={setSettings}
        onExportData={exportData}
        onImportData={importData}
        t={t}
      />

      <HistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        history={history}
        onSelectSentence={setSentence}
        t={t}
      />
      
      <ParentGateModal 
        isOpen={isParentGateOpen}
        onClose={() => setIsParentGateOpen(false)}
        onSuccess={() => {/* logic moved to long press, keeping for completeness if needed */}}
        t={t}
      />
    </div>
  );
}

export default App;