
import React, { useState, useEffect } from 'react';
import { X, Monitor, Volume2, Grid, Languages, Sparkles, AlertTriangle, Home, Palette, Hand, ScanLine, BookPlus, Check } from 'lucide-react';
import { AppSettings } from '../types';
import { voiceService } from '../services/voice';
import { LANGUAGES, getLanguageOption } from '../utils/languages';
import Dialog from './Dialog.tsx';
import { useSpeakEasy } from '../contexts/SpeakEasyContext.tsx';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onUpdateSettings: (next: AppSettings | ((prev: AppSettings) => AppSettings)) => void;
  /** Writes the mapped rows/cols to the current board — grid size is a board property. */
  onUpdateGridSize: (size: 'small' | 'medium' | 'large') => void;
  currentBoardLabel?: string;
  t: (key: any) => string;
}

const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  onUpdateGridSize,
  currentBoardLabel,
  t,
}) => {
  /*
   * "Add starter words" for a board that already exists. Seeding only runs for
   * a brand-new board — a built board must never be overwritten — which left
   * the starter vocabulary invisible to everyone already using the app. This is
   * the explicit way to ask for it.
   *
   * Two-step on purpose: the parent is told the exact number first. It writes to
   * their board, and a count is the difference between a considered yes and a
   * button they regret.
   */
  const { addStarterVocabulary } = useSpeakEasy();
  const [vocabPlan, setVocabPlan] = useState<{ added: number; skipped: number; missingFolders: string[] } | null>(null);
  const [vocabResult, setVocabResult] = useState<number | null>(null);
  const [vocabBusy, setVocabBusy] = useState(false);

  /*
   * Reset when the dialog closes. Returning null from a component does not
   * unmount it — BoardPage always renders <SettingsModal>, so this state
   * outlives the dialog being dismissed. Without this, a parent who adds words
   * once sees "Added 86 words." forever and never gets the button back, so they
   * could not run it again after adding a folder or after the vocabulary grows.
   */
  useEffect(() => {
    if (!isOpen) { setVocabPlan(null); setVocabResult(null); }
  }, [isOpen]);

  const planStarterWords = async () => {
    setVocabBusy(true);
    try { setVocabPlan(await addStarterVocabulary({ dryRun: true })); }
    finally { setVocabBusy(false); }
  };

  const applyStarterWords = async () => {
    setVocabBusy(true);
    try {
      const res = await addStarterVocabulary();
      setVocabResult(res.added);
      setVocabPlan(null);
    } finally { setVocabBusy(false); }
  };

  const [testStatus, setTestStatus] = useState<'idle' | 'playing' | 'error'>('idle');

  const handleTestVoice = async () => {
      setTestStatus('playing');
      const text = getLanguageOption(settings.language).voiceTestPhrase;
      try {
          await voiceService.speak({
              text,
              language: settings.language,
              rate: settings.voiceRate,
              pitch: settings.voicePitch
          });
          setTestStatus('idle');
      } catch (e) {
          console.error("Test failed", e);
          setTestStatus('error');
          setTimeout(() => setTestStatus('idle'), 3000);
      }
  };

  // Children of <Dialog> are evaluated before they are passed to it, so a

  // closed dialog must not render at all — its body reads state that only

  // exists while it is open.

  if (!(isOpen)) return null;


  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      label={t('modal.settings.title')}
      scrimClassName="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      panelClassName="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] border-4 border-white"
    >
        
        {/* Header */}
        <div className="flex justify-between items-center p-5 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center space-x-2">
             <div className="p-2 bg-indigo-100 text-indigo-600 rounded-xl">
                <Monitor size={24} />
             </div>
             <h2 className="text-2xl font-black text-slate-800">{t('modal.settings.title')}</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-200 text-slate-600 transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          
          {/* Language Settings */}
          <section className="space-y-4">
             <div className="flex items-center space-x-2 text-slate-800 font-bold text-lg">
                <Languages size={20} className="text-indigo-600" />
                <h3>{t('modal.settings.language')}</h3>
             </div>
             <div className="grid grid-cols-2 gap-3">
                 {LANGUAGES.map(opt => (
                     <button
                        key={opt.code}
                        onClick={() => onUpdateSettings(prev => ({...prev, language: opt.code}))}
                        aria-pressed={settings.language === opt.code}
                        className={`py-3 rounded-xl border-2 font-bold transition-all ${settings.language === opt.code ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-slate-500'}`}
                     >
                        {opt.nativeLabel}
                     </button>
                 ))}
             </div>
          </section>

          {/* Voice Settings */}
          <section className="space-y-4">
            <div className="flex items-center space-x-2 text-slate-800 font-bold text-lg">
                <Volume2 size={20} className="text-indigo-600" />
                <h3>{t('modal.settings.voice')}</h3>
            </div>
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-4">
                
                {/* Sliders */}
                <div className="space-y-4">
                    <div>
                        <div className="flex justify-between mb-2">
                            <label className="text-sm font-bold text-slate-500 uppercase">{t('modal.settings.speed')}</label>
                            <span className="text-sm font-bold text-slate-700">{settings.voiceRate.toFixed(1)}x</span>
                        </div>
                        <input 
                            type="range" 
                            min="0.5" 
                            max="1.5" 
                            step="0.1" 
                            value={settings.voiceRate}
                            onChange={(e) => onUpdateSettings(prev => ({...prev, voiceRate: parseFloat(e.target.value)}))}
                            className="w-full accent-indigo-600 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                        />
                    </div>
                    <div>
                        <div className="flex justify-between mb-2">
                            <label className="text-sm font-bold text-slate-500 uppercase">{t('modal.settings.pitch')}</label>
                            <span className="text-sm font-bold text-slate-700">{settings.voicePitch.toFixed(1)}</span>
                        </div>
                        <input 
                            type="range" 
                            min="0.5" 
                            max="1.5" 
                            step="0.1" 
                            value={settings.voicePitch}
                            onChange={(e) => onUpdateSettings(prev => ({...prev, voicePitch: parseFloat(e.target.value)}))}
                            className="w-full accent-indigo-600 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                        />
                    </div>
                </div>

                {/* Test Button */}
                <button 
                    onClick={handleTestVoice}
                    disabled={testStatus === 'playing'}
                    className={`
                        w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all
                        ${testStatus === 'error' 
                            ? 'bg-red-100 text-red-600' 
                            : 'bg-white border-2 border-slate-200 text-slate-700 hover:border-indigo-500 hover:text-indigo-600'}
                    `}
                >
                    {testStatus === 'playing' ? (
                        <div className="flex items-center gap-2">
                           <Volume2 size={20} className="animate-pulse" />
                           <span>{t('recorder.playing')}</span>
                        </div>
                    ) : testStatus === 'error' ? (
                        <div className="flex items-center gap-2">
                           <AlertTriangle size={20} />
                           <span>{t('modal.settings.test_error')}</span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2">
                           <Volume2 size={20} />
                           <span>{t('modal.settings.test_voice')}</span>
                        </div>
                    )}
                </button>

            </div>
          </section>

          {/* Behavior Settings */}
          <section className="space-y-4">
             <div className="flex items-center space-x-2 text-slate-800 font-bold text-lg">
                <Sparkles size={20} className="text-indigo-600" />
                <h3>{t('modal.settings.behavior')}</h3>
             </div>
             <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-6">
                
                {/* Max Length */}
                <div>
                   <div className="flex justify-between mb-2">
                       <label className="text-sm font-bold text-slate-500 uppercase">{t('modal.settings.max_length')}</label>
                       <span className="text-sm font-bold text-slate-700">
                           {settings.maxSentenceLength === 0 ? t('modal.settings.max_length_none') : settings.maxSentenceLength}
                       </span>
                   </div>
                   <input 
                       type="range" 
                       min="0" 
                       max="5" 
                       step="1" 
                       value={settings.maxSentenceLength}
                       onChange={(e) => onUpdateSettings(prev => ({...prev, maxSentenceLength: parseInt(e.target.value)}))}
                       className="w-full accent-indigo-600 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                   />
                </div>

                {/* Auto Clear */}
                <div className="flex items-center justify-between">
                    <div>
                        <p className="font-bold text-slate-700">{t('modal.settings.auto_clear')}</p>
                        <p className="text-xs text-slate-400 font-medium">{t('modal.settings.auto_clear_desc')}</p>
                    </div>
                    <button 
                        onClick={() => onUpdateSettings(prev => ({...prev, autoClearSentence: !prev.autoClearSentence}))}
                        className={`relative inline-flex h-9 w-16 items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none border-2 border-transparent ${settings.autoClearSentence ? 'bg-indigo-600' : 'bg-slate-300'}`}
                    >
                        <span className={`pointer-events-none inline-block h-7 w-7 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${settings.autoClearSentence ? 'translate-x-7' : 'translate-x-0'}`} />
                    </button>
                </div>

             </div>
          </section>

          {/* Grid Settings */}
          <section className="space-y-4">
            <div className="flex items-center space-x-2 text-slate-800 font-bold text-lg">
                <Grid size={20} className="text-indigo-600" />
                <h3>{t('modal.settings.grid')}</h3>
            </div>
            {/* Grid density lives on the board, so name the board it changes. */}
            <p className="-mt-2 text-xs font-medium text-slate-400">
                {t('modal.settings.grid_board')}{currentBoardLabel ? `: ${currentBoardLabel}` : ''}
            </p>
            <div className="grid grid-cols-3 gap-3">
                {(['large', 'medium', 'small'] as const).map((size) => (
                    <button
                        key={size}
                        onClick={() => onUpdateGridSize(size)}
                        className={`
                            py-3 px-2 rounded-xl border-2 font-bold capitalize transition-all
                            ${settings.gridColumns === size 
                                ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-sm' 
                                : 'border-slate-200 text-slate-400 hover:border-slate-300'}
                        `}
                    >
                        {t(`modal.settings.grid_${size}`)}
                    </button>
                ))}
            </div>
          </section>

          {/* Return home after selection */}
          <section className="space-y-4">
             <div className="flex items-center space-x-2 text-slate-800 font-bold text-lg">
                <Home size={20} className="text-indigo-600" />
                <h3>{t('modal.settings.return_home')}</h3>
             </div>
             <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center justify-between gap-4">
                <p className="text-xs text-slate-400 font-medium flex-1">{t('modal.settings.return_home_desc')}</p>
                <button
                    role="switch"
                    aria-checked={!!settings.returnHomeAfterSelect}
                    aria-label={t('modal.settings.return_home')}
                    onClick={() => onUpdateSettings(prev => ({...prev, returnHomeAfterSelect: !prev.returnHomeAfterSelect}))}
                    className={`shrink-0 relative inline-flex h-9 w-16 items-center rounded-full transition-colors duration-200 border-2 border-transparent ${settings.returnHomeAfterSelect ? 'bg-indigo-600' : 'bg-slate-300'}`}
                >
                    <span className={`pointer-events-none inline-block h-7 w-7 transform rounded-full bg-white shadow transition duration-200 ${settings.returnHomeAfterSelect ? 'translate-x-7' : 'translate-x-0'}`} />
                </button>
             </div>
          </section>

          {/* Access methods */}
          <section className="space-y-4">
             <div className="flex items-center space-x-2 text-slate-800 font-bold text-lg">
                <Hand size={20} className="text-indigo-600" />
                <h3>{t('modal.settings.access')}</h3>
             </div>
             <div className="grid grid-cols-3 gap-2">
                {([['release','modal.settings.select_release'],['press','modal.settings.select_press'],['dwell','modal.settings.select_dwell']] as const).map(([value, key]) => {
                    const active = (settings.selectionMode || 'release') === value;
                    return (
                        <button
                            key={value}
                            aria-pressed={active}
                            onClick={() => onUpdateSettings(prev => ({...prev, selectionMode: value}))}
                            className={`py-2.5 px-1 rounded-xl border-2 text-xs sm:text-sm font-bold transition-all min-h-[44px] ${active ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-sm' : 'border-slate-200 text-slate-400 hover:border-slate-300'}`}
                        >
                            {t(key)}
                        </button>
                    );
                })}
             </div>
             <p className="text-xs text-slate-400 font-medium leading-snug">{t('modal.settings.select_desc')}</p>

             {(settings.selectionMode === 'dwell') && (
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <div className="flex justify-between mb-2">
                        <label className="text-sm font-bold text-slate-500 uppercase">{t('modal.settings.dwell_time')}</label>
                        <span className="text-sm font-bold text-slate-700">{((settings.dwellMs || 600) / 1000).toFixed(1)}s</span>
                    </div>
                    <input
                        type="range" min="200" max="2000" step="100"
                        value={settings.dwellMs || 600}
                        onChange={(e) => onUpdateSettings(prev => ({...prev, dwellMs: parseInt(e.target.value)}))}
                        className="w-full accent-indigo-600 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                    />
                </div>
             )}

             <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center justify-between gap-4">
                <div className="flex-1">
                    <p className="font-bold text-slate-700 text-sm">{t('modal.settings.preview')}</p>
                    <p className="text-xs text-slate-400 font-medium">{t('modal.settings.preview_desc')}</p>
                </div>
                <button
                    role="switch"
                    aria-checked={!!settings.auditoryPreview}
                    aria-label={t('modal.settings.preview')}
                    onClick={() => onUpdateSettings(prev => ({...prev, auditoryPreview: !prev.auditoryPreview}))}
                    className={`shrink-0 relative inline-flex h-9 w-16 items-center rounded-full transition-colors duration-200 border-2 border-transparent ${settings.auditoryPreview ? 'bg-indigo-600' : 'bg-slate-300'}`}
                >
                    <span className={`pointer-events-none inline-block h-7 w-7 transform rounded-full bg-white shadow transition duration-200 ${settings.auditoryPreview ? 'translate-x-7' : 'translate-x-0'}`} />
                </button>
             </div>
          </section>

          {/* Switch scanning */}
          <section className="space-y-4">
             <div className="flex items-center space-x-2 text-slate-800 font-bold text-lg">
                <ScanLine size={20} className="text-indigo-600" />
                <h3>{t('modal.settings.scan')}</h3>
             </div>
             <div className="grid grid-cols-3 gap-2">
                {([['off','modal.settings.scan_off'],['linear','modal.settings.scan_linear'],['rowColumn','modal.settings.scan_rowcol']] as const).map(([value, key]) => {
                    const active = (settings.scan?.mode || 'off') === value;
                    return (
                        <button
                            key={value}
                            aria-pressed={active}
                            onClick={() => onUpdateSettings(prev => ({...prev, scan: { mode: value, rateMs: prev.scan?.rateMs ?? 1200, auto: prev.scan?.auto ?? true }}))}
                            className={`py-2.5 px-1 rounded-xl border-2 text-xs sm:text-sm font-bold transition-all min-h-[44px] ${active ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-sm' : 'border-slate-200 text-slate-400 hover:border-slate-300'}`}
                        >
                            {t(key)}
                        </button>
                    );
                })}
             </div>
             <p className="text-xs text-slate-400 font-medium leading-snug">{t('modal.settings.scan_desc')}</p>

             {settings.scan && settings.scan.mode !== 'off' && (
               <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-5">
                  <div className="flex items-center justify-between gap-4">
                     <div className="flex-1">
                        <p className="font-bold text-slate-700 text-sm">{t('modal.settings.scan_auto')}</p>
                        <p className="text-xs text-slate-400 font-medium">{t('modal.settings.scan_auto_desc')}</p>
                     </div>
                     <button
                        role="switch"
                        aria-checked={!!settings.scan.auto}
                        aria-label={t('modal.settings.scan_auto')}
                        onClick={() => onUpdateSettings(prev => ({...prev, scan: { ...prev.scan!, auto: !prev.scan!.auto }}))}
                        className={`shrink-0 relative inline-flex h-9 w-16 items-center rounded-full transition-colors duration-200 border-2 border-transparent ${settings.scan.auto ? 'bg-indigo-600' : 'bg-slate-300'}`}
                     >
                        <span className={`pointer-events-none inline-block h-7 w-7 transform rounded-full bg-white shadow transition duration-200 ${settings.scan.auto ? 'translate-x-7' : 'translate-x-0'}`} />
                     </button>
                  </div>

                  {settings.scan.auto && (
                    <div>
                       <div className="flex justify-between mb-2">
                          <label className="text-sm font-bold text-slate-500 uppercase">{t('modal.settings.scan_rate')}</label>
                          <span className="text-sm font-bold text-slate-700">{(settings.scan.rateMs / 1000).toFixed(1)}s</span>
                       </div>
                       <input
                          type="range" min="400" max="4000" step="100"
                          value={settings.scan.rateMs}
                          onChange={(e) => onUpdateSettings(prev => ({...prev, scan: { ...prev.scan!, rateMs: parseInt(e.target.value) }}))}
                          className="w-full accent-indigo-600 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                       />
                    </div>
                  )}
               </div>
             )}
          </section>

          {/* Starter vocabulary */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-slate-800">
              <BookPlus size={18} />
              <h3 className="font-bold">{t('modal.settings.starter_words')}</h3>
            </div>
            <p className="text-xs text-slate-400 font-medium">{t('modal.settings.starter_words_desc')}</p>

            {vocabResult !== null ? (
              <p className="flex items-center gap-2 text-sm font-bold text-green-700 bg-green-50 border-2 border-green-200 rounded-xl px-4 py-3">
                <Check size={16} /> {t('modal.settings.starter_words_added').replace('{n}', String(vocabResult))}
              </p>
            ) : vocabPlan === null ? (
              <button
                type="button"
                onClick={planStarterWords}
                disabled={vocabBusy}
                className="w-full px-4 py-3 rounded-xl bg-slate-100 font-bold text-slate-700 hover:bg-slate-200 active:scale-95 transition-all disabled:opacity-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary"
              >
                {t('modal.settings.starter_words_check')}
              </button>
            ) : vocabPlan.added === 0 ? (
              <p className="text-sm font-semibold text-slate-500 bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-3">
                {t('modal.settings.starter_words_none')}
              </p>
            ) : (
              <div className="space-y-2 bg-slate-50 border-2 border-slate-200 rounded-xl p-4">
                <p className="text-sm font-bold text-slate-700">
                  {t('modal.settings.starter_words_plan').replace('{n}', String(vocabPlan.added))}
                </p>
                <p className="text-xs text-slate-500 font-medium">{t('modal.settings.starter_words_safe')}</p>
                {vocabPlan.missingFolders.length > 0 && (
                  <p className="text-xs text-amber-700 font-medium">
                    {t('modal.settings.starter_words_missing').replace('{folders}', vocabPlan.missingFolders.join(', '))}
                  </p>
                )}
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={applyStarterWords}
                    disabled={vocabBusy}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-primary text-white font-bold active:scale-95 transition-transform disabled:opacity-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary"
                  >
                    {t('modal.settings.starter_words_confirm')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setVocabPlan(null)}
                    className="px-4 py-2.5 rounded-xl bg-white border-2 border-slate-200 font-bold text-slate-600 active:scale-95 transition-transform"
                  >
                    {t('modal.categories.cancel')}
                  </button>
                </div>
              </div>
            )}
          </section>

          {/* Visual shell */}
          <section className="space-y-4">
             <div className="flex items-center space-x-2 text-slate-800 font-bold text-lg">
                <Palette size={20} className="text-indigo-600" />
                <h3>{t('modal.settings.shell')}</h3>
             </div>
             <div className="grid grid-cols-2 gap-3">
                {([['youngLearner','modal.settings.shell_young'],['neutral','modal.settings.shell_neutral']] as const).map(([value, key]) => {
                    const active = (settings.shell || 'youngLearner') === value;
                    return (
                        <button
                            key={value}
                            aria-pressed={active}
                            onClick={() => onUpdateSettings(prev => ({...prev, shell: value}))}
                            className={`py-3 px-2 rounded-xl border-2 font-bold transition-all ${active ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-sm' : 'border-slate-200 text-slate-400 hover:border-slate-300'}`}
                        >
                            {t(key)}
                        </button>
                    );
                })}
             </div>
             <p className="text-xs text-slate-400 font-medium">{t('modal.settings.shell_desc')}</p>
          </section>

        </div>
        
        <div className="p-4 border-t border-slate-100 bg-white">
             <button 
                onClick={onClose}
                className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all"
             >
                {t('modal.settings.done')}
             </button>
        </div>
    </Dialog>
  );
};

export default SettingsModal;
