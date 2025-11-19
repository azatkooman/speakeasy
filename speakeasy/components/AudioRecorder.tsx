import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Play, Trash2, Volume2 } from 'lucide-react';

interface AudioRecorderProps {
  initialAudioUrl?: string;
  onRecordingComplete: (blob: Blob | null) => void;
}

const AudioRecorder: React.FC<AudioRecorderProps> = ({ initialAudioUrl, onRecordingComplete }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(initialAudioUrl || null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    setAudioUrl(initialAudioUrl || null);
  }, [initialAudioUrl]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      const chunks: BlobPart[] = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
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
      alert("Could not access microphone.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const playPreview = () => {
    if (audioUrl) {
      const audio = new Audio(audioUrl);
      setIsPlaying(true);
      audio.onended = () => setIsPlaying(false);
      audio.play();
    }
  };

  const deleteRecording = () => {
    setAudioUrl(null);
    setRecordingDuration(0);
    onRecordingComplete(null);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  return (
    <div className="bg-slate-50 rounded-2xl p-4 border-2 border-slate-100 flex items-center justify-between">
      
      {/* Status Display */}
      <div className="flex items-center space-x-3">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${audioUrl ? 'bg-green-100 text-green-600' : 'bg-slate-200 text-slate-400'}`}>
            {audioUrl ? <Volume2 size={20} className={isPlaying ? "animate-pulse" : ""} /> : <Mic size={20} />}
        </div>
        <div>
            <div className="text-sm font-bold text-slate-700">
                {isRecording ? 'Recording...' : audioUrl ? 'Sound Saved' : 'No Sound'}
            </div>
            <div className="text-xs text-slate-400 font-medium">
                {isRecording ? `00:${recordingDuration.toString().padStart(2, '0')}` : audioUrl ? 'Tap play to test' : 'Tap red button'}
            </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center space-x-3">
        {!isRecording && !audioUrl && (
          <button
            onClick={startRecording}
            className="w-12 h-12 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center text-white shadow-btn active:shadow-btn-active active:translate-y-1 transition-all"
            type="button"
            title="Start Recording"
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
              onClick={playPreview}
              className="w-10 h-10 rounded-full bg-white border-2 border-slate-200 hover:border-primary hover:text-primary flex items-center justify-center text-slate-600 transition-colors"
              type="button"
            >
              <Play size={18} fill="currentColor" />
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
  );
};

export default AudioRecorder;