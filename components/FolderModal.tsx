import React, { useState, useEffect, useRef } from 'react';
import { X, Folder, Check, Search, Info, Globe, Loader2, Image as ImageIcon } from 'lucide-react';
import { Category, ColorTheme, AppLanguage } from '../types';
import { getAvailableIcons, getIconComponent } from '../utils/icons';
import { searchArasaacSymbols, ArasaacSymbol } from '../services/arasaac';
import { TranslationKey } from '../services/translations';

interface FolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (label: string, color: ColorTheme, icon: string) => void;
  editFolder?: Category | null;
  t: (key: TranslationKey) => string;
  language: AppLanguage;
}

const FITZGERALD_THEMES: { theme: ColorTheme; bg: string; border: string; labelKey: TranslationKey; descKey: TranslationKey }[] = [
  { theme: 'yellow', bg: 'bg-yellow-100', border: 'border-yellow-400', labelKey: 'fitzgerald.people', descKey: 'fitzgerald.people_desc' },
  { theme: 'green', bg: 'bg-green-100', border: 'border-green-400', labelKey: 'fitzgerald.verbs', descKey: 'fitzgerald.verbs_desc' },
  { theme: 'orange', bg: 'bg-orange-100', border: 'border-orange-400', labelKey: 'fitzgerald.nouns', descKey: 'fitzgerald.nouns_desc' },
  { theme: 'blue', bg: 'bg-blue-100', border: 'border-blue-400', labelKey: 'fitzgerald.adjectives', descKey: 'fitzgerald.adjectives_desc' },
  { theme: 'pink', bg: 'bg-pink-100', border: 'border-pink-400', labelKey: 'fitzgerald.social', descKey: 'fitzgerald.social_desc' },
  { theme: 'purple', bg: 'bg-purple-100', border: 'border-purple-400', labelKey: 'fitzgerald.places', descKey: 'fitzgerald.places_desc' },
  { theme: 'red', bg: 'bg-red-100', border: 'border-red-400', labelKey: 'fitzgerald.emergency', descKey: 'fitzgerald.emergency_desc' },
  { theme: 'teal', bg: 'bg-teal-100', border: 'border-teal-400', labelKey: 'fitzgerald.time', descKey: 'fitzgerald.time_desc' },
  { theme: 'slate', bg: 'bg-slate-100', border: 'border-slate-400', labelKey: 'fitzgerald.misc', descKey: 'fitzgerald.misc_desc' },
];

const FolderModal: React.FC<FolderModalProps> = ({ isOpen, onClose, onSave, editFolder, t, language }) => {
  const [label, setLabel] = useState('');
  const [colorTheme, setColorTheme] = useState<ColorTheme>('yellow');
  const [selectedIcon, setSelectedIcon] = useState('folder');
  const [iconSearch, setIconSearch] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  
  // Web Symbols State
  const [webSymbols, setWebSymbols] = useState<ArasaacSymbol[]>([]);
  const [isSearchingWeb, setIsSearchingWeb] = useState(false);
  const searchTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (editFolder) {
        setLabel(editFolder.label);
        setColorTheme(editFolder.colorTheme);
        setSelectedIcon(editFolder.icon || 'folder');
      } else {
        setLabel('');
        setColorTheme('yellow');
        setSelectedIcon('folder');
      }
      setIconSearch('');
      setWebSymbols([]);
      setIsSaving(false);
    }
  }, [isOpen, editFolder]);

  // Handle Search Debounce
  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    
    if (iconSearch.length >= 3) {
        setIsSearchingWeb(true);
        searchTimeoutRef.current = window.setTimeout(async () => {
            const langCode = language === 'ru' ? 'ru' : 'en';
            const results = await searchArasaacSymbols(iconSearch, langCode);
            setWebSymbols(results);
            setIsSearchingWeb(false);
        }, 600);
    } else {
        setWebSymbols([]);
        setIsSearchingWeb(false);
    }
    
    return () => {
        if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [iconSearch, language]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (label.trim()) {
      setIsSaving(true);
      let finalIcon = selectedIcon;

      // If it's a web URL (ARASAAC or other), try to download and convert to Base64 
      // This allows the icon to work offline.
      if (selectedIcon.startsWith('http')) {
         try {
             // 5 second timeout to prevent hanging
             const controller = new AbortController();
             const timeoutId = setTimeout(() => controller.abort(), 5000);
             
             const res = await fetch(selectedIcon, { signal: controller.signal });
             clearTimeout(timeoutId);
             
             if (res.ok) {
                const blob = await res.blob();
                finalIcon = await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result as string);
                    reader.onerror = reject;
                    reader.readAsDataURL(blob);
                });
             } else {
                 console.warn("Could not download symbol, using URL directly.");
             }
         } catch(e) {
             console.error("Failed to download icon for offline use, saving URL instead.", e);
             // Fallback to URL - it will work online at least
         }
      }

      onSave(label.trim(), colorTheme, finalIcon);
      setIsSaving(false);
      onClose();
    }
  };

  const localIcons = getAvailableIcons().filter(icon => 
    icon.toLowerCase().includes(iconSearch.toLowerCase())
  );

  const isImageIcon = selectedIcon.startsWith('http') || selectedIcon.startsWith('data:');
  const SelectedIconComp = !isImageIcon ? getIconComponent(selectedIcon) : null;
  const selectedTheme = FITZGERALD_THEMES.find(t => t.theme === colorTheme) || FITZGERALD_THEMES[0];

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border-4 border-white animate-in zoom-in-95 duration-200">
        
        <div className="flex justify-between items-center p-5 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center space-x-3">
             <div className={`w-10 h-10 rounded-xl transition-colors ${selectedTheme.bg} border-2 ${selectedTheme.border} flex items-center justify-center overflow-hidden`}>
                {isImageIcon ? (
                    <img src={selectedIcon} alt="" className="w-full h-full object-contain p-1" />
                ) : (
                    SelectedIconComp && <SelectedIconComp size={20} className="text-slate-800" />
                )}
             </div>
             <h2 className="text-xl font-black text-slate-800">
               {editFolder ? t('folder.edit') : t('folder.new')}
             </h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-200 text-slate-600"><X size={24} /></button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          
          <div className="p-6 space-y-6 flex-1 overflow-y-auto">
            {/* Name Input */}
            <div>
              <label className="block text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">{t('folder.name_label')}</label>
              <input 
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder={t('folder.name_placeholder')}
                className="w-full px-4 py-3 bg-slate-50 rounded-xl border-2 border-slate-200 focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none text-xl font-bold text-slate-800"
                autoFocus
              />
            </div>

            {/* Color Picker */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-bold text-slate-500 uppercase tracking-wider">
                    {t('folder.color_label')}
                </label>
                <div className="group relative">
                    <Info size={16} className="text-slate-400 cursor-help" />
                    <div className="absolute right-0 bottom-full mb-2 w-48 bg-slate-800 text-white text-xs p-2 rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                        {t('folder.color_desc')}
                    </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {FITZGERALD_THEMES.map((c) => (
                  <button
                    key={c.theme}
                    type="button"
                    onClick={() => setColorTheme(c.theme)}
                    className={`
                      flex items-center space-x-3 p-2 rounded-xl border-2 transition-all text-left
                      ${colorTheme === c.theme 
                        ? `${c.bg} ${c.border} ring-2 ring-primary/20` 
                        : 'bg-white border-slate-100 hover:border-slate-200'}
                    `}
                  >
                    <div className={`w-10 h-10 rounded-full border-2 ${c.bg} ${c.border} shadow-sm flex-shrink-0`} />
                    <div className="flex-1 min-w-0">
                        <p className={`text-sm font-bold ${colorTheme === c.theme ? 'text-slate-900' : 'text-slate-600'}`}>{t(c.labelKey)}</p>
                        <p className="text-xs text-slate-400 font-medium">{t(c.descKey)}</p>
                    </div>
                    {colorTheme === c.theme && <Check size={16} className="text-slate-800" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Icon Picker */}
            <div className="flex-1 flex flex-col min-h-[300px]">
              <div className="mb-2">
                 <label className="block text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">{t('folder.icon_search_label')}</label>
                 <div className="relative w-full">
                     <input 
                        type="text" 
                        value={iconSearch}
                        onChange={(e) => setIconSearch(e.target.value)}
                        placeholder={t('search.placeholder')}
                        className="w-full pl-10 pr-4 py-3 bg-slate-100 focus:bg-white border-2 border-slate-200 focus:border-primary rounded-xl text-lg font-bold text-slate-900 placeholder:text-slate-400 outline-none transition-all"
                     />
                     <Search size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                 </div>
                 {iconSearch.length > 0 && iconSearch.length < 3 && (
                     <p className="text-xs text-slate-400 mt-1 pl-1">{t('folder.icon_search_hint')}</p>
                 )}
              </div>
              
              <div className="bg-slate-50 rounded-2xl border-2 border-slate-100 p-3 flex-1 overflow-y-auto max-h-[300px]">
                  
                  {/* ARASAAC Results */}
                  {webSymbols.length > 0 && (
                      <div className="mb-6">
                          <div className="flex items-center gap-2 mb-3 px-1">
                              <Globe size={16} className="text-blue-500"/>
                              <span className="text-xs font-bold text-blue-500 uppercase tracking-wide">{t('folder.web_symbols')}</span>
                          </div>
                          <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
                             {webSymbols.map((symbol) => (
                                  <button
                                      key={symbol.id}
                                      type="button"
                                      onClick={() => setSelectedIcon(symbol.url)}
                                      className={`
                                          aspect-square rounded-xl flex items-center justify-center transition-all bg-white p-2 border-2
                                          ${selectedIcon === symbol.url
                                              ? 'border-primary shadow-md scale-105 ring-2 ring-offset-1 ring-primary/30' 
                                              : 'border-slate-100 hover:border-slate-300 hover:shadow-sm'}
                                      `}
                                  >
                                      <img src={symbol.url} alt="" className="w-full h-full object-contain" />
                                  </button>
                             ))}
                          </div>
                      </div>
                  )}

                  {isSearchingWeb && (
                      <div className="flex items-center justify-center py-6 space-x-2 text-slate-400">
                          <Loader2 size={20} className="animate-spin" />
                          <span className="text-sm font-bold">{t('folder.searching')}</span>
                      </div>
                  )}

                  {/* Standard Icons */}
                  <div className="mb-3 px-1 flex items-center gap-2 mt-2">
                       <ImageIcon size={16} className="text-slate-400"/>
                       <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">{t('folder.builtin_icons')}</span>
                  </div>
                  <div className="grid grid-cols-5 sm:grid-cols-6 gap-3">
                      {localIcons.map((iconName) => {
                          const IconComp = getIconComponent(iconName);
                          const isSelected = selectedIcon === iconName;
                          return (
                              <button
                                  key={iconName}
                                  type="button"
                                  onClick={() => setSelectedIcon(iconName)}
                                  className={`
                                      aspect-square rounded-xl flex items-center justify-center transition-all
                                      ${isSelected 
                                          ? 'bg-primary text-white shadow-md scale-105 ring-2 ring-offset-1 ring-primary/30' 
                                          : 'bg-white text-slate-500 hover:bg-slate-100 hover:text-primary hover:shadow-sm border border-slate-100'}
                                  `}
                                  title={iconName}
                              >
                                  <IconComp size={24} />
                              </button>
                          );
                      })}
                      {localIcons.length === 0 && !isSearchingWeb && webSymbols.length === 0 && (
                          <div className="col-span-full py-8 text-center text-slate-400 text-sm font-bold">
                              {t('folder.no_icons')}
                          </div>
                      )}
                  </div>
              </div>
            </div>
          </div>

          <div 
            className="p-4 border-t border-slate-100 bg-white"
            style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}
          >
            <button
                type="submit"
                disabled={!label.trim() || isSaving}
                className="w-full py-4 bg-primary text-white rounded-2xl font-black text-lg shadow-btn active:shadow-btn-active active:translate-y-1 transition-all flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {isSaving ? <Loader2 size={24} className="animate-spin" /> : <Check size={20} strokeWidth={3} />}
                <span>{isSaving ? t('folder.saving') : t('folder.save')}</span>
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

export default FolderModal;