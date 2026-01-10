import React, { useState, useRef, useEffect } from 'react';
import { X, Image as ImageIcon, Check, Mic, Keyboard, Play, Camera, RefreshCcw, Eye, EyeOff, Search, Loader2, Globe, Palette, Info, Maximize2, Minimize2 } from 'lucide-react';
import { AACItem, Category, AppLanguage, ColorTheme } from '../types';
import { voiceService } from '../services/voice';
import { searchArasaacSymbols, ArasaacSymbol } from '../services/arasaac';
import AudioRecorder from './AudioRecorder';
import { TranslationKey } from '../services/translations';

interface CreateCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: Omit<AACItem, 'id' | 'createdAt' | 'boardId' | 'profileId'>) => void;
  editItem?: AACItem | null;
  t: (key: TranslationKey) => string;
  language: AppLanguage;
  currentFolderName?: string;
  defaultColorTheme?: ColorTheme;
}

type SoundMode = 'recording' | 'tts';

const THEMES: { theme: ColorTheme; bg: string; border: string; labelKey: TranslationKey; descKey: TranslationKey }[] = [
  { theme: 'yellow', bg: 'bg-yellow-100', border: 'border-yellow-400', labelKey: 'fitzgerald.people', descKey: 'fitzgerald.people_desc' },
  { theme: 'green', bg: 'bg-green-100', border: 'border-green-400', labelKey: 'fitzgerald.verbs', descKey: 'fitzgerald.verbs_desc' },
  { theme: 'orange', bg: 'bg-orange-100', border: 'border-orange-400', labelKey: 'fitzgerald.nouns', descKey: 'fitzgerald.nouns_desc' },
  { theme: 'blue', bg: 'bg-blue-100', border: 'border-blue-400', labelKey: 'fitzgerald.adjectives', descKey: 'fitzgerald.adjectives_desc' },
  { theme: 'pink', bg: 'bg-pink-100', border: 'border-pink-400', labelKey: 'fitzgerald.social', descKey: 'fitzgerald.social_desc' },
  { theme: 'purple', bg: 'bg-purple-100', border: 'border-purple-400', labelKey: 'fitzgerald.places', descKey: 'fitzgerald.places_desc' },
  { theme: 'teal', bg: 'bg-teal-100', border: 'border-teal-400', labelKey: 'fitzgerald.time', descKey: 'fitzgerald.time_desc' },
  { theme: 'red', bg: 'bg-red-100', border: 'border-red-400', labelKey: 'fitzgerald.emergency', descKey: 'fitzgerald.emergency_desc' },
  { theme: 'slate', bg: 'bg-slate-100', border: 'border-slate-400', labelKey: 'fitzgerald.misc', descKey: 'fitzgerald.misc_desc' },
];

const CreateCardModal: React.FC<CreateCardModalProps> = ({ isOpen, onClose, onSave, editItem, t, language, currentFolderName, defaultColorTheme }) => {
  const [label, setLabel] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFit, setImageFit] = useState<'cover' | 'contain'>('cover');
  const [isVisible, setIsVisible] = useState(true);
  const [colorTheme, setColorTheme] = useState<ColorTheme>('slate');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Camera State
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [flashTrigger, setFlashTrigger] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Symbol Search State
  const [showSymbolSearch, setShowSymbolSearch] = useState(false);
  const [symbolQuery, setSymbolQuery] = useState('');
  const [symbols, setSymbols] = useState<ArasaacSymbol[]>([]);
  const [isLoadingSymbols, setIsLoadingSymbols] = useState(false);
  const symbolDebounceRef = useRef<number | null>(null);

  // Sound State
  const [soundMode, setSoundMode] = useState<SoundMode>('recording');
  
  // Recording State
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [previewAudioUrl, setPreviewAudioUrl] = useState<string | null>(null);
  const [isAudioDeleted, setIsAudioDeleted] = useState(false);
  
  // TTS State
  const [textToSpeak, setTextToSpeak] = useState('');

  // --- HELPER FUNCTIONS ---

  const stopCamera = () => {
      if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
      }
      setIsCameraActive(false);
  };

  const startCamera = async () => {
    try {
        stopCamera();
        await new Promise(r => setTimeout(r, 100));

        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
                facingMode: facingMode,
                width: { ideal: 1280 },
                height: { ideal: 1280 } 
            },
            audio: false 
        });
        streamRef.current = stream;
        setIsCameraActive(true);
    } catch (err) {
        console.error("Error accessing camera:", err);
        setIsCameraActive(false);
    }
  };

  const switchCamera = () => {
      setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
  };

  useEffect(() => {
      if (isCameraActive) {
          startCamera();
      }
  }, [facingMode]);

  const capturePhoto = () => {
      const video = videoRef.current;
      if (video && video.videoWidth > 0 && video.videoHeight > 0) {
          setFlashTrigger(true);
          setTimeout(() => setFlashTrigger(false), 200);

          const canvas = document.createElement('canvas');
          const size = Math.min(video.videoWidth, video.videoHeight);
          const startX = (video.videoWidth - size) / 2;
          const startY = (video.videoHeight - size) / 2;

          canvas.width = 400; 
          canvas.height = 400;
          
          const ctx = canvas.getContext('2d');
          if (ctx) {
              ctx.drawImage(video, startX, startY, size, size, 0, 0, canvas.width, canvas.height);
              try {
                const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
                setImagePreview(dataUrl);
                setImageFit('cover'); // Photos default to cover
                setTimeout(() => stopCamera(), 100);
              } catch (e) {
                console.error("Capture failed", e);
              }
          }
      }
  };

  const resetForm = () => {
    setLabel('');
    setImagePreview(null);
    setImageFit('cover');
    setAudioBlob(null);
    if (previewAudioUrl && previewAudioUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewAudioUrl);
    }
    setPreviewAudioUrl(null);
    setIsAudioDeleted(false);
    setTextToSpeak('');
    setSoundMode('recording');
    setFacingMode('environment');
    setIsVisible(true);
    setShowSymbolSearch(false);
    setSymbolQuery('');
    setSymbols([]);
    setColorTheme(defaultColorTheme || 'slate');
    stopCamera();
  };

  // --- EFFECTS ---

  useEffect(() => {
    if (isCameraActive && videoRef.current && streamRef.current) {
        videoRef.current.srcObject = streamRef.current;
    }
  }, [isCameraActive, streamRef.current]);

  useEffect(() => {
    if (isOpen) {
      if (editItem) {
        setLabel(editItem.label);
        setImagePreview(editItem.imageUrl);
        setImageFit(editItem.imageFit || 'cover'); // Load saved preference or default
        setIsVisible(editItem.isVisible !== false);
        setColorTheme(editItem.colorTheme || defaultColorTheme || 'slate');
        
        if (editItem.audioUrl) {
            setSoundMode('recording');
            setAudioBlob(null);
            setPreviewAudioUrl(editItem.audioUrl);
            setTextToSpeak(editItem.textToSpeak || '');
        } else {
            setSoundMode('tts');
            setPreviewAudioUrl(null);
            if (editItem.audioUrl) {
                setPreviewAudioUrl(editItem.audioUrl);
            }
            setTextToSpeak(editItem.textToSpeak || '');
        }
        setIsAudioDeleted(false);
      } else {
        resetForm();
      }
    } else {
        stopCamera();
    }
  }, [isOpen, editItem, defaultColorTheme]);

  useEffect(() => {
    if (symbolDebounceRef.current) clearTimeout(symbolDebounceRef.current);
    if (symbolQuery.length >= 3) {
        setIsLoadingSymbols(true);
        symbolDebounceRef.current = window.setTimeout(async () => {
             const lang = language === 'ru' ? 'ru' : 'en';
             const results = await searchArasaacSymbols(symbolQuery, lang);
             setSymbols(results);
             setIsLoadingSymbols(false);
        }, 600);
    } else {
        setSymbols([]);
        setIsLoadingSymbols(false);
    }
  }, [symbolQuery, language]);

  useEffect(() => {
      return () => {
          stopCamera();
      };
  }, []);

  if (!isOpen) return null;

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = (event) => {
        const rawBase64 = event.target?.result as string;
        const img = new Image();
        img.onload = () => {
             const canvas = document.createElement('canvas');
             const MAX_SIZE = 500;
             let width = img.width;
             let height = img.height;
             
             if (width > height) {
                 if (width > MAX_SIZE) {
                     height *= MAX_SIZE / width;
                     width = MAX_SIZE;
                 }
             } else {
                 if (height > MAX_SIZE) {
                     width *= MAX_SIZE / height;
                     height = MAX_SIZE;
                 }
             }
             canvas.width = width;
             canvas.height = height;
             const ctx = canvas.getContext('2d');
             ctx?.drawImage(img, 0, 0, width, height);
             const resizedDataUrl = canvas.toDataURL('image/jpeg', 0.7);
             setImagePreview(resizedDataUrl);
             setImageFit('cover'); // Uploads default to cover
        };
        img.src = rawBase64;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSymbolSelect = async (url: string) => {
      setIsLoadingSymbols(true);
      try {
          const response = await fetch(url);
          const blob = await response.blob();
          const reader = new FileReader();
          reader.onloadend = () => {
             setImagePreview(reader.result as string);
             setImageFit('contain'); // Symbols default to contain
             setShowSymbolSearch(false);
             setIsLoadingSymbols(false);
             setSymbolQuery('');
          };
          reader.readAsDataURL(blob);
      } catch (e) {
          console.error("Failed to load symbol", e);
          setIsLoadingSymbols(false);
      }
  };

  const handleAudioRecordingComplete = (blob: Blob | null) => {
    if (previewAudioUrl && previewAudioUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewAudioUrl);
    }

    setAudioBlob(blob);
    
    if (blob === null) {
        setIsAudioDeleted(true);
        setPreviewAudioUrl(null);
    } else {
        setIsAudioDeleted(false);
        const url = URL.createObjectURL(blob);
        setPreviewAudioUrl(url);
    }
  };

  const previewTTS = async () => {
      const text = textToSpeak || label;
      if (!text) return;
      
      const savedSettings = localStorage.getItem('aac_settings');
      const s = savedSettings ? JSON.parse(savedSettings) : { voiceRate: 0.9, voicePitch: 1.0 };
      
      await voiceService.speak({
        text,
        language,
        rate: s.voiceRate,
        pitch: s.voicePitch
      });
  };

  const handleSave = async () => {
    if (!label || !imagePreview) return;
    
    let finalAudioUrl: string | undefined = undefined;
    let finalTextToSpeak: string | undefined = undefined;

    if (soundMode === 'recording') {
        if (audioBlob) {
            const reader = new FileReader();
            finalAudioUrl = await new Promise((resolve) => {
                reader.onloadend = () => resolve(reader.result as string);
                reader.readAsDataURL(audioBlob);
            });
        } else if (!isAudioDeleted && previewAudioUrl && !previewAudioUrl.startsWith('blob:')) {
            finalAudioUrl = previewAudioUrl;
        }
    } else {
        finalTextToSpeak = textToSpeak.trim() || undefined;
    }

    onSave({
        label,
        imageUrl: imagePreview,
        imageFit,
        audioUrl: finalAudioUrl,
        textToSpeak: finalTextToSpeak,
        category: editItem ? editItem.category : '', 
        colorTheme: colorTheme,
        isVisible,
    });
    
    if (!editItem) resetForm();
    onClose();
  };

  const activeTheme = THEMES.find(c => c.theme === colorTheme);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-lg sm:rounded-3xl rounded-t-3xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh] h-full sm:h-auto transition-all relative">
        
        {/* === Full Screen Overlays (Camera/Search) === */}
        {isCameraActive && (
             <div className="absolute inset-0 z-[60] bg-black flex flex-col animate-in fade-in duration-300">
                 <div className="relative flex-1 bg-black overflow-hidden flex items-center justify-center">
                    <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover" />
                    <div className="absolute inset-0 pointer-events-none">
                        <div className="w-full h-full bg-black/50 flex items-center justify-center">
                            <div className="w-[80%] aspect-square border-2 border-white/80 rounded-2xl relative shadow-[0_0_0_9999px_rgba(0,0,0,0.5)] bg-transparent">
                                <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-white -mt-1 -ml-1 rounded-tl-lg"></div>
                                <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-white -mt-1 -mr-1 rounded-tr-lg"></div>
                                <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-white -mb-1 -ml-1 rounded-bl-lg"></div>
                                <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-white -mb-1 -mr-1 rounded-br-lg"></div>
                            </div>
                        </div>
                    </div>
                    {flashTrigger && <div className="absolute inset-0 bg-white animate-out fade-out duration-300 pointer-events-none z-50"></div>}
                 </div>
                 <div className="h-32 bg-black/90 backdrop-blur-md flex items-center justify-between px-10 pb-4 pt-2 z-50">
                     <button onClick={stopCamera} className="p-4 bg-white/10 rounded-full text-white hover:bg-white/20 transition-all active:scale-95"><X size={24} /></button>
                     <button onClick={capturePhoto} className="w-20 h-20 rounded-full bg-white border-[6px] border-slate-300 ring-4 ring-white/10 active:scale-95 active:ring-white/30 transition-all shadow-xl" />
                    <button onClick={switchCamera} className="p-4 bg-white/10 rounded-full text-white hover:bg-white/20 transition-all active:scale-95"><RefreshCcw size={24} /></button>
                 </div>
             </div>
        )}

        {showSymbolSearch && (
             <div className="absolute inset-0 z-[60] bg-white flex flex-col animate-in fade-in duration-200">
                 <div className="p-4 border-b border-slate-100 flex items-center gap-3 bg-slate-50">
                     <div className="relative flex-1">
                         <Search size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                         <input autoFocus className="w-full pl-10 pr-10 py-3 bg-white border-2 border-slate-200 rounded-xl text-lg font-bold text-slate-800 placeholder:text-slate-400 focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all" placeholder={t('search.placeholder')} value={symbolQuery} onChange={(e) => setSymbolQuery(e.target.value)} />
                         {symbolQuery && <button onClick={() => setSymbolQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 bg-slate-100 rounded-full text-slate-400 hover:text-slate-600"><X size={14} /></button>}
                     </div>
                     <button onClick={() => setShowSymbolSearch(false)} className="p-3 bg-slate-100 text-slate-500 rounded-xl hover:bg-slate-200 font-bold">{t('modal.categories.cancel')}</button>
                 </div>
                 <div className="flex-1 overflow-y-auto p-4 bg-slate-50">
                      {isLoadingSymbols ? (
                          <div className="flex flex-col items-center justify-center h-40 space-y-4"><Loader2 size={40} className="animate-spin text-primary" /><p className="text-slate-400 font-bold">{t('folder.searching')}</p></div>
                      ) : symbols.length > 0 ? (
                          <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">{symbols.map(s => <button key={s.id} onClick={() => handleSymbolSelect(s.url)} className="aspect-square bg-white rounded-xl border-2 border-slate-200 hover:border-primary hover:shadow-lg transition-all p-2 flex items-center justify-center active:scale-95 group"><img src={s.url} className="w-full h-full object-contain group-hover:scale-110 transition-transform" alt="" /></button>)}</div>
                      ) : (
                          <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-4 opacity-50"><Globe size={64} /><p className="font-bold text-center">{symbolQuery.length < 3 ? t('create.search_type_hint') : t('create.no_results')}</p></div>
                      )}
                 </div>
             </div>
        )}

        {/* === Normal Modal Content === */}
        <div className="flex justify-between items-center p-5 border-b border-slate-100 bg-slate-50/50">
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">{editItem ? t('modal.create.title_edit') : t('modal.create.title_new')}</h2>
            {currentFolderName && (
               <p className="text-xs text-slate-500 font-bold uppercase tracking-wide">{t('create.in_folder')} {currentFolderName}</p>
            )}
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-200 text-slate-600 transition-colors">
            <X size={28} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          
          <div className="flex flex-col sm:flex-row gap-6">
            <div className="flex-shrink-0 sm:w-48 flex flex-col gap-3">
                {/* Image Preview Box */}
                <div className="relative w-full h-48 sm:h-48 rounded-2xl overflow-hidden border-2 border-slate-200 bg-slate-100 shadow-inner flex items-center justify-center group">
                    {imagePreview ? (
                        <>
                            <img 
                                src={imagePreview} 
                                alt="Preview" 
                                className={`w-full h-full bg-white transition-all duration-300 ${imageFit === 'contain' ? 'object-contain' : 'object-cover'}`} 
                            />
                            {/* Toggle Fit Button */}
                            <button
                                onClick={() => setImageFit(prev => prev === 'cover' ? 'contain' : 'cover')}
                                className="absolute bottom-2 right-2 bg-black/50 text-white p-1.5 rounded-lg hover:bg-black/70 backdrop-blur-sm transition-all"
                                title={imageFit === 'cover' ? "Show full image (Fit)" : "Fill card (Cover)"}
                            >
                                {imageFit === 'cover' ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                            </button>
                        </>
                    ) : (
                        <div className="text-slate-300 flex flex-col items-center">
                            <ImageIcon size={48} className="opacity-50 mb-2" />
                        </div>
                    )}
                </div>

                {/* Action Buttons Row */}
                <div className="grid grid-cols-3 gap-2">
                    <button 
                        onClick={startCamera} 
                        className="flex flex-col items-center justify-center p-2.5 bg-slate-50 rounded-xl border-2 border-slate-200 hover:border-primary hover:bg-primary/5 active:scale-95 transition-all"
                    >
                        <Camera size={20} className="text-slate-600 mb-1" />
                        <span className="text-[9px] font-black text-slate-500 uppercase">{t('modal.create.camera')}</span>
                    </button>
                    <button 
                        onClick={() => fileInputRef.current?.click()} 
                        className="flex flex-col items-center justify-center p-2.5 bg-slate-50 rounded-xl border-2 border-slate-200 hover:border-blue-500 hover:bg-blue-50 active:scale-95 transition-all"
                    >
                        <ImageIcon size={20} className="text-slate-600 mb-1" />
                        <span className="text-[9px] font-black text-slate-500 uppercase">{t('modal.create.upload')}</span>
                    </button>
                    <button 
                        onClick={() => setShowSymbolSearch(true)} 
                        className="flex flex-col items-center justify-center p-2.5 bg-slate-50 rounded-xl border-2 border-slate-200 hover:border-orange-500 hover:bg-orange-50 active:scale-95 transition-all"
                    >
                        <Globe size={20} className="text-slate-600 mb-1" />
                        <span className="text-[9px] font-black text-slate-500 uppercase">{t('create.symbol')}</span>
                    </button>
                </div>
                
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
            </div>

            <div className="flex-1 space-y-4 min-w-0">
               <div>
                 <label className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-2 block">{t('modal.create.name_label')}</label>
                 <input type="text" value={label} onChange={(e) => setLabel(e.target.value)} placeholder={t('modal.create.name_placeholder')} className="w-full px-4 py-3 bg-white rounded-xl border-2 border-slate-300 focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none text-xl font-bold text-slate-900 placeholder:text-slate-400 transition-all" />
               </div>

               {/* Color Theme Selector */}
               <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                        <Palette size={14} className="text-slate-400"/>
                        {t('folder.color_label')}
                    </label>
                    {activeTheme && (
                         <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md truncate max-w-[50%]">
                            {t(activeTheme.labelKey)}
                         </span>
                    )}
                  </div>
                  <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar snap-x">
                      {THEMES.map((c) => (
                          <button
                            key={c.theme}
                            onClick={() => setColorTheme(c.theme)}
                            className={`
                                flex-shrink-0 w-10 h-10 rounded-full border-2 transition-all relative snap-start
                                ${c.bg} ${c.border}
                                ${colorTheme === c.theme ? 'scale-110 ring-2 ring-offset-2 ring-slate-400 shadow-md z-10' : 'opacity-70 hover:opacity-100 hover:scale-105'}
                            `}
                            title={t(c.labelKey)}
                          >
                             {colorTheme === c.theme && <span className="absolute inset-0 flex items-center justify-center"><Check size={16} className="text-slate-900"/></span>}
                          </button>
                      ))}
                  </div>
                  <div className="mt-1 flex items-start gap-2 bg-blue-50 p-2.5 rounded-xl border border-blue-100">
                        <Info size={14} className="text-blue-500 mt-0.5 flex-shrink-0" />
                        <p className="text-[10px] sm:text-xs text-blue-700 leading-tight">
                            {activeTheme ? (
                                <>
                                    <span className="font-bold">{t(activeTheme.labelKey)}: </span>
                                    {t(activeTheme.descKey)}
                                </>
                            ) : t('folder.color_desc')}
                        </p>
                  </div>
               </div>
               
               <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${isVisible ? 'bg-primary/10 text-primary' : 'bg-slate-200 text-slate-400'}`}>{isVisible ? <Eye size={20} /> : <EyeOff size={20} />}</div>
                        <div><p className="text-sm font-bold text-slate-700">{t('modal.create.visibility')}</p><p className="text-xs text-slate-400">{isVisible ? t('modal.create.visible') : t('modal.create.hidden')}</p></div>
                    </div>
                    <button onClick={() => setIsVisible(!isVisible)} className={`relative w-12 h-7 rounded-full transition-colors duration-200 ${isVisible ? 'bg-primary' : 'bg-slate-300'}`}><div className={`absolute top-1 left-1 bg-white w-5 h-5 rounded-full shadow-sm transition-transform duration-200 ${isVisible ? 'translate-x-5' : 'translate-x-0'}`} /></button>
               </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-end">
                <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">{t('modal.create.sound_label')}</label>
                <div className="flex space-x-1 bg-slate-100 p-1 rounded-lg">
                    <button onClick={() => setSoundMode('recording')} className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${soundMode === 'recording' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}><div className="flex items-center gap-1"><Mic size={12}/> {t('modal.create.recording')}</div></button>
                    <button onClick={() => setSoundMode('tts')} className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${soundMode === 'tts' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}><div className="flex items-center gap-1"><Keyboard size={12}/> {t('modal.create.tts')}</div></button>
                </div>
            </div>

            {soundMode === 'recording' ? (
                <div className="animate-in slide-in-from-top-2 duration-200"><AudioRecorder initialAudioUrl={previewAudioUrl || undefined} onRecordingComplete={handleAudioRecordingComplete} t={t} /></div>
            ) : (
                <div className="bg-slate-50 rounded-2xl p-4 border-2 border-slate-100 animate-in slide-in-from-top-2 duration-200">
                     <textarea value={textToSpeak} onChange={(e) => setTextToSpeak(e.target.value)} placeholder={label || t('modal.create.tts_placeholder')} className="w-full p-3 pr-12 bg-white rounded-xl border-2 border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none text-slate-800 font-bold resize-none h-24" />
                     <div className="flex justify-between items-center mt-3"><p className="text-xs text-slate-400 font-medium">{t('modal.create.tts_hint')}</p><button onClick={previewTTS} className="flex items-center space-x-2 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-primary active:scale-95 transition-all"><Play size={12} fill="currentColor" /><span>{t('modal.create.preview')}</span></button></div>
                </div>
            )}
          </div>
        </div>

        <div className="p-6 border-t border-slate-100 bg-white" style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}>
          <button onClick={handleSave} disabled={!label || !imagePreview} className={`w-full py-4 rounded-2xl font-black text-xl flex items-center justify-center space-x-2 transition-all ${!label || !imagePreview ? 'bg-slate-100 text-slate-300 cursor-not-allowed' : 'bg-primary text-white shadow-btn active:shadow-btn-active active:translate-y-[4px] hover:brightness-110'}`}><span>{editItem ? t('modal.create.update') : t('modal.create.save')}</span><Check size={24} strokeWidth={3} /></button>
        </div>
      </div>
    </div>
  );
};

export default CreateCardModal;