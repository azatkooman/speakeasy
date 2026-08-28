
export class AudioPlayerService {
    private static instance: AudioPlayerService;
    private audioCtx: AudioContext | null = null;
    private isUnlocked = false;
  
    private constructor() {}
  
    public static getInstance(): AudioPlayerService {
      if (!AudioPlayerService.instance) {
        AudioPlayerService.instance = new AudioPlayerService();
      }
      return AudioPlayerService.instance;
    }
  
    private getContext(): AudioContext | null {
      if (!this.audioCtx) {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          this.audioCtx = new AudioContextClass();
        }
      }
      return this.audioCtx;
    }
  
    public unlock() {
      if (this.isUnlocked) return;
      
      const ctx = this.getContext();
      if (ctx) {
        if (ctx.state === 'suspended') {
          ctx.resume();
        }
        // Play silent buffer to wake up audio engine (iOS)
        const buffer = ctx.createBuffer(1, 1, 22050);
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        source.start(0);
        this.isUnlocked = true;
      }
    }
  
    public async play(url: string): Promise<void> {
      // The executor is deliberately not async: an async executor swallows any
      // rejection thrown inside it, because the returned promise is discarded.
      // The work runs in an inner function whose failure is routed to resolve,
      // matching this method's contract that playback never rejects.
      return new Promise<void>((resolve) => { void (async () => {
        const timeout = setTimeout(() => resolve(), 8000); // Safety timeout
  
        const fallbackToHtmlAudio = () => {
          try {
            const audio = new Audio(url);
            audio.onended = () => { clearTimeout(timeout); resolve(); };
            audio.onerror = (e) => { 
              console.error("HTML Audio fallback error", e);
              clearTimeout(timeout); 
              resolve(); 
            };
            audio.volume = 1.0;
            const playPromise = audio.play();
            if (playPromise !== undefined) {
              playPromise.catch(e => {
                console.error("HTML Audio play failed", e);
                resolve();
              });
            }
          } catch (err) {
            console.error("Audio playback failed completely", err);
            clearTimeout(timeout);
            resolve();
          }
        };
  
        try {
          const ctx = this.getContext();
          // Use Web Audio API for HTTP/HTTPS/Data URLs. Local file:// often fails with fetch in Web Audio.
          const isLocalFile = url.includes('_capacitor_file_') || url.startsWith('file://');
  
          if (ctx && !isLocalFile) {
            if (ctx.state === 'suspended') await ctx.resume();
  
            const response = await fetch(url);
            if (!response.ok) throw new Error("Fetch failed");
            
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
            
            const source = ctx.createBufferSource();
            source.buffer = audioBuffer;
  
            const gainNode = ctx.createGain();
            gainNode.gain.value = 2.0; // Boost volume
            
            const compressor = ctx.createDynamicsCompressor();
            source.connect(gainNode);
            gainNode.connect(compressor);
            compressor.connect(ctx.destination);
  
            source.onended = () => {
              clearTimeout(timeout);
              resolve();
            };
            source.start(0);
            return;
          }
          fallbackToHtmlAudio();
        } catch (e) {
          console.warn("Web Audio API failed, trying fallback:", e);
          fallbackToHtmlAudio();
        }
      })(); });
    }
  }
  
  export const audioPlayer = AudioPlayerService.getInstance();
