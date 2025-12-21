import { AppLanguage } from '../types';

export interface SpeakOptions {
  text: string;
  language: AppLanguage;
  rate?: number;
  pitch?: number;
}

/**
 * VoiceService handles text-to-speech across different environments.
 * It is optimized for @capgo/capacitor-speech-synthesis but maintains 
 * standard Web Speech API support for browser environments.
 */
class VoiceService {
  constructor() {}

  /**
   * Helper to get the Capgo SpeechSynthesis plugin via the global Capacitor object.
   * This avoids static import errors that cause white screens in browsers.
   */
  private getCapgoPlugin() {
    const win = window as any;
    return win.Capacitor?.Plugins?.SpeechSynthesis;
  }

  /**
   * Stops any currently playing speech.
   */
  async stop(): Promise<void> {
    // 1. Stop Native Capgo Plugin
    const capgo = this.getCapgoPlugin();
    if (capgo) {
      try {
        await capgo.stop();
      } catch (e) {
        console.warn('Capgo stop failed', e);
      }
    }
    
    // 2. Stop Web Speech API
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }

  /**
   * Speaks the provided text using the best available engine.
   */
  async speak(options: SpeakOptions): Promise<void> {
    const { text, language, rate = 0.9, pitch = 1.0 } = options;
    
    if (!text || text.trim().length === 0) return;

    const langCode = language === 'ru' ? 'ru-RU' : 'en-US';

    // 1. Attempt Native @capgo/capacitor-speech-synthesis
    const capgo = this.getCapgoPlugin();
    if (capgo) {
      try {
        await this.stop();
        // @capgo plugin uses 'value' for the text string
        await capgo.speak({
          value: text,
          lang: langCode,
          rate: rate,
          pitch: pitch,
          volume: 1.0,
        });
        return;
      } catch (e) {
        console.warn('Capgo speak failed, falling back to web', e);
      }
    }

    // 2. Web Speech API Fallback (Standard Browser)
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      return new Promise((resolve) => {
        // Stop current speech
        this.stop();

        // Small delay to allow the browser's speech engine to clear its state
        setTimeout(() => {
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.lang = langCode;
          utterance.rate = rate;
          utterance.pitch = pitch;
          
          utterance.onend = () => {
            resolve();
          };

          utterance.onerror = (e: any) => {
            // Ignore interruption errors as they are expected when skipping cards
            if (e.error !== 'interrupted' && e.error !== 'canceled') {
              console.error('Web Speech Error:', e.error || e);
            }
            resolve();
          };

          window.speechSynthesis.speak(utterance);
        }, 50);
      });
    }
  }
}

export const voiceService = new VoiceService();