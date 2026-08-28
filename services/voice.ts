
import { AppLanguage } from '../types';
import { Capacitor } from '@capacitor/core';
import { SpeechSynthesis } from '@capgo/capacitor-speech-synthesis';
import { getLanguageOption } from '../utils/languages';

export interface SpeakOptions {
  text: string;
  language: AppLanguage;
  rate?: number;
  pitch?: number;
}

class VoiceService {
  private isBusy: boolean = false;
  private currentUtterance: SpeechSynthesisUtterance | null = null; // Prevent GC on Android WebView

  constructor() {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
        // Trigger voice loading immediately
        const loadVoices = () => {
             window.speechSynthesis.getVoices();
        };
        loadVoices();
        if (window.speechSynthesis.onvoiceschanged !== undefined) {
             window.speechSynthesis.onvoiceschanged = loadVoices;
        }
    }
  }

  async stop(): Promise<void> {
    this.isBusy = false;
    
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
    return new Promise(resolve => setTimeout(resolve, 50));
  }

  async speak(options: SpeakOptions): Promise<void> {
    const { text, language, rate = 0.9, pitch = 1.0 } = options;
    if (!text || !text.trim()) return;

    await this.stop();
    this.isBusy = true;

    const sanitizedText = text.replace(/[<>&]/g, '').trim();
    // Region-qualified BCP 47 tag. A bare 'fr'/'es' resolves inconsistently
    // across engines, and an unmapped language silently falls back to the
    // device locale — which is what made fr/es speak with an English voice.
    const langCode = getLanguageOption(language).bcp47;
    
    const platform = Capacitor.getPlatform(); // 'ios', 'android', 'web'
    const isAndroid = platform === 'android';
    const isIOS = platform === 'ios';

    // STRATEGY:
    // 1. iOS: Always use Web Speech API. It maps to AVSpeechSynthesizer natively and is excellent. 
    //    Native plugins often break on iOS due to audio session conflicts.
    // 2. Android: Always try Native Plugin first. The WebView TTS is unreliable (GC bugs).
    //    Fallback to Web Speech API if native fails.
    // 3. Web: Use Web Speech API.

    /*
     * The executor is deliberately not async. An async executor discards its
     * own returned promise, so anything that throws inside it becomes an
     * unhandled rejection rather than reaching a caller — and this method's
     * contract is that speaking always settles, via `finish()` or the safety
     * timeout, so that a failed utterance can never leave the sentence frozen.
     * The work runs in an inner function whose failure routes to finish().
     */
    return new Promise<void>((resolve) => { void (async () => {
      let hasResolved = false;

      const finish = () => {
          if (!hasResolved) {
              hasResolved = true;
              this.isBusy = false;
              this.currentUtterance = null;
              resolve();
          }
      };

      // Safety timeout: Ensure we resolve eventually even if TTS hangs
      const estimatedDuration = (sanitizedText.length * 100) / rate; 
      const safetyTimeout = setTimeout(finish, Math.max(3000, estimatedDuration + 2000));

      // --- Android Native Path ---
      if (isAndroid) {
        try {
          // The plugin's option is `language` (a BCP 47 tag), not `lang`.
          // Passing the wrong key made the native engine fall back to the
          // device locale and ignore the app's language setting entirely.
          // 'Flush' so a new tap replaces the previous utterance instead of
          // queueing behind it.
          await SpeechSynthesis.speak({
            text: sanitizedText,
            language: langCode,
            rate: rate,
            pitch: pitch,
            volume: 1.0,
            queueStrategy: 'Flush'
          });
          
          // Android native plugin fires and returns immediately. 
          // We emulate a wait time based on text length so we don't clear the sentence too fast.
          setTimeout(finish, Math.max(1000, estimatedDuration));
          return;
        } catch (e) {
          console.warn('Android Native TTS failed, falling back to Web API', e);
          // Fall through to Web Speech API...
        }
      }

      // --- Web Speech API Path (iOS, Web, Android Fallback) ---
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        
        // Ensure voices are loaded
        if (window.speechSynthesis.getVoices().length === 0) {
             await new Promise<void>(r => {
                 // Arm the fallback first so the listener can close over a const.
                 const tOut = window.setTimeout(r, 500); // Don't wait forever
                 window.speechSynthesis.addEventListener('voiceschanged', () => {
                     clearTimeout(tOut);
                     r();
                 }, { once: true });
             });
        }

        const utterance = new SpeechSynthesisUtterance(sanitizedText);
        
        // CRITICAL: Assign to class property to prevent Android WebView garbage collection
        this.currentUtterance = utterance;

        utterance.lang = langCode;
        utterance.rate = rate;
        utterance.pitch = pitch;
        utterance.volume = 1.0;

        // Attempt to find best voice.
        // Android WebView reports tags with an underscore ('fr_FR'), so normalise
        // before comparing or the exact match never hits there.
        const voices = window.speechSynthesis.getVoices();
        const normalise = (tag: string) => tag.replace('_', '-').toLowerCase();
        const wanted = normalise(langCode);

        // 1. Exact region match (e.g. 'fr-FR')
        let voice = voices.find(v => normalise(v.lang) === wanted);

        // 2. Same language, any region (e.g. 'fr-CA' for 'fr-FR')
        if (!voice) voice = voices.find(v => normalise(v.lang).startsWith(`${language}-`) || normalise(v.lang) === language);

        // 3. Android WebView specific: Google voices are usually the highest quality
        if (!voice && isAndroid) {
            voice = voices.find(v => v.name.includes('Google') && normalise(v.lang).startsWith(language));
        }

        if (voice) utterance.voice = voice;

        utterance.onend = () => {
            clearTimeout(safetyTimeout);
            finish();
        };

        utterance.onerror = (e) => {
            // Cast to any to access error property safely
            const val = (e as any).error;
            
            // Ignore interruption/cancellation errors which happen frequently when tapping quickly
            if (val === 'canceled' || val === 'interrupted') {
                clearTimeout(safetyTimeout);
                finish();
                return;
            }

            console.error("SpeechSynthesis Error:", val, e);
            clearTimeout(safetyTimeout);
            finish();
        };

        // iOS sometimes needs a forced resume if audio session was interrupted
        if (isIOS && window.speechSynthesis.paused) {
            window.speechSynthesis.resume();
        }

        window.speechSynthesis.speak(utterance);
      } else {
        // No TTS available
        clearTimeout(safetyTimeout);
        finish();
      }
    })().catch(e => { console.error('SpeechSynthesis failed unexpectedly', e); resolve(); }); });
  }
}

export const voiceService = new VoiceService();
