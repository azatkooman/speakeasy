import React, { useState, useEffect } from 'react';
import { X, Check, Layout } from 'lucide-react';
import { Board, AACItem } from '../types';
import { TranslationKey } from '../services/translations';

interface LinkBoardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (label: string, linkedBoardId: string, imageUrl: string) => void;
  boards: Board[];
  currentBoardId: string;
  t: (key: TranslationKey) => string;
}

const LinkBoardModal: React.FC<LinkBoardModalProps> = ({ 
  isOpen, 
  onClose, 
  onSave, 
  boards,
  currentBoardId,
  t 
}) => {
  const [selectedBoardId, setSelectedBoardId] = useState<string>('');
  const [label, setLabel] = useState('');

  // Reset when opening
  useEffect(() => {
    if (isOpen) {
        setSelectedBoardId('');
        setLabel('');
    }
  }, [isOpen]);

  // When board selected, auto-fill label if empty
  const handleBoardSelect = (board: Board) => {
      setSelectedBoardId(board.id);
      if (!label) {
          setLabel(board.label);
      }
  };

  const handleSave = () => {
      if (!selectedBoardId || !label) return;
      
      // We generate a placeholder image for the board link using a canvas
      const canvas = document.createElement('canvas');
      canvas.width = 400;
      canvas.height = 400;
      const ctx = canvas.getContext('2d');
      if (ctx) {
          // Background
          ctx.fillStyle = '#f3e8ff'; // Light purple background
          ctx.fillRect(0, 0, 400, 400);
          
          // Border/Accent
          ctx.lineWidth = 20;
          ctx.strokeStyle = '#a855f7'; // Purple
          ctx.strokeRect(0, 0, 400, 400);

          // Text (Board Name)
          ctx.fillStyle = '#6b21a8';
          ctx.font = 'bold 60px Nunito';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          
          // Draw a layout icon shape roughly
          ctx.fillStyle = '#d8b4fe';
          ctx.fillRect(100, 100, 200, 200);
          ctx.fillStyle = '#a855f7';
          ctx.fillRect(120, 120, 160, 40); // header
          ctx.fillRect(120, 180, 70, 100); // left col
          ctx.fillRect(210, 180, 70, 100); // right col

          const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
          onSave(label, selectedBoardId, dataUrl);
      }
      onClose();
  };

  if (!isOpen) return null;

  // Filter out current board to prevent circular immediate links (optional, but good UX)
  const availableBoards = boards.filter(b => b.id !== currentBoardId);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh] border-4 border-white">
        
        {/* Header */}
        <div className="flex justify-between items-center p-5 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center space-x-2">
             <div className="p-2 bg-purple-100 text-purple-600 rounded-xl"><Layout size={24} /></div>
             <h2 className="text-xl font-black text-slate-800">{t('link.title')}</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-200 text-slate-600">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-6">
            
            {/* Board Selection */}
            <div>
                <label className="block text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">{t('link.select_board')}</label>
                <div className="grid grid-cols-1 gap-2">
                    {availableBoards.map(board => (
                        <button
                            key={board.id}
                            onClick={() => handleBoardSelect(board)}
                            className={`
                                flex items-center justify-between p-4 rounded-xl border-2 transition-all
                                ${selectedBoardId === board.id 
                                    ? 'bg-purple-50 border-purple-500 text-purple-900 shadow-sm' 
                                    : 'bg-white border-slate-100 text-slate-600 hover:border-slate-300'}
                            `}
                        >
                            <span className="font-bold text-lg">{board.label}</span>
                            {selectedBoardId === board.id && <Check size={20} className="text-purple-600" />}
                        </button>
                    ))}
                    {availableBoards.length === 0 && (
                        <p className="text-slate-400 font-bold italic p-4 text-center">{t('link.no_boards')}</p>
                    )}
                </div>
            </div>

            {/* Label Input */}
            <div>
                 <label className="block text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">{t('modal.create.name_label')}</label>
                 <input 
                    type="text" 
                    value={label} 
                    onChange={(e) => setLabel(e.target.value)} 
                    placeholder={t('modal.create.name_placeholder')} 
                    className="w-full px-4 py-3 bg-slate-50 rounded-xl border-2 border-slate-200 focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 outline-none text-xl font-bold text-slate-900 placeholder:text-slate-400 transition-all" 
                 />
            </div>
        </div>

        <div className="p-5 border-t border-slate-100 bg-white">
            <button 
                onClick={handleSave} 
                disabled={!selectedBoardId || !label}
                className="w-full py-4 bg-purple-600 text-white rounded-2xl font-black text-xl shadow-btn active:shadow-btn-active active:translate-y-[4px] hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
                <span>{t('link.save')}</span>
                <Check size={24} strokeWidth={3} />
            </button>
        </div>

      </div>
    </div>
  );
};

export default LinkBoardModal;