import React, { useState } from 'react';
import { X, Layers, Plus, Trash2, Check, Layout, Loader2, Pencil } from 'lucide-react';
import { Board } from '../types';
import { TranslationKey } from '../services/translations';

interface BoardsModalProps {
  isOpen: boolean;
  onClose: () => void;
  boards: Board[];
  currentBoardId: string;
  onSwitchBoard: (id: string) => void;
  onCreateBoard: (label: string) => Promise<void>;
  onDeleteBoard: (id: string) => Promise<void>;
  onUpdateBoard: (board: Board) => Promise<void>;
  t: (key: TranslationKey) => string;
}

const BoardsModal: React.FC<BoardsModalProps> = ({
  isOpen,
  onClose,
  boards,
  currentBoardId,
  onSwitchBoard,
  onCreateBoard,
  onDeleteBoard,
  onUpdateBoard,
  t
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [newBoardName, setNewBoardName] = useState('');
  
  const [editingBoardId, setEditingBoardId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  
  const [boardToDelete, setBoardToDelete] = useState<Board | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const handleCreate = async () => {
    if (!newBoardName.trim()) return;
    setIsProcessing(true);
    try {
        await onCreateBoard(newBoardName.trim());
        setIsCreating(false);
        setNewBoardName('');
    } finally {
        setIsProcessing(false);
    }
  };

  const promptDelete = (board: Board, e: React.MouseEvent) => {
      e.stopPropagation();
      if (boards.length <= 1) {
          alert(t('boards.delete_error_last'));
          return;
      }
      setBoardToDelete(board);
      setEditingBoardId(null);
  };

  const confirmDeleteBoard = async () => {
      if (!boardToDelete) return;
      setIsProcessing(true);
      try {
          await onDeleteBoard(boardToDelete.id);
          setBoardToDelete(null);
      } finally {
          setIsProcessing(false);
      }
  };

  const startEdit = (board: Board, e: React.MouseEvent) => {
      e.stopPropagation();
      setEditingBoardId(board.id);
      setEditName(board.label);
      setBoardToDelete(null);
  };

  const saveEdit = async (board: Board, e: React.MouseEvent) => {
      e.stopPropagation();
      if (!editName.trim()) return;
      setIsProcessing(true);
      try {
          await onUpdateBoard({ ...board, label: editName.trim() });
          setEditingBoardId(null);
      } finally {
          setIsProcessing(false);
      }
  };

  const cancelEdit = (e: React.MouseEvent) => {
      e.stopPropagation();
      setEditingBoardId(null);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh] border-4 border-white relative">
        
        {/* Delete Confirmation Overlay */}
        {boardToDelete && (
          <div className="absolute inset-0 z-20 bg-white/95 backdrop-blur-sm flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-200">
              <div className="w-20 h-20 bg-red-100 text-red-500 rounded-full flex items-center justify-center mb-6 shadow-inner">
                  <Trash2 size={40} strokeWidth={2.5} />
              </div>
              <h3 className="text-2xl font-black text-slate-800 mb-2">{t('modal.confirm.delete_title')}</h3>
              <div className="bg-slate-50 border-2 border-slate-100 rounded-xl p-3 mb-6 w-full">
                <p className="text-slate-500 text-sm font-bold uppercase tracking-wider mb-1">{t('boards.delete_board_label')}</p>
                <p className="text-lg font-black text-slate-800 line-clamp-2">"{boardToDelete.label}"</p>
              </div>
              <p className="text-slate-400 font-medium mb-8 text-sm leading-relaxed">
                 {t('boards.delete_confirm')}
              </p>
              <div className="flex gap-3 w-full">
                  <button 
                    onClick={() => setBoardToDelete(null)}
                    className="flex-1 py-3.5 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
                  >
                    {t('modal.confirm.cancel')}
                  </button>
                  <button 
                    onClick={confirmDeleteBoard}
                    disabled={isProcessing}
                    className="flex-1 py-3.5 rounded-xl font-bold text-white bg-red-500 hover:bg-red-600 shadow-lg shadow-red-200 transition-all flex items-center justify-center gap-2"
                  >
                    {isProcessing ? <Loader2 size={20} className="animate-spin" /> : <Trash2 size={20} />}
                    {t('modal.confirm.yes')}
                  </button>
              </div>
          </div>
        )}

        {/* Header */}
        <div className="flex justify-between items-center p-5 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center space-x-2">
             <div className="p-2 bg-purple-100 text-purple-600 rounded-xl"><Layers size={24} /></div>
             <h2 className="text-2xl font-black text-slate-800">{t('boards.title')}</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-200 text-slate-600">
            <X size={24} />
          </button>
        </div>

        {/* Board List */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
            {boards.map(board => {
                const isCurrent = board.id === currentBoardId;
                const isEditing = editingBoardId === board.id;

                if (isEditing) {
                    return (
                        <div key={board.id} className="flex items-center gap-2 p-2 bg-slate-50 rounded-xl border-2 border-primary/20 animate-in fade-in">
                             <input 
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                className="flex-1 px-3 py-2 rounded-lg border-2 border-slate-200 focus:border-primary focus:outline-none font-bold text-slate-800 bg-white"
                                autoFocus
                             />
                             <button onClick={(e) => saveEdit(board, e)} disabled={isProcessing} className="p-2 bg-primary text-white rounded-lg hover:bg-primary/90">
                                 {isProcessing ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
                             </button>
                             <button onClick={cancelEdit} className="p-2 bg-slate-200 text-slate-600 rounded-lg hover:bg-slate-300">
                                 <X size={18} />
                             </button>
                        </div>
                    );
                }

                return (
                    <div 
                        key={board.id}
                        onClick={() => !isProcessing && onSwitchBoard(board.id)}
                        className={`
                            group flex items-center justify-between p-4 rounded-2xl border-2 transition-all cursor-pointer relative overflow-hidden
                            ${isCurrent 
                                ? 'bg-purple-50 border-purple-500 text-purple-900 shadow-sm' 
                                : 'bg-white border-slate-100 text-slate-600 hover:border-purple-200 hover:shadow-sm'}
                        `}
                    >
                        <div className="flex items-center gap-3 relative z-10">
                            <div className={`
                                w-10 h-10 rounded-full flex items-center justify-center font-black text-sm
                                ${isCurrent ? 'bg-purple-500 text-white' : 'bg-slate-100 text-slate-400 group-hover:bg-purple-100 group-hover:text-purple-500'}
                            `}>
                                {isCurrent ? <Check size={20} strokeWidth={3} /> : <Layout size={20} />}
                            </div>
                            <div>
                                <h3 className={`font-bold text-lg leading-tight ${isCurrent ? 'text-purple-900' : 'text-slate-700'}`}>{board.label}</h3>
                                {isCurrent && <p className="text-[10px] font-black uppercase tracking-wider text-purple-600/80">{t('boards.active')}</p>}
                            </div>
                        </div>

                        <div className="flex items-center gap-1 relative z-10">
                            <button 
                                onClick={(e) => startEdit(board, e)}
                                className="p-2 text-slate-300 hover:text-blue-500 hover:bg-blue-50 rounded-xl transition-all"
                                title={t('boards.rename')}
                            >
                                <Pencil size={18} />
                            </button>
                            {/* Prevent deleting the last board */}
                            {boards.length > 1 && (
                                <button 
                                    onClick={(e) => promptDelete(board, e)}
                                    className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                    title="Delete"
                                >
                                    <Trash2 size={18} />
                                </button>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-slate-100 bg-white">
            {isCreating ? (
                <div className="flex flex-col gap-3 animate-in slide-in-from-bottom-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t('boards.create')}</label>
                    <div className="flex gap-2">
                        <input 
                            value={newBoardName}
                            onChange={(e) => setNewBoardName(e.target.value)}
                            placeholder={t('boards.name_placeholder')}
                            className="flex-1 px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 outline-none font-bold bg-white text-slate-900"
                            autoFocus
                            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                        />
                        <button 
                            onClick={handleCreate}
                            disabled={!newBoardName.trim() || isProcessing}
                            className="bg-purple-600 text-white p-3 rounded-xl hover:bg-purple-700 disabled:opacity-50"
                        >
                            {isProcessing ? <Loader2 size={24} className="animate-spin" /> : <Check size={24} />}
                        </button>
                        <button 
                            onClick={() => setIsCreating(false)}
                            className="bg-slate-100 text-slate-500 p-3 rounded-xl hover:bg-slate-200"
                        >
                            <X size={24} />
                        </button>
                    </div>
                </div>
            ) : (
                <button 
                    onClick={() => setIsCreating(true)}
                    className="w-full py-4 border-2 border-dashed border-slate-300 rounded-2xl flex items-center justify-center gap-2 text-slate-400 font-bold hover:border-purple-400 hover:text-purple-600 hover:bg-purple-50 transition-all"
                >
                    <Plus size={24} />
                    <span>{t('boards.create')}</span>
                </button>
            )}
        </div>
      </div>
    </div>
  );
};

export default BoardsModal;