import { AppLanguage } from '../types';

export interface SpeakOptions {
  text: string;
  language: AppLanguage;
  rate?: number;
  pitch?: number;
}

/**
 * VoiceService handles text-to-speech across different environments.
 * Optimized for @capgo/capacitor-speech-synthesis with robust hang protection.
 */
class VoiceService {
  private activeUtterance: SpeechSynthesisUtterance | null = null;
  private isBusy: boolean = false;

  constructor() {}

  private getCapgoPlugin() {
    const win = window as any;
    return win.Capacitor?.Plugins?.SpeechSynthesis;
  }

  /**
   * Stops any currently playing speech and resets the engine state.
   */
  async stop(): Promise<void> {
    this.isBusy = false;
    
    // 1. Reset Web Speech API
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      try {
        window.speechSynthesis.pause();
        window.speechSynthesis.cancel();
      } catch (e) {
        console.warn('Web Speech cancel failed', e);
      }
      this.activeUtterance = null;
    }

    // 2. Stop Native Capgo Plugin
    const capgo = this.getCapgoPlugin();
    if (capgo) {
      try {
        await Promise.race([
          capgo.stop(),
          new Promise(resolve => setTimeout(resolve, 800))
        ]);
      } catch (e) {
        console.warn('Capgo stop failed', e);
      }
    }
    
    // Crucial for iOS: Wait a moment for the audio session to actually close
    return new Promise(resolve => setTimeout(resolve, 100));
  }

  /**
   * Speaks the provided text using the best available engine.
   * Includes a 10s watchdog timeout to prevent UI lockup.
   */
  async speak(options: SpeakOptions): Promise<void> {
    const { text, language, rate = 0.9, pitch = 1.0 } = options;
    
    // Robust validation to prevent "Text is required" native errors
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      console.warn('VoiceService: Cancelled - No valid text to speak');
      return;
    }

    // Sanitize text to prevent SSML parsing errors (strip < > & etc)
    const sanitizedText = text.replace(/[<>&]/g, '').trim();
    if (!sanitizedText) return;

    if (this.isBusy) await this.stop();
    
    this.isBusy = true;
    const langCode = language === 'ru' ? 'ru-RU' : 'en-US';

    return new Promise(async (resolve) => {
      // Watchdog timeout
      const timeoutId = setTimeout(() => {
        console.warn('Speech timeout reached, forcing resolve');
        this.stop().then(resolve);
      }, 10000);

      const onDone = () => {
        this.isBusy = false;
        clearTimeout(timeoutId);
        resolve();
      };

      // 1. Attempt Native @capgo/capacitor-speech-synthesis
      const capgo = this.getCapgoPlugin();
      if (capgo) {
        try {
          await this.stop();
          await capgo.speak({
            value: sanitizedText,
            lang: langCode,
            rate: rate,
            pitch: pitch,
            volume: 1.0,
          });
          onDone();
          return;
        } catch (e) {
          console.warn('Capgo speak failed, falling back to web', e);
        }
      }

      // 2. Web Speech API Fallback
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        await this.stop();

        // Small delay ensures the engine is ready after cancel() - especially on mobile
        setTimeout(() => {
          try {
            const utterance = new SpeechSynthesisUtterance(sanitizedText);
            this.activeUtterance = utterance;
            utterance.lang = langCode;
            utterance.rate = rate;
            utterance.pitch = pitch;
            
            utterance.onend = () => {
              this.activeUtterance = null;
              onDone();
            };

            utterance.onerror = (e: any) => {
              this.activeUtterance = null;
              if (e.error !== 'interrupted' && e.error !== 'canceled') {
                console.error('Web Speech Error:', e.error || e);
              }
              onDone();
            };

            window.speechSynthesis.speak(utterance);
          } catch (err) {
            console.error('Speech synthesis initiation failed', err);
            onDone();
          }
        }, 150); 
      } else {
        onDone();
      }
    });
  }
}

export const voiceService = new VoiceService();