
import React, { useState, useRef, useEffect } from 'react';
import { useSpeakEasy } from '../contexts/SpeakEasyContext.tsx';
import { Home, ChevronRight, CornerUpLeft, Plus, FolderPlus, ArrowLeft, ArrowRight, Settings2, ArrowUpRight, User, Layers, Lock } from 'lucide-react';
import SentenceStrip from '../components/SentenceStrip.tsx';
import FolderCard from '../components/FolderCard.tsx';
import { ROOT_FOLDER } from '../services/storage.ts';
import { AACItem, Category } from '../types.ts';
import { TranslationKey } from '../services/translations.ts';
import ConfirmationModal from '../components/ConfirmationModal.tsx';
import CreateCardModal from '../components/CreateCardModal.tsx';
import CreateSelectionModal from '../components/CreateSelectionModal.tsx';
import EditOptionsModal from '../components/EditOptionsModal.tsx';
import FolderModal from '../components/FolderModal.tsx';
import HistoryModal from '../components/HistoryModal.tsx';
import LinkBoardModal from '../components/LinkBoardModal.tsx';
import MoveItemModal from '../components/MoveItemModal.tsx';
import ProfileSelectionModal from '../components/ProfileSelectionModal.tsx';
import SettingsModal from '../components/SettingsModal.tsx';
import BoardsModal from '../components/BoardsModal.tsx';

// Updated Color definitions for the "Framed" style
const THEME_STYLES: Record<string, { bg: string; border: string; shadow: string; text: string; ring: string }> = {
    'yellow': { bg: 'bg-yellow-50', border: 'border-yellow-400', shadow: 'shadow-yellow-600', text: 'text-yellow-900', ring: 'ring-yellow-400' },
    'green':  { bg: 'bg-green-50',  border: 'border-green-500',  shadow: 'shadow-green-700',  text: 'text-green-900',  ring: 'ring-green-500' },
    'blue':   { bg: 'bg-blue-50',   border: 'border-blue-400',   shadow: 'shadow-blue-600',   text: 'text-blue-900',   ring: 'ring-blue-400' },
    'pink':   { bg: 'bg-pink-50',   border: 'border-pink-400',   shadow: 'shadow-pink-600',   text: 'text-pink-900',   ring: 'ring-pink-400' },
    'orange': { bg: 'bg-orange-50', border: 'border-orange-400', shadow: 'shadow-orange-600', text: 'text-orange-900', ring: 'ring-orange-400' },
    'purple': { bg: 'bg-purple-50', border: 'border-purple-400', shadow: 'shadow-purple-600', text: 'text-purple-900', ring: 'ring-purple-400' },
    'teal':   { bg: 'bg-teal-50',   border: 'border-teal-400',   shadow: 'shadow-teal-600',   text: 'text-teal-900',   ring: 'ring-teal-400' },
    'red':    { bg: 'bg-red-50',    border: 'border-red-500',    shadow: 'shadow-red-700',    text: 'text-red-900',    ring: 'ring-red-500' },
    'slate':  { bg: 'bg-slate-50',  border: 'border-slate-400',  shadow: 'shadow-slate-600',  text: 'text-slate-900',  ring: 'ring-slate-400' },
};
const DEFAULT_CARD_STYLE = THEME_STYLES['slate'];

export const BoardPage: React.FC = () => {
  const { 
     gridItems, sentence, categories, settings, isEditMode, currentFolderId, breadcrumbs, 
     addToSentence, removeFromSentence, removeLastFromSentence, clearSentence, playSentence,
     t, navigateToFolder, navigateBackFolder, reorderGrid, isSearchActive, library,
     
     saveCard, saveFolderObj, saveLinkBoard, deleteCard, deleteFolderObj, 
     moveItemToFolder, setSentenceFromHistory, switchProfile, createProfile, updateProfile, removeProfile,
     switchBoard, createBoard, updateBoard, removeBoard,
     profiles, currentProfileId, boards, currentBoardId,
     setSettings,
     setSearchQuery, setIsSearchActive, searchQuery
  } = useSpeakEasy();

  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isCreateSelectionOpen, setIsCreateSelectionOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [isLinkBoardModalOpen, setIsLinkBoardModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isBoardsModalOpen, setIsBoardsModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(profiles.length === 0);
  
  const [editOptionsItem, setEditOptionsItem] = useState<{ item: AACItem | Category, type: 'card' | 'folder' } | null>(null);
  const [editingItem, setEditingItem] = useState<AACItem | null>(null);
  const [editingFolder, setEditingFolder] = useState<Category | null>(null);
  const [moveModalItem, setMoveModalItem] = useState<{ item: AACItem | Category, type: 'card' | 'folder' } | null>(null);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [folderToDelete, setFolderToDelete] = useState<string | null>(null);

  const breadcrumbsScrollRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLElement>(null);
  const prevGridLength = useRef(0);

  useEffect(() => {
    if (profiles.length === 0) {
      setIsProfileModalOpen(true);
    }
  }, [profiles.length]);

  useEffect(() => {
    if (breadcrumbsScrollRef.current) {
        breadcrumbsScrollRef.current.scrollTo({ left: breadcrumbsScrollRef.current.scrollWidth, behavior: 'smooth' });
    }
  }, [breadcrumbs]);

  // UX Improvement: Scroll to bottom when new items are added
  useEffect(() => {
    if (gridItems.length > prevGridLength.current) {
        if (mainRef.current) {
            // Small delay to ensure DOM update is rendered
            setTimeout(() => {
                mainRef.current?.scrollTo({ top: mainRef.current.scrollHeight, behavior: 'smooth' });
            }, 100);
        }
    }
    prevGridLength.current = gridItems.length;
  }, [gridItems.length]);

  const getGridClass = () => {
    switch (settings.gridColumns) {
      case 'small': return 'grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10';
      case 'large': return 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5';
      case 'medium': default: return 'grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6';
    }
  };
  
  const getLabelSize = () => settings.gridColumns === 'small' ? 'text-xs sm:text-sm leading-tight' : 'text-sm sm:text-base leading-tight';

  const getCardStyle = (item: AACItem) => {
    if (item.colorTheme && THEME_STYLES[item.colorTheme]) return THEME_STYLES[item.colorTheme];
    const folder = categories.find(c => c.id === item.category);
    return folder && THEME_STYLES[folder.colorTheme] ? THEME_STYLES[folder.colorTheme] : DEFAULT_CARD_STYLE;
  };

  return (
    <>
      <SentenceStrip 
          items={sentence} 
          categories={categories}
          onRemoveItem={removeFromSentence}
          onRemoveLastItem={removeLastFromSentence}
          onClear={clearSentence}
          onPlay={playSentence}
          onShowHistory={() => setIsHistoryOpen(true)}
          isPlaying={useSpeakEasy().isPlaying}
          activeIndex={useSpeakEasy().activeIndex}
          t={t}
      />

      {currentFolderId !== ROOT_FOLDER && (
          <div className="relative shrink-0 bg-white/50 border-b border-slate-200/60 z-20 backdrop-blur-md flex items-center justify-between pr-2 shadow-sm">
              <div ref={breadcrumbsScrollRef} className="flex-1 flex items-center overflow-x-auto no-scrollbar px-4 py-3 gap-1">
                  <button 
                    onClick={() => {
                        if (isSearchActive) {
                            setIsSearchActive(false);
                            setSearchQuery('');
                        }
                        navigateToFolder(ROOT_FOLDER);
                    }} 
                    className={`flex items-center justify-center p-2 rounded-xl transition-all active:scale-95 active:bg-slate-300 ${!isSearchActive && currentFolderId === ROOT_FOLDER ? 'text-slate-900 bg-slate-200' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'}`}
                    aria-label={t('app.home_folder')}
                  >
                      <Home size={22} />
                  </button>
                  
                  {breadcrumbs.map((crumb, index) => (
                      <React.Fragment key={crumb.id}>
                          <ChevronRight size={18} className="text-slate-300 flex-shrink-0" />
                          <button 
                            onClick={() => {
                                if (isSearchActive) {
                                    setIsSearchActive(false);
                                    setSearchQuery('');
                                }
                                navigateToFolder(crumb.id);
                            }} 
                            className={`whitespace-nowrap px-3 py-2 rounded-xl text-base font-bold transition-all active:scale-95 active:bg-slate-200 ${index === breadcrumbs.length - 1 ? 'text-primary-700 bg-primary/10' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}
                          >
                              {crumb.label}
                          </button>
                      </React.Fragment>
                  ))}
              </div>
              <div className="pl-2 border-l border-slate-200/50">
                  <button 
                    onClick={() => {
                        if (isSearchActive) {
                            setIsSearchActive(false);
                            setSearchQuery('');
                        }
                        navigateBackFolder();
                    }} 
                    className="flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-200 rounded-xl text-slate-700 font-bold hover:bg-slate-50 hover:text-primary active:scale-95 transition-all text-sm shadow-sm whitespace-nowrap"
                  >
                      <CornerUpLeft size={20} strokeWidth={2.5} />
                      <span className="hidden sm:inline">{t('header.back')}</span>
                  </button>
              </div>
          </div>
      )}

      <main 
        ref={mainRef} 
        className="flex-1 overflow-y-auto p-4"
        style={{ paddingBottom: isEditMode ? 'calc(10rem + env(safe-area-inset-bottom))' : 'calc(8rem + env(safe-area-inset-bottom))' }}
      >
        <div className={`grid gap-4 max-w-7xl mx-auto ${getGridClass()}`}>
            {gridItems.map((item, index) => {
                const isFirst = index === 0;
                const isLast = index === gridItems.length - 1;

                if (item.type === 'folder') {
                    const folder = item as Category;
                    return (
                        <div key={folder.id} className="relative">
                            <FolderCard 
                                folder={folder} 
                                onClick={() => navigateToFolder(folder.id)} 
                                onReorderLeft={(e) => { e.stopPropagation(); reorderGrid(folder.id, -1); }}
                                onReorderRight={(e) => { e.stopPropagation(); reorderGrid(folder.id, 1); }}
                                canMoveLeft={!isFirst}
                                canMoveRight={!isLast}
                                isEditMode={isEditMode}
                                onEdit={() => setEditOptionsItem({ item: folder, type: 'folder' })}
                            />
                        </div>
                    );
                } else {
                    const card = item as AACItem;
                    const style = getCardStyle(card);
                    const isLink = !!card.linkedBoardId;
                    const isHidden = card.isVisible === false;
                    const displayLabel = card.labelKey ? t(card.labelKey as TranslationKey) : card.label;
                    
                    return (
                        <div 
                            key={card.id} 
                            onClick={() => {
                                addToSentence(card);
                                if (isSearchActive) {
                                    navigateToFolder(card.category);
                                    setIsSearchActive(false);
                                    setSearchQuery('');
                                }
                            }}
                            className={`
                                relative aspect-[4/5] rounded-3xl cursor-pointer
                                bg-white
                                flex flex-col items-center overflow-hidden
                                border-2 ${style.border}
                                shadow-[0_4px_0_0] ${style.shadow}
                                active:shadow-none active:translate-y-[4px] active:border-b-2
                                transition-all duration-100
                                group
                                ${isHidden ? 'opacity-50 grayscale' : ''}
                            `}
                        >
                            {/* Image Container - Always White for clean photo display */}
                            <div className="w-full flex-1 p-2 flex items-center justify-center bg-white relative min-h-0">
                                <img 
                                    src={card.imageUrl} 
                                    alt={displayLabel} 
                                    className={`
                                        w-full h-full pointer-events-none transition-transform duration-200 group-hover:scale-105
                                        ${card.imageFit === 'contain' ? 'object-contain' : 'object-cover rounded-xl'}
                                    `} 
                                    loading="lazy" 
                                />
                                
                                {isLink && <div className="absolute top-2 right-2 bg-purple-100 text-purple-600 p-1 rounded-full shadow-sm z-20"><ArrowUpRight size={16} strokeWidth={3} /></div>}
                                
                                {isEditMode && (
                                    <>
                                        <button onClick={(e) => { e.stopPropagation(); setEditOptionsItem({ item: card, type: 'card' }); }} className="absolute top-1 right-1 bg-white/90 backdrop-blur-sm rounded-full p-2 shadow-sm z-30 border border-slate-200 hover:bg-slate-100 active:scale-95 transition-all"><Settings2 size={16} className="text-slate-700" /></button>
                                        <div className="absolute bottom-1 inset-x-2 flex justify-between z-10 pointer-events-none">
                                            <button onClick={(e) => { e.stopPropagation(); reorderGrid(card.id, -1); }} disabled={isFirst} className={`pointer-events-auto w-8 h-8 flex items-center justify-center rounded-full shadow-lg border-2 transition-all active:scale-95 backdrop-blur-md ${isFirst ? 'bg-slate-100/50 border-slate-200 text-slate-300 opacity-50 cursor-not-allowed' : 'bg-white border-slate-200 text-slate-700 hover:border-primary hover:text-primary hover:bg-slate-50'}`}><ArrowLeft size={16} strokeWidth={2.5} /></button>
                                            <button onClick={(e) => { e.stopPropagation(); reorderGrid(card.id, 1); }} disabled={isLast} className={`pointer-events-auto w-8 h-8 flex items-center justify-center rounded-full shadow-lg border-2 transition-all active:scale-95 backdrop-blur-md ${isLast ? 'bg-slate-100/50 border-slate-200 text-slate-300 opacity-50 cursor-not-allowed' : 'bg-white border-slate-200 text-slate-700 hover:border-primary hover:text-primary hover:bg-slate-50'}`}><ArrowRight size={16} strokeWidth={2.5} /></button>
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Text Band - Colored based on part of speech */}
                            <div className={`w-full h-11 sm:h-12 flex items-center justify-center border-t-2 ${style.border} ${style.bg} px-1 shrink-0`}>
                                <span className={`font-black text-center uppercase line-clamp-2 ${getLabelSize()} ${style.text}`}>
                                    {displayLabel}
                                </span>
                            </div>
                        </div>
                    );
                }
            })}
        </div>
        
        {!isSearchActive && gridItems.length === 0 && (
            <div className="flex flex-col items-center justify-center h-80 space-y-6 animate-in fade-in duration-500 px-4">
                <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center text-slate-300">
                    <FolderPlus size={48} />
                </div>
                <div className="text-center space-y-3 max-w-sm mx-auto">
                    <p className="font-black text-2xl text-slate-700">{t('app.empty_folder')}</p>
                    
                    {!isEditMode ? (
                        <div className="flex items-start gap-3 bg-blue-50 text-blue-900 px-5 py-4 rounded-2xl text-base font-bold text-left border border-blue-100 shadow-sm mx-auto max-w-xs">
                            <div className="mt-0.5 bg-blue-100 p-1.5 rounded-lg"><Lock size={18} className="text-blue-600" /></div>
                            <p className="leading-snug">{t('app.switch_parent')}</p>
                        </div>
                    ) : (
                        <div className="text-slate-400 font-bold text-lg flex items-center justify-center gap-2 flex-wrap">
                            <span>{t('app.hint_tap')}</span>
                            <span className="inline-flex items-center justify-center bg-primary text-white w-8 h-8 rounded-xl shadow-md"><Plus size={20} strokeWidth={3}/></span>
                            <span>{t('app.hint_create')}</span>
                        </div>
                    )}
                </div>
            </div>
        )}
      </main>

      {isEditMode && (
        <div 
            className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-lg border-t border-slate-200 p-4 z-50 flex items-center justify-between gap-4" 
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 1.5rem)' }}
        >
            <div className="flex-1 flex justify-start gap-4 sm:gap-8 pl-2">
                <button onClick={() => setIsProfileModalOpen(true)} className="flex flex-col items-center text-slate-500 group"><div className="p-2 rounded-2xl group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors"><User size={24} /></div><span className="text-[10px] font-bold group-hover:text-indigo-600">{t('nav.profiles')}</span></button>
                <button onClick={() => setIsBoardsModalOpen(true)} className="flex flex-col items-center text-slate-500 group"><div className="p-2 rounded-2xl group-hover:bg-purple-50 group-hover:text-purple-600 transition-colors"><Layers size={24} /></div><span className="text-[10px] font-bold group-hover:text-purple-600">{t('nav.boards')}</span></button>
            </div>
            <button onClick={() => setIsCreateSelectionOpen(true)} className="w-16 h-16 bg-primary text-white rounded-2xl flex items-center justify-center border-4 border-white shadow-xl -mt-12 active:scale-95 transition-transform shrink-0 z-10"><Plus size={32} /></button>
            <div className="flex-1 flex justify-end gap-4 sm:gap-8 pr-2">
                <button onClick={() => setIsSettingsOpen(true)} className="flex flex-col items-center text-slate-500 group"><div className="p-2 rounded-2xl group-hover:bg-slate-100 group-hover:text-slate-800 transition-colors"><Settings2 size={24} /></div><span className="text-[10px] font-bold group-hover:text-slate-800">{t('nav.settings')}</span></button>
            </div>
        </div>
      )}

      <HistoryModal isOpen={isHistoryOpen} onClose={() => setIsHistoryOpen(false)} historyIds={JSON.parse(localStorage.getItem('aac_history_ids') || '[]')} library={library} onSelectSentence={setSentenceFromHistory} t={t} />
      <CreateSelectionModal isOpen={isCreateSelectionOpen} onClose={() => setIsCreateSelectionOpen(false)} onSelectCard={() => { setIsCreateSelectionOpen(false); setEditingItem(null); setIsCreateModalOpen(true); }} onSelectFolder={() => { setIsCreateSelectionOpen(false); setEditingFolder(null); setIsFolderModalOpen(true); }} onSelectLink={() => { setIsCreateSelectionOpen(false); setIsLinkBoardModalOpen(true); }} t={t} />
      <CreateCardModal isOpen={isCreateModalOpen} onClose={() => { setIsCreateModalOpen(false); setEditingItem(null); }} onSave={(d) => saveCard(d, editingItem?.id)} editItem={editingItem} t={t} language={settings.language} currentFolderName={currentFolderId === ROOT_FOLDER ? t('app.home_folder') : categories.find(c => c.id === currentFolderId)?.label} />
      <FolderModal isOpen={isFolderModalOpen} onClose={() => { setIsFolderModalOpen(false); setEditingFolder(null); }} onSave={(l, c, i) => saveFolderObj(l, c, i, editingFolder)} editFolder={editingFolder} t={t} language={settings.language} />
      <LinkBoardModal isOpen={isLinkBoardModalOpen} onClose={() => setIsLinkBoardModalOpen(false)} onSave={saveLinkBoard} boards={boards} currentBoardId={currentBoardId} t={t} />
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} settings={settings} onUpdateSettings={setSettings} t={t} />
      <BoardsModal isOpen={isBoardsModalOpen} onClose={() => setIsBoardsModalOpen(false)} boards={boards} currentBoardId={currentBoardId} onSwitchBoard={switchBoard} onCreateBoard={createBoard} onDeleteBoard={removeBoard} onUpdateBoard={updateBoard} t={t} />
      <ProfileSelectionModal 
        isOpen={isProfileModalOpen} 
        onClose={() => setIsProfileModalOpen(false)} 
        profiles={profiles} 
        currentProfileId={currentProfileId} 
        onSelectProfile={switchProfile} 
        onCreateProfile={createProfile} 
        onUpdateProfile={updateProfile} 
        onDeleteProfile={removeProfile} 
        t={t} 
        forceCreate={profiles.length === 0} 
        language={settings.language} 
        onUpdateLanguage={(l) => setSettings({...settings, language: l})} 
      />
      <EditOptionsModal isOpen={!!editOptionsItem} onClose={() => setEditOptionsItem(null)} item={editOptionsItem?.item || null} type={editOptionsItem?.type || 'card'} onEdit={() => { if(editOptionsItem?.type==='card') { setEditingItem(editOptionsItem.item as AACItem); setIsCreateModalOpen(true); } else { setEditingFolder(editOptionsItem?.item as Category); setIsFolderModalOpen(true); } }} onMove={() => setMoveModalItem(editOptionsItem)} onDelete={() => { if(editOptionsItem?.type==='card') setItemToDelete(editOptionsItem.item.id); else setFolderToDelete(editOptionsItem?.item.id); }} t={t} />
      <MoveItemModal isOpen={!!moveModalItem} onClose={() => setMoveModalItem(null)} itemToMove={moveModalItem} categories={categories.filter(c => c.boardId === currentBoardId)} onMove={(target) => { if(moveModalItem) moveItemToFolder(moveModalItem.item, moveModalItem.type, target); setMoveModalItem(null); }} t={t} />
      <ConfirmationModal isOpen={!!itemToDelete || !!folderToDelete} onClose={() => { setItemToDelete(null); setFolderToDelete(null); }} onConfirm={() => { if(itemToDelete) deleteCard(itemToDelete).then(() => setItemToDelete(null)); else if(folderToDelete) deleteFolderObj(folderToDelete).then(() => setFolderToDelete(null)); }} isFolder={!!folderToDelete} t={t} />
    </>
  );
};
