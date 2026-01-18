
import React from 'react';
import { X, Monitor, Volume2, Grid, Languages, Sparkles } from 'lucide-react';
import { AppSettings } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onUpdateSettings: (newSettings: AppSettings) => void;
  t: (key: any) => string;
}

const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  t,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] border-4 border-white">
        
        {/* Header */}
        <div className="flex justify-between items-center p-5 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center space-x-2">
             <div className="p-2 bg-slate-200 rounded-xl text-slate-600">
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
                <Languages size={20} className="text-primary" />
                <h3>{t('modal.settings.language')}</h3>
             </div>
             <div className="grid grid-cols-2 gap-3">
                 <button 
                    onClick={() => onUpdateSettings({...settings, language: 'en'})}
                    className={`py-3 rounded-xl border-2 font-bold transition-all ${settings.language === 'en' ? 'border-primary bg-primary/10 text-primary' : 'border-slate-200 text-slate-500'}`}
                 >
                    English
                 </button>
                 <button 
                    onClick={() => onUpdateSettings({...settings, language: 'ru'})}
                    className={`py-3 rounded-xl border-2 font-bold transition-all ${settings.language === 'ru' ? 'border-primary bg-primary/10 text-primary' : 'border-slate-200 text-slate-500'}`}
                 >
                    Русский
                 </button>
             </div>
          </section>

          {/* Behavior Settings */}
          <section className="space-y-4">
             <div className="flex items-center space-x-2 text-slate-800 font-bold text-lg">
                <Sparkles size={20} className="text-primary" />
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
                       onChange={(e) => onUpdateSettings({...settings, maxSentenceLength: parseInt(e.target.value)})}
                       className="w-full accent-primary h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                   />
                </div>

                {/* Auto Clear */}
                <div className="flex items-center justify-between">
                    <div>
                        <p className="font-bold text-slate-700">{t('modal.settings.auto_clear')}</p>
                        <p className="text-xs text-slate-400 font-medium">{t('modal.settings.auto_clear_desc')}</p>
                    </div>
                    <button 
                        onClick={() => onUpdateSettings({...settings, autoClearSentence: !settings.autoClearSentence})}
                        className={`relative inline-flex h-9 w-16 items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none border-2 border-transparent ${settings.autoClearSentence ? 'bg-purple-600' : 'bg-slate-300'}`}
                    >
                        <span className={`pointer-events-none inline-block h-7 w-7 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${settings.autoClearSentence ? 'translate-x-7' : 'translate-x-0'}`} />
                    </button>
                </div>

             </div>
          </section>

          {/* Voice Settings */}
          <section className="space-y-4">
            <div className="flex items-center space-x-2 text-slate-800 font-bold text-lg">
                <Volume2 size={20} className="text-primary" />
                <h3>{t('modal.settings.voice')}</h3>
            </div>
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-4">
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
                        onChange={(e) => onUpdateSettings({...settings, voiceRate: parseFloat(e.target.value)})}
                        className="w-full accent-primary h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
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
                        onChange={(e) => onUpdateSettings({...settings, voicePitch: parseFloat(e.target.value)})}
                        className="w-full accent-primary h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                    />
                </div>
            </div>
          </section>

          {/* Grid Settings */}
          <section className="space-y-4">
            <div className="flex items-center space-x-2 text-slate-800 font-bold text-lg">
                <Grid size={20} className="text-primary" />
                <h3>{t('modal.settings.grid')}</h3>
            </div>
            <div className="grid grid-cols-3 gap-3">
                {(['large', 'medium', 'small'] as const).map((size) => (
                    <button
                        key={size}
                        onClick={() => onUpdateSettings({...settings, gridColumns: size})}
                        className={`
                            py-3 px-2 rounded-xl border-2 font-bold capitalize transition-all
                            ${settings.gridColumns === size 
                                ? 'border-primary bg-primary/5 text-primary shadow-sm' 
                                : 'border-slate-200 text-slate-400 hover:border-slate-300'}
                        `}
                    >
                        {t(`modal.settings.grid_${size}`)}
                    </button>
                ))}
            </div>
          </section>

        </div>
        
        <div className="p-4 border-t border-slate-100 bg-white">
             <button 
                onClick={onClose}
                className="w-full py-3 bg-slate-800 text-white rounded-xl font-bold shadow-lg shadow-slate-200 active:scale-[0.98] transition-transform"
             >
                {t('modal.settings.done')}
             </button>
        </div>

      </div>
    </div>
  );
};

export default SettingsModal;
