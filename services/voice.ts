import { AppLanguage } from '../types';
import { TextToSpeech } from '@capacitor-community/text-to-speech';
import { Capacitor } from '@capacitor/core';

export interface SpeakOptions {
  text: string;
  language: AppLanguage;
  rate?: number;
  pitch?: number;
}

/**
 * VoiceService handles text-to-speech across different environments.
 * Uses @capacitor-community/text-to-speech for native devices and Web Speech API for browser.
 */
class VoiceService {
  private activeUtterance: SpeechSynthesisUtterance | null = null;
  private isBusy: boolean = false;

  constructor() {}

  /**
   * Stops any currently playing speech.
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

    // 2. Stop Native Plugin
    if (Capacitor.isNativePlatform()) {
      try {
        await TextToSpeech.stop();
      } catch (e) {
        // Ignore errors if nothing is playing
      }
    }
    
    return new Promise(resolve => setTimeout(resolve, 100));
  }

  /**
   * Speaks the provided text using the best available engine.
   */
  async speak(options: SpeakOptions): Promise<void> {
    const { text, language, rate = 0.9, pitch = 1.0 } = options;
    
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return;
    }

    // Sanitize text
    const sanitizedText = text.replace(/[<>&]/g, '').trim();
    if (!sanitizedText) return;

    if (this.isBusy) await this.stop();
    
    this.isBusy = true;
    const langCode = language === 'ru' ? 'ru-RU' : 'en-US';

    return new Promise(async (resolve) => {
      // Watchdog timeout
      const timeoutId = setTimeout(() => {
        this.stop().then(resolve);
      }, 10000);

      const onDone = () => {
        this.isBusy = false;
        clearTimeout(timeoutId);
        resolve();
      };

      // 1. Attempt Native Plugin
      if (Capacitor.isNativePlatform()) {
        try {
          await TextToSpeech.speak({
            text: sanitizedText,
            lang: langCode,
            rate: rate,
            pitch: pitch,
            volume: 1.0,
            category: 'ambient',
          });
          onDone();
          return;
        } catch (e) {
          console.warn('Native TTS failed, falling back to web', e);
          // Fall through to web speech
        }
      }

      // 2. Web Speech API Fallback
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        // Small delay ensures the engine is ready
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
        }, 50); 
      } else {
        onDone();
      }
    });
  }
}

export const voiceService = new VoiceService();