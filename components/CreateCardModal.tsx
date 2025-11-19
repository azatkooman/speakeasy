
import React, { useState, useRef, useEffect } from 'react';
import { X, Image as ImageIcon, Check, Mic, Keyboard, Play, RotateCcw, Camera } from 'lucide-react';
import { AACItem, Category } from '../types';
import AudioRecorder from './AudioRecorder';

interface CreateCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: Omit<AACItem, 'id' | 'createdAt'>) => void;
  editItem?: AACItem | null;
  categories: Category[];
}

// Map themes to display colors for selection
const THEME_PREVIEWS: Record<string, string> = {
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

type SoundMode = 'recording' | 'tts';

const CreateCardModal: React.FC<CreateCardModalProps> = ({ isOpen, onClose, onSave, editItem, categories }) => {
  const [label, setLabel] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Camera State
  const [isCameraActive, setIsCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Sound State
  const [soundMode, setSoundMode] = useState<SoundMode>('recording');
  
  // Recording State
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isAudioDeleted, setIsAudioDeleted] = useState(false);
  
  // TTS State
  const [textToSpeak, setTextToSpeak] = useState('');
  const [isListening, setIsListening] = useState(false);

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
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: 'environment' } 
        });
        streamRef.current = stream;
        setIsCameraActive(true);
    } catch (err) {
        console.error("Error accessing camera:", err);
        alert("Could not access the camera. Please check permissions.");
    }
  };

  const capturePhoto = () => {
      const video = videoRef.current;
      if (video && video.videoWidth > 0 && video.videoHeight > 0) {
          const canvas = document.createElement('canvas');
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext('2d');
          if (ctx) {
              ctx.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
              try {
                const dataUrl = canvas.toDataURL('image/jpeg');
                setImagePreview(dataUrl);
                stopCamera();
              } catch (e) {
                console.error("Capture failed", e);
                alert("Failed to capture photo.");
              }
          }
      }
  };

  const resetForm = () => {
    setLabel('');
    setImagePreview(null);
    setAudioBlob(null);
    setIsAudioDeleted(false);
    setTextToSpeak('');
    setSoundMode('recording');
    stopCamera();
    if (categories.length > 0) setSelectedCategoryId(categories[0].id);
  };

  // --- EFFECTS ---

  // Attach camera stream
  useEffect(() => {
    if (isCameraActive && videoRef.current && streamRef.current) {
        videoRef.current.srcObject = streamRef.current;
        videoRef.current.play().catch(err => console.log("Play error (handled by autoplay):", err));
    }
  }, [isCameraActive]);

  // Handle Open/Edit
  useEffect(() => {
    if (isOpen) {
      if (editItem) {
        setLabel(editItem.label);
        setImagePreview(editItem.imageUrl);
        
        // Handle orphaned categories: If the item's category ID no longer exists, 
        // default to the first available category so the user can "fix" it.
        const categoryExists = categories.some(c => c.id === editItem.category);
        if (categoryExists) {
            setSelectedCategoryId(editItem.category);
        } else if (categories.length > 0) {
            setSelectedCategoryId(categories[0].id);
        }
        
        if (editItem.audioUrl) {
            setSoundMode('recording');
            setAudioBlob(null); 
            setTextToSpeak(editItem.textToSpeak || '');
        } else {
            setSoundMode('tts');
            setTextToSpeak(editItem.textToSpeak || '');
        }
        setIsAudioDeleted(false);
      } else {
        resetForm();
      }
    } else {
        stopCamera();
    }
  }, [isOpen, editItem, categories]);

  // Ensure Default Category
  useEffect(() => {
    if (isOpen && !selectedCategoryId && categories.length > 0) {
        setSelectedCategoryId(categories[0].id);
    }
  }, [isOpen, categories, selectedCategoryId]);

  // Cleanup
  useEffect(() => {
      return () => stopCamera();
  }, []);

  if (!isOpen) return null;

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setImagePreview(base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAudioRecordingComplete = (blob: Blob | null) => {
    setAudioBlob(blob);
    if (blob === null) setIsAudioDeleted(true);
    else setIsAudioDeleted(false);
  };

  const startDictation = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        alert("Speech recognition is not supported in this browser.");
        return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);
    recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setTextToSpeak(transcript);
    };

    recognition.start();
  };

  const previewTTS = () => {
      const text = textToSpeak || label;
      if (!text) return;
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      const savedSettings = localStorage.getItem('aac_settings');
      if (savedSettings) {
          const s = JSON.parse(savedSettings);
          u.rate = s.voiceRate || 0.9;
          u.pitch = s.voicePitch || 1.0;
      }
      window.speechSynthesis.speak(u);
  };

  const handleSave = async () => {
    if (!label || !imagePreview || !selectedCategoryId) return;
    
    let finalAudioUrl: string | undefined = undefined;
    let finalTextToSpeak: string | undefined = undefined;

    if (soundMode === 'recording') {
        if (audioBlob) {
            const reader = new FileReader();
            finalAudioUrl = await new Promise((resolve) => {
                reader.onloadend = () => resolve(reader.result as string);
                reader.readAsDataURL(audioBlob);
            });
        } else if (!isAudioDeleted && editItem?.audioUrl) {
            finalAudioUrl = editItem.audioUrl;
        }
    } else {
        finalTextToSpeak = textToSpeak.trim() || undefined;
    }

    onSave({
        label,
        imageUrl: imagePreview,
        audioUrl: finalAudioUrl,
        textToSpeak: finalTextToSpeak,
        category: selectedCategoryId,
    });
    
    if (!editItem) resetForm();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-lg sm:rounded-3xl rounded-t-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] transition-all">
        
        <div className="flex justify-between items-center p-5 border-b border-slate-100 bg-slate-50/50">
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">{editItem ? 'Edit Card' : 'New Card'}</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-200 text-slate-600 transition-colors">
            <X size={28} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          
          <div className="flex flex-col sm:flex-row gap-6">
            <div className="relative flex-shrink-0 aspect-square w-32 sm:w-40 rounded-2xl overflow-hidden border-2 border-slate-200 bg-slate-50 group shadow-sm">
              {isCameraActive ? (
                  <div className="absolute inset-0 bg-black flex flex-col items-center justify-center">
                      <video 
                        ref={videoRef} 
                        autoPlay 
                        playsInline 
                        muted 
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                      <div className="absolute bottom-2 flex space-x-4 z-10">
                          <button 
                            onClick={stopCamera}
                            className="p-2 bg-white/20 rounded-full text-white hover:bg-white/40 backdrop-blur-md"
                          >
                              <X size={20} />
                          </button>
                          <button 
                            onClick={capturePhoto}
                            className="w-12 h-12 rounded-full bg-white border-4 border-slate-300 hover:scale-110 transition-transform"
                          />
                      </div>
                  </div>
              ) : (
                  <>
                    {imagePreview ? (
                        <div className="relative w-full h-full group">
                            <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center space-y-2">
                                <button 
                                    onClick={() => fileInputRef.current?.click()}
                                    className="px-3 py-1 bg-white rounded-full text-xs font-bold text-slate-700 hover:bg-primary hover:text-white flex items-center gap-1"
                                >
                                    <ImageIcon size={12}/> Change
                                </button>
                                <button 
                                    onClick={startCamera}
                                    className="px-3 py-1 bg-white rounded-full text-xs font-bold text-slate-700 hover:bg-primary hover:text-white flex items-center gap-1"
                                >
                                    <Camera size={12}/> Retake
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center p-2 space-y-2">
                             <button 
                                onClick={startCamera}
                                className="w-full flex-1 bg-primary/5 hover:bg-primary/10 rounded-xl flex flex-col items-center justify-center text-primary transition-colors"
                             >
                                <Camera size={20} className="mb-1" />
                                <span className="text-[10px] font-black uppercase tracking-wide">Camera</span>
                             </button>
                             <button 
                                onClick={() => fileInputRef.current?.click()}
                                className="w-full flex-1 bg-slate-100 hover:bg-slate-200 rounded-xl flex flex-col items-center justify-center text-slate-500 transition-colors"
                             >
                                <ImageIcon size={20} className="mb-1" />
                                <span className="text-[10px] font-black uppercase tracking-wide">Upload</span>
                             </button>
                        </div>
                    )}
                  </>
              )}
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
            </div>

            <div className="flex-1 space-y-3">
               <div className="flex items-center justify-between">
                 <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">Name (Label)</label>
               </div>
               <div className="relative">
                 <input
                    type="text"
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    placeholder="e.g. Apple"
                    className="w-full px-4 py-3 bg-white rounded-xl border-2 border-slate-300 focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none text-xl font-bold text-slate-900 placeholder:text-slate-400 transition-all"
                  />
               </div>
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">Category</label>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategoryId(cat.id)}
                  className={`
                    flex flex-col items-center justify-center p-2 rounded-2xl border-2 transition-all active:scale-95
                    ${selectedCategoryId === cat.id 
                      ? `border-current bg-white shadow-md scale-105 ring-2 ring-offset-2 ring-slate-200` 
                      : 'border-transparent hover:bg-slate-50'}
                  `}
                  style={{
                      borderColor: selectedCategoryId === cat.id ? undefined : 'transparent', 
                  }}
                >
                  <div 
                    className="w-8 h-8 rounded-full mb-1 shadow-sm border border-black/5" 
                    style={{ backgroundColor: THEME_PREVIEWS[cat.colorTheme] || '#f0f0f0' }} 
                  />
                  <span className="text-[10px] font-bold text-slate-700 uppercase truncate w-full text-center">{cat.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-end">
                <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">Card Sound</label>
                <div className="flex space-x-1 bg-slate-100 p-1 rounded-lg">
                    <button 
                        onClick={() => setSoundMode('recording')}
                        className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${soundMode === 'recording' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <div className="flex items-center gap-1"><Mic size={12}/> Recording</div>
                    </button>
                    <button 
                        onClick={() => setSoundMode('tts')}
                        className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${soundMode === 'tts' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <div className="flex items-center gap-1"><Keyboard size={12}/> Text to Speech</div>
                    </button>
                </div>
            </div>

            {soundMode === 'recording' ? (
                <div className="animate-in slide-in-from-top-2 duration-200">
                     <AudioRecorder 
                        initialAudioUrl={editItem?.audioUrl}
                        onRecordingComplete={handleAudioRecordingComplete} 
                    />
                </div>
            ) : (
                <div className="bg-slate-50 rounded-2xl p-4 border-2 border-slate-100 animate-in slide-in-from-top-2 duration-200">
                     <div className="relative">
                        <textarea
                            value={textToSpeak}
                            onChange={(e) => setTextToSpeak(e.target.value)}
                            placeholder={label || "Enter what the card should say..."}
                            className="w-full p-3 pr-12 bg-white rounded-xl border-2 border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none text-slate-800 font-bold resize-none h-24"
                        />
                        <div className="absolute right-2 bottom-2 flex flex-col gap-2">
                            <button
                                onClick={startDictation}
                                className={`p-2 rounded-lg transition-colors ${isListening ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}
                                title="Dictate (Voice to Text)"
                            >
                                <Mic size={18} />
                            </button>
                        </div>
                     </div>
                     <div className="flex justify-between items-center mt-3">
                         <p className="text-xs text-slate-400 font-medium">
                            Leaving this empty will speak the card name.
                         </p>
                         <button 
                            onClick={previewTTS}
                            className="flex items-center space-x-2 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-primary active:scale-95 transition-all"
                         >
                            <Play size={12} fill="currentColor" />
                            <span>Preview Voice</span>
                         </button>
                     </div>
                </div>
            )}
          </div>

        </div>

        <div className="p-6 border-t border-slate-100 bg-white">
          <button
            onClick={handleSave}
            disabled={!label || !imagePreview || !selectedCategoryId}
            className={`
              w-full py-4 rounded-2xl font-black text-xl flex items-center justify-center space-x-2 transition-all
              ${!label || !imagePreview || !selectedCategoryId
                ? 'bg-slate-100 text-slate-300 cursor-not-allowed' 
                : 'bg-primary text-white shadow-btn active:shadow-btn-active active:translate-y-[4px] hover:brightness-110'}
            `}
          >
            <span>{editItem ? 'Update Card' : 'Save Card'}</span>
            <Check size={24} strokeWidth={3} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateCardModal;
