
import React, { useState, useEffect, useRef } from 'react';
import { X, Lock, ArrowRight } from 'lucide-react';

interface ParentGateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  t: (key: any) => string;
}

const ParentGateModal: React.FC<ParentGateModalProps> = ({ isOpen, onClose, onSuccess, t }) => {
  const [problem, setProblem] = useState({ a: 0, b: 0 });
  const [answer, setAnswer] = useState('');
  const [error, setError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      const a = Math.floor(Math.random() * 7) + 3; 
      const b = Math.floor(Math.random() * 7) + 3;
      setProblem({ a, b });
      setAnswer('');
      setError(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (parseInt(answer) === problem.a * problem.b) {
      onSuccess();
      onClose();
    } else {
      setError(true);
      setAnswer('');
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-xs rounded-3xl shadow-2xl overflow-hidden p-6 text-center animate-in zoom-in-95 duration-200 border-4 border-white">
        
        <div className="flex justify-between items-start mb-4">
          <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-400">
            <Lock size={20} />
          </div>
          <button 
            onClick={onClose} 
            className="p-2 bg-slate-100 rounded-full text-slate-400 hover:bg-slate-200 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <h3 className="text-xl font-black text-slate-800 mb-1">{t('gate.title')}</h3>
        <p className="text-slate-500 text-sm mb-6 font-bold">{t('gate.desc')}</p>

        <div className="bg-slate-50 rounded-2xl p-6 mb-6 border-2 border-slate-100">
          <span className="text-3xl font-black text-slate-700 tracking-widest">
            {problem.a} x {problem.b} = ?
          </span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            ref={inputRef}
            type="tel"
            pattern="[0-9]*"
            value={answer}
            onChange={(e) => {
                setAnswer(e.target.value);
                setError(false);
            }}
            className={`
                w-full px-4 py-3 text-center text-2xl font-black rounded-xl border-4 outline-none transition-colors
                ${error 
                    ? 'border-red-300 bg-red-50 text-red-600 placeholder-red-300' 
                    : 'border-slate-200 bg-slate-50 text-slate-800 focus:border-primary focus:bg-white'}
            `}
            placeholder="Answer"
            autoComplete="off"
          />
          
          <button
            type="submit"
            className="w-full py-3.5 bg-slate-800 text-white rounded-xl font-bold shadow-lg active:scale-95 transition-transform flex items-center justify-center space-x-2"
          >
            <span>{t('gate.unlock')}</span>
            <ArrowRight size={20} />
          </button>
        </form>
      </div>
    </div>
  );
};

export default ParentGateModal;
