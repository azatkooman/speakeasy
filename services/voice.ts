
import { AppLanguage } from '../types';
import { Capacitor } from '@capacitor/core';
import { SpeechSynthesis } from '@capgo/capacitor-speech-synthesis';

export interface SpeakOptions {
  text: string;
  language: AppLanguage;
  rate?: number;
  pitch?: number;
  engine?: 'auto' | 'native' | 'web';
}

class VoiceService {
  private isBusy: boolean = false;
  private currentUtterance: SpeechSynthesisUtterance | null = null; // Prevent GC on Android WebView
  private emulationTimeout: number | null = null;

  constructor() {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
        // Trigger voice loading immediately
        const loadVoices = () => {
             const voices = window.speechSynthesis.getVoices();
             // console.log("Voices loaded:", voices.length);
        };
        loadVoices();
        if (window.speechSynthesis.onvoiceschanged !== undefined) {
             window.speechSynthesis.onvoiceschanged = loadVoices;
        }
    }
  }

  async stop(): Promise<void> {
    this.isBusy = false;
    if (this.emulationTimeout) {
        clearTimeout(this.emulationTimeout);
        this.emulationTimeout = null;
    }
    
    // Clear Web Speech reference
    this.currentUtterance = null;
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }

    // Clear Native Android/iOS
    if (Capacitor.isNativePlatform()) {
      try {
        await SpeechSynthesis.cancel();
      } catch (e) { /* ignore */ }
    }
    
    // Small buffer to ensure engine clears
    return new Promise(resolve => setTimeout(resolve, 100));
  }

  async speak(options: SpeakOptions): Promise<void> {
    const { text, language, rate = 0.9, pitch = 1.0, engine = 'auto' } = options;
    if (!text || !text.trim()) return;

    await this.stop();
    this.isBusy = true;

    const sanitizedText = text.replace(/[<>&]/g, '').trim();
    // Use full BCP 47 tags
    const langCode = language === 'ru' ? 'ru-RU' : 'en-US';
    
    const platform = Capacitor.getPlatform(); // 'ios', 'android', 'web'
    const isNativePlatform = Capacitor.isNativePlatform();
    const isAndroid = isNativePlatform && platform === 'android';
    const isIOS = platform === 'ios'; // Strong check for iOS

    let useNative = false;

    // CRITICAL FIX: The Native TTS plugin crashes on iOS with NSUnknownKeyException.
    // iOS WebKit's implementation of Web Speech API uses the system AVSpeechSynthesizer 
    // and is very robust/high-quality, so we force the Web path on iOS even if "Native" is requested.
    if (isIOS) {
        useNative = false;
    } else {
        if (engine === 'native') useNative = true;
        else if (engine === 'web') useNative = false;
        else useNative = isAndroid; // Auto: Native on Android (to fix bugs), Web on other platforms
    }

    return new Promise(async (resolve, reject) => {
      let hasResolved = false;
      const resolveOnce = () => {
          if (!hasResolved) {
              hasResolved = true;
              this.isBusy = false;
              this.currentUtterance = null;
              resolve();
          }
      };

      // Safety timeout: Ensure we resolve eventually even if TTS hangs
      const estimatedDuration = (sanitizedText.length * 100) / rate; 
      const safetyTimeout = setTimeout(resolveOnce, Math.max(3000, estimatedDuration + 2000));

      // --- 1. Native Path (Android Only in practice) ---
      if (useNative && isNativePlatform) {
        try {
          // Attempt to use the native plugin
          await SpeechSynthesis.speak({
            text: sanitizedText,
            lang: langCode,
            rate: rate,
            pitch: pitch,
            volume: 1.0,
            category: 'ambient'
          } as any);

          // Android native plugin often returns immediately (fire-and-forget).
          this.emulationTimeout = window.setTimeout(resolveOnce, Math.max(1000, estimatedDuration));
          return; // Success on native path
        } catch (e) {
          console.warn('Native TTS failed', e);
          if (engine === 'native') {
              // Forced native failed
              clearTimeout(safetyTimeout);
              hasResolved = true; 
              reject(e); // Propagate error
              return;
          }
          // Fall through to Web Speech API...
        }
      }

      // --- 2. Web Speech API Path (iOS, Web, Android Fallback) ---
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        // Attempt to wait for voices if they haven't loaded yet (common on Android WebView startup)
        if (window.speechSynthesis.getVoices().length === 0) {
             await new Promise<void>(r => {
                 let hasTimedOut = false;
                 const t = setTimeout(() => { hasTimedOut = true; r(); }, 1000); // 1s wait max
                 const onVoices = () => {
                     if (!hasTimedOut) {
                         clearTimeout(t);
                         window.speechSynthesis.removeEventListener('voiceschanged', onVoices);
                         r();
                     }
                 };
                 window.speechSynthesis.addEventListener('voiceschanged', onVoices);
             });
        }

        const utterance = new SpeechSynthesisUtterance(sanitizedText);
        
        // CRITICAL: Assign to class property to prevent Android WebView garbage collection
        this.currentUtterance = utterance;

        utterance.lang = langCode;
        utterance.rate = rate;
        utterance.pitch = pitch;
        utterance.volume = 1.0;

        // Attempt to find best voice
        const voices = window.speechSynthesis.getVoices();
        
        // 1. Exact Match (e.g. 'en-US')
        let voice = voices.find(v => v.lang === langCode);
        
        // 2. Prefix Match (e.g. 'en-GB' for 'en')
        if (!voice) {
            voice = voices.find(v => v.lang.startsWith(language));
        }
        
        // 3. Android specific: Google voices often have names like "Google US English"
        if (!voice && isAndroid) {
            voice = voices.find(v => v.name.includes('Google') && v.lang.startsWith(language));
        }

        if (voice) {
            utterance.voice = voice;
        }

        utterance.onend = () => {
            clearTimeout(safetyTimeout);
            resolveOnce();
        };

        utterance.onerror = (e) => {
            console.error("SpeechSynthesis Error:", e);
            clearTimeout(safetyTimeout);
            resolveOnce();
        };

        // Some Android WebViews require onstart to be present to prevent GC
        utterance.onstart = () => {
             // console.log("Started speaking");
        };

        window.speechSynthesis.speak(utterance);
      } else {
        // No TTS available
        clearTimeout(safetyTimeout);
        resolveOnce();
      }
    });
  }
}

export const voiceService = new VoiceService();
