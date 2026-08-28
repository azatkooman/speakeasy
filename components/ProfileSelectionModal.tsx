
import React, { useState, useEffect } from 'react';
import { User, Plus, Check, X, Trash2, Baby, Loader2, Globe, Pencil, Upload, AlertTriangle } from 'lucide-react';
import { ChildProfile, ColorTheme, AppLanguage } from '../types';
import { TranslationKey } from '../services/translations';
import { LANGUAGES } from '../utils/languages';
import Dialog from './Dialog.tsx';
import { useSpeakEasy } from '../contexts/SpeakEasyContext.tsx';
import { TransferCancelledError } from '../utils/fileTransfer';

interface ProfileSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  profiles: ChildProfile[];
  currentProfileId: string;
  onSelectProfile: (id: string) => void;
  onCreateProfile: (name: string, age: number, color: ColorTheme) => Promise<void>;
  onUpdateProfile: (profile: ChildProfile) => Promise<void>;
  onDeleteProfile: (id: string) => Promise<void>;
  t: (key: TranslationKey) => string;
  forceCreate?: boolean; // If true, cannot close without selecting/creating
  language: AppLanguage;
  onUpdateLanguage: (lang: AppLanguage) => void;
}

const AVATAR_COLORS: { theme: ColorTheme; bg: string; border: string; text: string; labelKey: TranslationKey }[] = [
  { theme: 'blue', bg: 'bg-blue-200', border: 'border-blue-500', text: 'text-blue-900', labelKey: 'a11y.color_blue' },
  { theme: 'pink', bg: 'bg-pink-200', border: 'border-pink-500', text: 'text-pink-900', labelKey: 'a11y.color_pink' },
  { theme: 'green', bg: 'bg-green-200', border: 'border-green-500', text: 'text-green-900', labelKey: 'a11y.color_green' },
  { theme: 'purple', bg: 'bg-purple-200', border: 'border-purple-500', text: 'text-purple-900', labelKey: 'a11y.color_purple' },
  { theme: 'orange', bg: 'bg-orange-200', border: 'border-orange-500', text: 'text-orange-900', labelKey: 'a11y.color_orange' },
  { theme: 'yellow', bg: 'bg-yellow-200', border: 'border-yellow-500', text: 'text-yellow-900', labelKey: 'a11y.color_yellow' },
];

const ProfileSelectionModal: React.FC<ProfileSelectionModalProps> = ({
  isOpen,
  onClose,
  profiles,
  currentProfileId,
  onSelectProfile,
  onCreateProfile,
  onUpdateProfile,
  onDeleteProfile,
  t,
  forceCreate = false,
  language,
  onUpdateLanguage
}) => {
  const [view, setView] = useState<'list' | 'create' | 'edit'>('list');

  /*
   * Restoring from here, not only from Settings. Backup lives behind parent
   * mode, which needs a board — so on a replacement tablet the parent had to
   * invent a throwaway child before they could get the real one back. This is
   * the screen they are actually looking at when that happens.
   */
  const { importProfileFile } = useSpeakEasy();
  const [restoring, setRestoring] = useState(false);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const restoreInput = React.useRef<HTMLInputElement>(null);

  const runRestore = async (file: File) => {
      setRestoring(true);
      setRestoreError(null);
      try {
          await importProfileFile(file);
          // The app has switched to the restored child; get out of the way so
          // the parent can see their board.
          onClose();
      } catch (e) {
          if (!(e instanceof TransferCancelledError)) {
              setRestoreError(e instanceof Error ? e.message : String(e));
          }
      } finally {
          setRestoring(false);
      }
  };
  const [editingProfile, setEditingProfile] = useState<ChildProfile | null>(null);
  
  const [newName, setNewName] = useState('');
  const [newAge, setNewAge] = useState('');
  const [newColor, setNewColor] = useState<ColorTheme>('blue');
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [profileToDelete, setProfileToDelete] = useState<string | null>(null);
  const [isLanguageMenuOpen, setIsLanguageMenuOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
        // If forceCreate and no profiles, show create view immediately
        if (forceCreate && profiles.length === 0) {
            setView('create');
        } else {
            setView('list');
        }
        setNewName('');
        setNewAge('');
        setNewColor('blue');
        setEditingProfile(null);
        setProfileToDelete(null);
        setIsProcessing(false);
        setIsLanguageMenuOpen(false);
        // Returning null does not unmount, so a stale error would reappear.
        setRestoreError(null);
        setRestoring(false);
    }
  }, [isOpen, forceCreate, profiles.length]);

  const handleStartEdit = (profile: ChildProfile, e: React.MouseEvent) => {
      e.stopPropagation();
      setEditingProfile(profile);
      setNewName(profile.name);
      setNewAge(profile.age.toString());
      setNewColor(profile.colorTheme);
      setView('edit');
  };

  const handleCreateOrUpdate = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!newName.trim()) return;
      
      setIsProcessing(true);
      try {
          if (view === 'edit' && editingProfile) {
              await onUpdateProfile({
                  ...editingProfile,
                  name: newName.trim(),
                  age: parseInt(newAge) || 0,
                  colorTheme: newColor
              });
              setView('list');
              setEditingProfile(null);
          } else {
              await onCreateProfile(newName.trim(), parseInt(newAge) || 0, newColor);
              // UX Improvement: Close immediately on creation to start using the profile
              onClose();
          }
      } catch (e) {
          console.error(e);
      } finally {
          setIsProcessing(false);
      }
  };

  const handleDelete = async (id: string) => {
      setIsProcessing(true);
      try {
          await onDeleteProfile(id);
          setProfileToDelete(null);
      } finally {
          setIsProcessing(false);
      }
  };

  const getTitle = () => {
      if (view === 'create') return t('profile.create');
      if (view === 'edit') return t('profile.edit');
      return t('profile.title');
  };

  // Children of <Dialog> are evaluated before they are passed to it, so a

  // closed dialog must not render at all — its body reads state that only

  // exists while it is open.
  if (!isOpen) return null;


  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      label={getTitle()}
      scrimClassName="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 animate-in fade-in duration-300"
      panelClassName="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] border-4 border-white relative"
    >
        
        {/* Header */}
        <div className="flex justify-between items-center p-5 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center space-x-2">
             <div className="p-2 bg-indigo-100 text-indigo-600 rounded-xl"><User size={24} /></div>
             <h2 className="text-2xl font-black text-slate-800">{getTitle()}</h2>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Language Picker */}
            <div className="relative">
                <button
                    onClick={() => setIsLanguageMenuOpen(o => !o)}
                    type="button"
                    aria-haspopup="listbox"
                    aria-expanded={isLanguageMenuOpen}
                    aria-label={t('modal.profile.change_language')}
                    className="flex items-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-600 font-bold transition-colors"
                    title={t('modal.profile.change_language')}
                >
                    <Globe size={18} />
                    <span className="text-sm uppercase">{language}</span>
                </button>

                {isLanguageMenuOpen && (
                    <>
                        {/* Click-outside catcher */}
                        <div className="fixed inset-0 z-10" onClick={() => setIsLanguageMenuOpen(false)} />
                        <ul
                            role="listbox"
                            aria-label={t('modal.profile.change_language')}
                            className="absolute right-0 top-full mt-2 w-44 bg-white rounded-2xl shadow-2xl border-2 border-slate-100 overflow-hidden z-20 animate-in fade-in slide-in-from-top-1 duration-150"
                        >
                            {LANGUAGES.map(opt => {
                                const isCurrent = opt.code === language;
                                return (
                                    <li key={opt.code} role="option" aria-selected={isCurrent}>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                onUpdateLanguage(opt.code);
                                                setIsLanguageMenuOpen(false);
                                            }}
                                            className={`
                                                w-full flex items-center justify-between px-4 py-3 text-left font-bold transition-colors
                                                ${isCurrent
                                                    ? 'bg-indigo-50 text-indigo-700'
                                                    : 'text-slate-600 hover:bg-slate-50'}
                                            `}
                                        >
                                            <span>{opt.nativeLabel}</span>
                                            {isCurrent && <Check size={18} strokeWidth={3} />}
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    </>
                )}
            </div>

            {!forceCreate && (
                <button aria-label={t('common.close')} onClick={onClose} disabled={isProcessing} className="p-2.5 rounded-full hover:bg-slate-200 text-slate-600 disabled:opacity-50">
                    <X size={24} />
                </button>
            )}
          </div>
        </div>

        {view === 'list' && (
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
                 {profiles.map(profile => {
                     const style = AVATAR_COLORS.find(c => c.theme === profile.colorTheme) || AVATAR_COLORS[0];
                     const isCurrent = profile.id === currentProfileId;
                     
                     if (profileToDelete === profile.id) {
                         return (
                            <div key={profile.id} className="bg-red-50 p-4 rounded-2xl border-2 border-red-200 flex flex-col items-center text-center space-y-3 animate-in fade-in">
                                <p className="font-bold text-red-800">{t('profile.delete_confirm')}</p>
                                <div className="flex gap-2 w-full">
                                    <button 
                                        onClick={() => setProfileToDelete(null)}
                                        disabled={isProcessing}
                                        className="flex-1 py-2 bg-white border border-red-100 rounded-xl text-slate-600 font-bold"
                                    >
                                        {t('modal.confirm.cancel')}
                                    </button>
                                    <button 
                                        onClick={() => handleDelete(profile.id)}
                                        disabled={isProcessing}
                                        className="flex-1 py-2 bg-red-500 text-white rounded-xl font-bold flex items-center justify-center gap-2"
                                    >
                                        {isProcessing && <Loader2 size={16} className="animate-spin" />}
                                        {t('modal.confirm.yes')}
                                    </button>
                                </div>
                            </div>
                         );
                     }

                     return (
                         <div 
                            key={profile.id} 
                            onClick={() => {
                                onSelectProfile(profile.id);
                                onClose(); // Close modal immediately on selection
                            }}
                            className={`
                                relative flex items-center justify-between p-3 rounded-2xl border-2 transition-all cursor-pointer group
                                ${isCurrent 
                                    ? 'bg-indigo-50 border-indigo-200 ring-2 ring-indigo-100' 
                                    : 'bg-white border-slate-100 hover:border-slate-300 hover:shadow-sm'}
                            `}
                         >
                             <div className="flex items-center gap-4 flex-1 min-w-0">
                                 <div className={`w-14 h-14 rounded-full border-4 flex-shrink-0 flex items-center justify-center ${style.bg} ${style.border} ${style.text}`}>
                                     <Baby size={28} strokeWidth={2.5} />
                                 </div>
                                 <div className="min-w-0">
                                     <h3 className="font-black text-xl text-slate-800 truncate">{profile.name}</h3>
                                     <div className="flex items-center gap-2">
                                        <p className="text-sm font-bold text-slate-400">{t('profile.age')}: {profile.age}</p>
                                        {isCurrent && <span className="px-2 py-0.5 bg-indigo-200 text-indigo-800 rounded-full text-[10px] font-black uppercase tracking-wide">{t('profile.current')}</span>}
                                     </div>
                                 </div>
                             </div>
                             
                             <div className="flex items-center gap-1 pl-2">
                                 <button aria-label={t('modal.profile.edit_hover')} 
                                    onClick={(e) => handleStartEdit(profile, e)}
                                    className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-xl transition-all"
                                    title={t('modal.profile.edit_hover')}
                                 >
                                     <Pencil size={20} />
                                 </button>
                                 
                                 {!isCurrent && (
                                     <button aria-label={t('modal.profile.delete_hover')} 
                                        onClick={(e) => { e.stopPropagation(); setProfileToDelete(profile.id); }}
                                        className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                        title={t('modal.profile.delete_hover')}
                                     >
                                         <Trash2 size={20} />
                                     </button>
                                 )}
                             </div>
                         </div>
                     );
                 })}

                 <button 
                    onClick={() => {
                        setEditingProfile(null);
                        setNewName('');
                        setNewAge('');
                        setNewColor('blue');
                        setView('create');
                    }}
                    className="w-full py-5 border-2 border-dashed border-slate-300 rounded-2xl flex items-center justify-center gap-2 text-slate-500 font-bold hover:border-indigo-400 hover:text-indigo-500 hover:bg-indigo-50 transition-all"
                 >
                    <Plus size={24} />
                    <span>{t('profile.add')}</span>
                 </button>
            </div>
        )}

        {(view === 'create' || view === 'edit') && (
            <form onSubmit={handleCreateOrUpdate} className="flex-1 flex flex-col overflow-y-auto p-6 space-y-6">
                 {forceCreate && (
                     <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 text-indigo-800 text-center font-bold">
                         {t('profile.welcome')}
                     </div>
                 )}
                 
                 <div>
                     <label className="block text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">{t('profile.name')}</label>
                     <input 
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        className="w-full px-4 py-3 text-xl font-bold rounded-xl border-2 border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none"
                        placeholder={t('profile.name_placeholder')}
                        autoFocus
                     />
                 </div>

                 <div>
                     <label className="block text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">{t('profile.age')}</label>
                     <input 
                        type="number"
                        min="0"
                        value={newAge}
                        onChange={(e) => {
                           const val = e.target.value;
                           // Allow empty string or non-negative integers only
                           if (val === '' || (/^\d+$/.test(val) && parseInt(val) >= 0)) {
                               setNewAge(val);
                           }
                        }}
                        onKeyDown={(e) => {
                            // Block invalid characters for age
                            if (['-', 'e', 'E', '+', '.'].includes(e.key)) {
                                e.preventDefault();
                            }
                        }}
                        className="w-full px-4 py-3 text-xl font-bold rounded-xl border-2 border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none"
                        placeholder={t('profile.age_placeholder')}
                     />
                 </div>

                 <div>
                     <label className="block text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">{t('profile.avatar_color')}</label>
                     <div className="flex gap-3 justify-center">
                         {AVATAR_COLORS.map(c => (
                             <button aria-label={t(c.labelKey)}
                                key={c.theme}
                                type="button"
                                onClick={() => setNewColor(c.theme)}
                                className={`w-12 h-12 rounded-full border-4 transition-transform ${c.bg} ${c.border} ${newColor === c.theme ? 'scale-125 shadow-lg ring-2 ring-indigo-200' : 'hover:scale-110 opacity-70 hover:opacity-100'}`}
                             />
                         ))}
                     </div>
                 </div>

                 <div className="flex-1" />

                 <div className="flex gap-3">
                     {!forceCreate && (
                        <button 
                            type="button"
                            onClick={() => { setView('list'); setEditingProfile(null); }}
                            disabled={isProcessing}
                            className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200"
                        >
                            {t('common.cancel')}
                        </button>
                     )}
                     <button 
                        type="submit"
                        disabled={!newName.trim() || isProcessing}
                        className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2"
                     >
                        {isProcessing && <Loader2 size={20} className="animate-spin" />}
                        {view === 'edit' ? t('common.save') : t('profile.create')}
                     </button>
                 </div>

                 {view === 'create' && (
                    <div className="pt-5 mt-1 border-t border-slate-100 space-y-3">
                       <button
                          type="button"
                          onClick={() => restoreInput.current?.click()}
                          disabled={isProcessing || restoring}
                          className="w-full min-h-[44px] py-3 rounded-xl border-2 border-slate-200 font-bold text-slate-600 hover:border-indigo-600 hover:text-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-all active:scale-95"
                       >
                          {restoring
                            ? <Loader2 size={18} className="animate-spin" />
                            : <Upload size={18} />}
                          <span>{restoring ? t('modal.settings.backup_working') : t('profile.restore')}</span>
                       </button>
                       <input
                          ref={restoreInput}
                          type="file"
                          accept="application/json,.json"
                          className="hidden"
                          aria-hidden="true"
                          tabIndex={-1}
                          onChange={e => {
                              const f = e.target.files?.[0];
                              // Reset first, so picking the same file twice still fires.
                              e.target.value = '';
                              if (f) void runRestore(f);
                          }}
                       />
                       <p className="text-xs text-slate-400 font-medium text-center">{t('profile.restore_desc')}</p>
                       {restoreError && (
                          <div className="flex items-start gap-2 bg-red-50 border border-red-100 p-3 rounded-xl" role="alert">
                             <AlertTriangle size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
                             <p className="text-xs text-red-700 font-semibold break-words">{restoreError}</p>
                          </div>
                       )}
                    </div>
                 )}
            </form>
        )}
    </Dialog>
  );
};

export default ProfileSelectionModal;
