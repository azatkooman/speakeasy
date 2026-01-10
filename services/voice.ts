import { AppLanguage } from '../types';
import { Capacitor } from '@capacitor/core';

// NOTE: We use dynamic import for the plugin to ensure the app doesn't crash on Web 
// if the module cannot be resolved or initialized at startup.

export interface SpeakOptions {
  text: string;
  language: AppLanguage;
  rate?: number;
  pitch?: number;
}

/**
 * VoiceService handles text-to-speech across different environments.
 * Uses @capgo/capacitor-speech-synthesis for native devices (Android) and Web Speech API for browser/iOS.
 */
class VoiceService {
  private activeUtterance: SpeechSynthesisUtterance | null = null;
  private isBusy: boolean = false;
  private emulationTimeout: number | null = null;

  constructor() {
    // Attempt to preload voices on Web
    if (typeof window !== 'undefined' && window.speechSynthesis) {
        // Some browsers load voices asynchronously
        const loadVoices = () => {
             window.speechSynthesis.getVoices();
        };
        loadVoices();
        if (window.speechSynthesis.onvoiceschanged !== undefined) {
             window.speechSynthesis.onvoiceschanged = loadVoices;
        }
    }
  }

  /**
   * Stops any currently playing speech.
   */
  async stop(): Promise<void> {
    this.isBusy = false;
    
    // Clear any artificial delay timer
    if (this.emulationTimeout) {
        clearTimeout(this.emulationTimeout);
        this.emulationTimeout = null;
    }

    // 1. Reset Web Speech API
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel();
      } catch (e) {
        console.warn('Web Speech cancel failed', e);
      }
      this.activeUtterance = null;
    }

    // 2. Stop Native Plugin (Dynamically imported)
    // CRITICAL: Skip on iOS to avoid crashes
    if (Capacitor.isNativePlatform() && Capacitor.getPlatform() !== 'ios') {
      try {
        const { SpeechSynthesis } = await import('@capgo/capacitor-speech-synthesis');
        await SpeechSynthesis.cancel();
      } catch (e) {
        // Ignore errors if plugin missing or nothing playing
      }
    }
    
    // Short delay to ensure cancellation processes, but short enough to not block Web interactions
    return new Promise(resolve => setTimeout(resolve, 10));
  }

  /**
   * Speaks the provided text using the best available engine.
   */
  async speak(options: SpeakOptions): Promise<void> {
    const { text, language, rate = 0.9, pitch = 1.0 } = options;
    
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return;
    }

    const sanitizedText = text.replace(/[<>&]/g, '').trim();
    if (!sanitizedText) return;

    // Stop previous speech if any
    if (this.isBusy) await this.stop();
    
    this.isBusy = true;
    const langCode = language === 'ru' ? 'ru-RU' : 'en-US';
    
    // Explicitly identify Android native environment
    const isNativeAndroid = Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';

    return new Promise(async (resolve) => {
      let hasResolved = false;

      // 1. Safety watchdog
      // If for any reason TTS hangs (no callback), we force resolve after 10s
      const safetyTimeout = setTimeout(() => {
        if (!hasResolved) {
            hasResolved = true;
            this.isBusy = false;
            resolve();
        }
      }, 10000);

      const finish = () => {
        if (!hasResolved) {
            hasResolved = true;
            clearTimeout(safetyTimeout);
            this.isBusy = false;
            resolve();
        }
      };

      // 2. Android Native Path
      if (isNativeAndroid) {
        try {
          const { SpeechSynthesis } = await import('@capgo/capacitor-speech-synthesis');
          
          const startTime = Date.now();
          
          await SpeechSynthesis.speak({
            text: sanitizedText,
            lang: langCode,
            rate: rate,
            pitch: pitch,
            volume: 1.0,
            category: 'ambient',
          } as any);

          const elapsed = Date.now() - startTime;

          // FIX: If the native call resolves too quickly (fire-and-forget or early return), we wait manually.
          // Increased threshold to 250ms to catch more potential early returns on slower devices.
          if (elapsed < 250) {
             const calculatedDuration = (sanitizedText.length * 100) / (rate || 1);
             const waitTime = Math.max(800, Math.min(5000, calculatedDuration));
             
             this.emulationTimeout = window.setTimeout(() => {
                 this.emulationTimeout = null;
                 finish();
             }, waitTime);
          } else {
              finish();
          }
          return;
        } catch (e) {
          console.warn('Native Android TTS failed, falling back to Web Speech', e);
          // Fall through to Web Speech logic below
        }
      }

      // 3. Web Speech API Path (iOS, Web, or Android fallback)
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        try {
            // Cancel any pending utterance to clear queue immediately
            window.speechSynthesis.cancel();

            const utterance = new SpeechSynthesisUtterance(sanitizedText);
            this.activeUtterance = utterance;
            
            utterance.lang = langCode;
            utterance.rate = rate;
            utterance.pitch = pitch;

            // Try to select a specific voice if available
            const voices = window.speechSynthesis.getVoices();
            // Match language prefix (e.g. 'en' matches 'en-US', 'en-GB')
            const voice = voices.find(v => v.lang.replace('_', '-').startsWith(langCode.split('-')[0]));
            if (voice) {
                utterance.voice = voice;
            }

            utterance.onend = () => {
              // Ensure we don't clear if a new utterance has already started
              if (this.activeUtterance === utterance) {
                  this.activeUtterance = null;
              }
              finish();
            };

            utterance.onerror = (e: any) => {
              if (this.activeUtterance === utterance) {
                  this.activeUtterance = null;
              }
              if (e.error !== 'interrupted' && e.error !== 'canceled') {
                console.error('Web Speech Error:', e.error || e);
              }
              // Even on error, we resolve to unblock the queue
              finish();
            };

            // Backup timer for Web Speech reliability (often 'onend' doesn't fire on mobile web)
            const backupDuration = Math.min(8000, Math.max(1000, sanitizedText.length * 150));
            setTimeout(() => {
                if (this.activeUtterance === utterance) {
                    finish();
                }
            }, backupDuration);

            window.speechSynthesis.speak(utterance);
        } catch (err) {
            console.error('Speech synthesis initiation failed', err);
            finish();
        }
      } else {
        // No TTS available
        finish();
      }
    });
  }
}

export const voiceService = new VoiceService();