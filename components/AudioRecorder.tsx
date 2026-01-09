import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Play, Trash2, Volume2, Pause } from 'lucide-react';

interface AudioRecorderProps {
  initialAudioUrl?: string;
  onRecordingComplete: (blob: Blob | null) => void;
  t: (key: any) => string;
}

const AudioRecorder: React.FC<AudioRecorderProps> = ({ initialAudioUrl, onRecordingComplete, t }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(initialAudioUrl || null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackProgress, setPlaybackProgress] = useState(0); // 0 to 100
  const [playbackTime, setPlaybackTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playTimerRef = useRef<number | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);

  useEffect(() => {
    setAudioUrl(initialAudioUrl || null);
  }, [initialAudioUrl]);

  useEffect(() => {
      return () => {
          if (timerRef.current) clearInterval(timerRef.current);
          if (playTimerRef.current) clearInterval(playTimerRef.current);
          if (audioRef.current) {
              audioRef.current.pause();
              audioRef.current = null;
          }
      };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const mimeTypes = [
        'audio/mp4',
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/ogg;codecs=opus',
        'audio/aac',
        ''
      ];

      let selectedType = '';
      for (const type of mimeTypes) {
        if (type && MediaRecorder.isTypeSupported(type)) {
          selectedType = type;
          break;
        }
      }

      const options = selectedType ? { mimeType: selectedType } : undefined;
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
            chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const finalType = selectedType || mediaRecorder.mimeType || 'audio/mp4';
        const blob = new Blob(chunksRef.current, { type: finalType });
        const url = URL.createObjectURL(blob);
        
        setAudioUrl(url);
        onRecordingComplete(blob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingDuration(0);
      
      timerRef.current = window.setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);

    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("Could not access microphone. Please ensure you have granted permission.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const togglePlayback = () => {
    if (isPlaying) {
        stopPlayback();
    } else {
        playPreview();
    }
  };

  const stopPlayback = () => {
      if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
      }
      setIsPlaying(false);
      setPlaybackProgress(0);
      setPlaybackTime(0);
      if (playTimerRef.current) clearInterval(playTimerRef.current);
  };

  const playPreview = () => {
    if (audioUrl) {
      if (audioRef.current) {
          audioRef.current.pause();
      }
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      
      audio.load();
      
      audio.onloadedmetadata = () => {
          if (isFinite(audio.duration)) {
              setTotalDuration(audio.duration);
          }
      };

      audio.onended = () => {
          setIsPlaying(false);
          setPlaybackProgress(0);
          setPlaybackTime(0);
          if (playTimerRef.current) clearInterval(playTimerRef.current);
      };
      
      audio.onerror = (e) => {
          console.error("Audio Playback Error:", e);
          setIsPlaying(false);
          alert("Playback failed. Format may not be supported.");
      };
      
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.then(() => {
            setIsPlaying(true);
            playTimerRef.current = window.setInterval(() => {
                if (audio.duration && !isNaN(audio.duration)) {
                    setPlaybackProgress((audio.currentTime / audio.duration) * 100);
                    setPlaybackTime(audio.currentTime);
                }
            }, 50);
        }).catch(error => {
            console.error("Play prevented:", error);
            setIsPlaying(false);
        });
      }
    }
  };

  const deleteRecording = () => {
    stopPlayback();
    setAudioUrl(null);
    setRecordingDuration(0);
    chunksRef.current = [];
    onRecordingComplete(null);
  };

  const formatTime = (seconds: number) => {
      if (!isFinite(seconds) || isNaN(seconds)) return "0:00";
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-slate-50 rounded-2xl p-4 border-2 border-slate-100 flex flex-col gap-3">
      
      <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors duration-300 ${audioUrl ? (isPlaying ? 'bg-primary text-white' : 'bg-green-100 text-green-600') : 'bg-slate-200 text-slate-400'}`}>
                {audioUrl ? <Volume2 size={20} className={isPlaying ? "animate-pulse" : ""} /> : <Mic size={20} />}
            </div>
            <div>
                <div className="text-sm font-bold text-slate-700">
                    {isRecording ? t('recorder.recording') : audioUrl ? (isPlaying ? t('recorder.playing') : t('recorder.saved')) : t('recorder.no_sound')}
                </div>
                <div className="text-xs text-slate-400 font-medium font-mono">
                    {isRecording 
                        ? formatTime(recordingDuration) 
                        : audioUrl 
                            ? (isPlaying ? `${formatTime(playbackTime)} / ${formatTime(totalDuration)}` : formatTime(totalDuration) !== "0:00" ? formatTime(totalDuration) : t('recorder.tap_play')) 
                            : t('recorder.tap_red')}
                </div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {!isRecording && !audioUrl && (
            <button
                onClick={startRecording}
                className="w-12 h-12 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center text-white shadow-btn active:shadow-btn-active active:translate-y-1 transition-all"
                type="button"
                title={t('recorder.start_recording')}
            >
                <div className="w-4 h-4 bg-white rounded-full" />
            </button>
            )}

            {isRecording && (
            <button
                onClick={stopRecording}
                className="w-12 h-12 rounded-full bg-slate-800 hover:bg-black flex items-center justify-center text-white shadow-lg animate-pulse"
                type="button"
            >
                <Square size={20} fill="currentColor" />
            </button>
            )}

            {audioUrl && !isRecording && (
            <>
                <button
                onClick={togglePlayback}
                className={`
                    w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all shadow-sm active:scale-95
                    ${isPlaying 
                        ? 'bg-primary border-primary text-white shadow-md' 
                        : 'bg-white border-slate-200 text-slate-600 hover:border-primary hover:text-primary'}
                `}
                type="button"
                >
                {isPlaying ? <Square size={18} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-0.5" />}
                </button>
                <button
                onClick={deleteRecording}
                className="w-10 h-10 rounded-full bg-white border-2 border-slate-200 hover:border-red-500 hover:text-red-500 flex items-center justify-center text-slate-400 transition-colors"
                type="button"
                >
                <Trash2 size={18} />
                </button>
            </>
            )}
          </div>
      </div>

      {audioUrl && !isRecording && (
          <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
              <div 
                  className="h-full bg-primary transition-all duration-75 ease-linear rounded-full" 
                  style={{ width: `${playbackProgress}%` }}
              />
          </div>
      )}
    </div>
  );
};

export default AudioRecorder;