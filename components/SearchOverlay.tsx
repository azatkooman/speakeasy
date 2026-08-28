import React from 'react';
import { Search, X, ChevronRight, Home, Folder, Anchor } from 'lucide-react';
import { SearchHit } from '../types';
import { TranslationKey } from '../services/translations';
import Dialog from './Dialog.tsx';

interface SearchOverlayProps {
  isOpen: boolean;
  query: string;
  onQueryChange: (q: string) => void;
  results: SearchHit[];
  /** Jump to where the hit lives and close. */
  onJump: (hit: SearchHit) => void;
  onClose: () => void;
  t: (key: TranslationKey) => string;
}

/**
 * Search, as an overlay over the board rather than a replacement for it.
 *
 * It used to pack matches into the board's own grid cells. That quietly undid
 * the thing the whole slot system exists to protect: every symbol a child had
 * memorised appeared somewhere else, and the board only came back when the
 * parent thought to close search. It was parent-gated for exactly that reason,
 * which made a useful tool unavailable in the mode where finding a card matters
 * most.
 *
 * Each result names where it lives, because "where did I put that card" is the
 * actual question a parent is asking. Choosing one navigates there instead of
 * speaking it — searching is not communicating, and the old behaviour spoke the
 * word as a side effect of jumping to it.
 */
const SearchOverlay: React.FC<SearchOverlayProps> = ({
  isOpen, query, onQueryChange, results, onJump, onClose, t,
}) => {

  const trimmed = query.trim();

  // Children of <Dialog> are evaluated before they are passed to it, so a

  // closed dialog must not render at all — its body reads state that only

  // exists while it is open.
  if (!isOpen) return null;


  return (

    <Dialog

      isOpen={isOpen}

      onClose={onClose}

      label={t('search.placeholder')}

      scrimClassName="fixed inset-0 z-[80] flex"

      panelClassName="bg-white w-full h-full flex flex-col"

    >
      <div
        className="flex items-center gap-3 px-4 py-3 border-b border-slate-200 bg-slate-50 shrink-0"
        style={{ paddingTop: 'calc(var(--sa-top) + 0.75rem)' }}
      >
        <div className="relative flex-1 min-w-0">
          <input
            type="text"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder={t('search.placeholder')}
            aria-label={t('search.placeholder')}
            autoFocus
            className="w-full pl-10 pr-4 py-2.5 bg-white border-2 border-primary/30 rounded-xl outline-none focus:border-primary font-bold text-slate-800 placeholder:text-slate-400 text-base"
          />
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        </div>
        <button
          onClick={onClose}
          aria-label={t('modal.categories.cancel')}
          className="p-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-100 active:scale-95 transition-all shrink-0"
        >
          <X size={20} />
        </button>
      </div>

      <div
        className="flex-1 overflow-y-auto p-3"
        aria-live="polite"
        style={{ paddingBottom: 'calc(var(--sa-bottom) + 1rem)' }}
      >
        {trimmed === '' ? (
          <p className="text-center text-slate-400 font-semibold py-12 px-6">{t('search.placeholder')}</p>
        ) : results.length === 0 ? (
          <p className="text-center text-slate-500 font-bold py-12 px-6">
            {t('search.no_results')} “{trimmed}”
          </p>
        ) : (
          <ul className="space-y-2 max-w-2xl mx-auto">
            {results.map(hit => (
              <li key={`${hit.type}-${hit.id}`}>
                <button
                  type="button"
                  onClick={() => onJump(hit)}
                  className="w-full flex items-center gap-3 p-3 rounded-2xl border-2 border-slate-200 bg-white text-left hover:border-primary hover:bg-primary/5 active:scale-[0.99] transition-all focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary"
                >
                  <span className="w-12 h-12 shrink-0 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden">
                    {hit.type === 'folder' ? (
                      <Folder size={22} className="text-slate-500" strokeWidth={1.75} />
                    ) : hit.imageUrl ? (
                      <img src={hit.imageUrl} alt="" loading="lazy" className="w-full h-full object-contain p-0.5" />
                    ) : (
                      <Search size={18} className="text-slate-400" />
                    )}
                  </span>

                  <span className="flex-1 min-w-0">
                    <span className="block font-bold text-slate-900 truncate">{hit.label}</span>

                    {/* Where it lives. Rendered as the same breadcrumb shape the
                        board header uses, so it reads as a location rather than
                        as a caption — and it needs no wording, which keeps it
                        correct in all four languages. */}
                    <span className="flex items-center gap-0.5 mt-0.5 text-xs font-semibold text-slate-500 overflow-hidden">
                      {hit.isCore ? (
                        <>
                          <Anchor size={12} className="shrink-0" />
                          <span className="truncate">{t('modal.create.core')}</span>
                        </>
                      ) : (
                        <>
                          <Home size={12} className="shrink-0" />
                          {hit.path.map((seg, i) => (
                            <React.Fragment key={`${seg}-${i}`}>
                              <ChevronRight size={12} className="shrink-0 text-slate-300" />
                              <span className="truncate">{seg}</span>
                            </React.Fragment>
                          ))}
                        </>
                      )}
                    </span>
                  </span>

                  <ChevronRight size={18} className="text-slate-300 shrink-0" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

    </Dialog>
  );
};

export default SearchOverlay;
