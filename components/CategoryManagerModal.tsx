import React, { useState, useEffect } from 'react';
import { X, Pencil, Trash2, Plus, AlertCircle, Check, Loader2 } from 'lucide-react';
import { Category, ColorTheme } from '../types';

interface CategoryManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  onSaveCategory: (cat: Pick<Category, 'id' | 'label' | 'colorTheme'>) => Promise<void>;
  onDeleteCategory: (id: string) => Promise<void>;
  t: (key: any) => string;
}

const COLOR_THEMES: { theme: ColorTheme; bg: string; border: string }[] = [
  { theme: 'yellow', bg: 'bg-yellow-100', border: 'border-yellow-400' },
  { theme: 'green', bg: 'bg-green-100', border: 'border-green-400' },
  { theme: 'blue', bg: 'bg-blue-100', border: 'border-blue-400' },
  { theme: 'pink', bg: 'bg-pink-100', border: 'border-pink-400' },
  { theme: 'orange', bg: 'bg-orange-100', border: 'border-orange-400' },
  { theme: 'purple', bg: 'bg-purple-100', border: 'border-purple-400' },
  { theme: 'teal', bg: 'bg-teal-100', border: 'border-teal-400' },
  { theme: 'red', bg: 'bg-red-100', border: 'border-red-400' },
  { theme: 'slate', bg: 'bg-slate-100', border: 'border-slate-400' },
];

const CategoryManagerModal: React.FC<CategoryManagerModalProps> = ({
  isOpen,
  onClose,
  categories,
  onSaveCategory,
  onDeleteCategory,
  t
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [editTheme, setEditTheme] = useState<ColorTheme>('yellow');
  const [isAdding, setIsAdding] = useState(false);
  
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setEditingId(null);
      setIsAdding(false);
      setConfirmDeleteId(null);
      setIsProcessing(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const startAdd = () => {
    setEditingId(null);
    setEditLabel('');
    setEditTheme('slate');
    setIsAdding(true);
    setConfirmDeleteId(null);
  };

  const startEdit = (cat: Category, e: React.MouseEvent) => {
    e.stopPropagation();
    setIsAdding(false);
    setEditingId(cat.id);
    setEditLabel(cat.label);
    setEditTheme(cat.colorTheme);
    setConfirmDeleteId(null);
  };

  const handleSave = async () => {
    if (!editLabel.trim()) return;
    setIsProcessing(true);

    try {
        const id = isAdding ? crypto.randomUUID() : editingId!;
        await onSaveCategory({
            id,
            label: editLabel,
            colorTheme: editTheme,
        });
        setEditingId(null);
        setIsAdding(false);
    } catch (err) {
        console.error("Error saving category:", err);
        alert("Failed to save category.");
    } finally {
        setIsProcessing(false);
    }
  };

  const handleDeleteClick = (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      if (categories.length <= 1) {
          alert("You must keep at least one category.");
          return;
      }
      setConfirmDeleteId(id);
  };

  const confirmDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setIsProcessing(true);
    try {
        await onDeleteCategory(id);
        if (editingId === id) {
            setEditingId(null);
            setIsAdding(false);
        }
        setConfirmDeleteId(null);
    } catch (err) {
        console.error("Error deleting category:", err);
        alert("Failed to delete category.");
    } finally {
        setIsProcessing(false);
    }
  };

  const cancelDelete = (e: React.MouseEvent) => {
      e.stopPropagation();
      setConfirmDeleteId(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
        
        <div className="flex justify-between items-center p-5 border-b border-slate-100 bg-slate-50/50">
          <h2 className="text-2xl font-black text-slate-900">{t('modal.categories.title')}</h2>
          <button onClick={onClose} disabled={isProcessing} className="p-2 rounded-full hover:bg-slate-200 text-slate-600 disabled:opacity-50">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          
          {!isAdding && !editingId && (
            <div className="space-y-3">
              {categories.map((cat) => (
                <div key={cat.id} className="flex items-center justify-between p-3 bg-white border-2 border-slate-100 rounded-2xl group hover:border-primary/30 transition-colors">
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-full border-2 ${COLOR_THEMES.find(t => t.theme === cat.colorTheme)?.bg} ${COLOR_THEMES.find(t => t.theme === cat.colorTheme)?.border}`}></div>
                    <span className="font-bold text-slate-700 text-lg">{cat.label}</span>
                  </div>
                  
                  <div className="flex space-x-2">
                    {confirmDeleteId === cat.id ? (
                        <div className="flex items-center gap-2 animate-in slide-in-from-right-2 duration-200">
                            <span className="text-xs font-bold text-red-500 uppercase mr-1">Sure?</span>
                            <button 
                                onClick={(e) => confirmDelete(cat.id, e)}
                                disabled={isProcessing}
                                className="p-2 bg-red-500 text-white rounded-xl hover:bg-red-600 shadow-sm disabled:opacity-50"
                            >
                                {isProcessing ? <Loader2 size={16} className="animate-spin"/> : <Check size={16} />}
                            </button>
                            <button 
                                onClick={cancelDelete}
                                disabled={isProcessing}
                                className="p-2 bg-slate-100 text-slate-500 rounded-xl hover:bg-slate-200 disabled:opacity-50"
                            >
                                <X size={16} />
                            </button>
                        </div>
                    ) : (
                        <>
                            <button 
                                onClick={(e) => startEdit(cat, e)} 
                                className="p-2 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-xl transition-colors"
                                title="Edit Category"
                            >
                            <Pencil size={18} />
                            </button>
                            <button 
                                onClick={(e) => handleDeleteClick(cat.id, e)} 
                                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                                title="Delete Category"
                            >
                            <Trash2 size={18} />
                            </button>
                        </>
                    )}
                  </div>
                </div>
              ))}
              
              <button 
                onClick={startAdd}
                className="w-full py-4 border-2 border-dashed border-slate-300 rounded-2xl flex items-center justify-center space-x-2 text-slate-500 font-bold hover:border-primary hover:text-primary hover:bg-slate-50 transition-all"
              >
                <Plus size={20} />
                <span>{t('modal.categories.add')}</span>
              </button>
              
              <div className="flex items-start gap-2 bg-blue-50 p-3 rounded-xl">
                <AlertCircle size={16} className="text-blue-500 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-blue-700 leading-tight" dangerouslySetInnerHTML={{__html: t('modal.categories.note')}} />
              </div>
            </div>
          )}

          {(isAdding || editingId) && (
            <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-200">
                <div>
                    <label className="block text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">{t('modal.categories.name')}</label>
                    <input 
                        type="text" 
                        value={editLabel}
                        onChange={(e) => setEditLabel(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border-2 border-slate-300 font-bold text-lg focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none"
                        placeholder="Category Name"
                        autoFocus
                        disabled={isProcessing}
                    />
                </div>

                <div>
                    <label className="block text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">{t('modal.categories.theme')}</label>
                    <div className="grid grid-cols-5 gap-3">
                        {COLOR_THEMES.map((c) => (
                            <button
                                key={c.theme}
                                onClick={() => setEditTheme(c.theme)}
                                disabled={isProcessing}
                                className={`
                                    w-full aspect-square rounded-full border-4 transition-all
                                    ${c.bg} ${c.border}
                                    ${editTheme === c.theme ? 'scale-110 ring-2 ring-offset-2 ring-slate-400 shadow-lg' : 'hover:scale-105 opacity-70 hover:opacity-100'}
                                `}
                            />
                        ))}
                    </div>
                </div>

                <div className="flex space-x-3 pt-4">
                    <button 
                        onClick={() => { setIsAdding(false); setEditingId(null); }}
                        disabled={isProcessing}
                        className="flex-1 py-3 rounded-xl font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 disabled:opacity-50"
                    >
                        {t('modal.categories.cancel')}
                    </button>
                    <button 
                        onClick={handleSave}
                        disabled={!editLabel || isProcessing}
                        className="flex-1 py-3 rounded-xl font-bold text-white bg-primary hover:brightness-110 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {isProcessing && <Loader2 size={18} className="animate-spin" />}
                        <span>{t('modal.categories.save')}</span>
                    </button>
                </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default CategoryManagerModal;