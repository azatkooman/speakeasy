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

  constructor() {}

  private getCapgoPlugin() {
    const win = window as any;
    return win.Capacitor?.Plugins?.SpeechSynthesis;
  }

  /**
   * Stops any currently playing speech and resets the engine state.
   */
  async stop(): Promise<void> {
    // 1. Reset Web Speech API
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      this.activeUtterance = null;
    }

    // 2. Stop Native Capgo Plugin
    const capgo = this.getCapgoPlugin();
    if (capgo) {
      try {
        // We use a race to ensure stop doesn't hang the main thread
        await Promise.race([
          capgo.stop(),
          new Promise(resolve => setTimeout(resolve, 500))
        ]);
      } catch (e) {
        console.warn('Capgo stop failed', e);
      }
    }
  }

  /**
   * Speaks the provided text using the best available engine.
   * Includes a 10s watchdog timeout to prevent UI lockup.
   */
  async speak(options: SpeakOptions): Promise<void> {
    const { text, language, rate = 0.9, pitch = 1.0 } = options;
    
    if (!text || text.trim().length === 0) return;

    const langCode = language === 'ru' ? 'ru-RU' : 'en-US';

    return new Promise(async (resolve) => {
      // 10 second watchdog timeout: speech should never take longer than this for a single card
      const timeoutId = setTimeout(() => {
        console.warn('Speech timeout reached, forcing resolve');
        this.stop();
        resolve();
      }, 10000);

      const onDone = () => {
        clearTimeout(timeoutId);
        resolve();
      };

      // 1. Attempt Native @capgo/capacitor-speech-synthesis
      const capgo = this.getCapgoPlugin();
      if (capgo) {
        try {
          await this.stop();
          await capgo.speak({
            value: text,
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

        // Small delay ensures the engine is ready after cancel()
        setTimeout(() => {
          try {
            const utterance = new SpeechSynthesisUtterance(text);
            this.activeUtterance = utterance; // Keep reference to prevent GC
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
        }, 60);
      } else {
        onDone();
      }
    });
  }
}

export const voiceService = new VoiceService();