import React from 'react';
import { 
  BookOpen, 
  Clock, 
  Check, 
  Users, 
  ArrowRight, 
  ShieldAlert, 
  Sparkles, 
  MapPin,
  BookPlus,
  Building2,
  Lock
} from 'lucide-react';
import BookCover from './BookCover';

const TINT_STYLES = {
  indigo: {
    bg: 'bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-100/80 dark:border-indigo-900/60',
    glow: 'from-indigo-400/20 to-transparent',
    pill: 'bg-indigo-100/80 text-indigo-800 border-indigo-200/80',
  },
  emerald: {
    bg: 'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-100/80 dark:border-emerald-900/60',
    glow: 'from-emerald-400/20 to-transparent',
    pill: 'bg-emerald-100/80 text-emerald-800 border-emerald-200/80',
  },
  amber: {
    bg: 'bg-amber-50/70 dark:bg-amber-950/40 border-amber-100/80 dark:border-amber-900/60',
    glow: 'from-amber-400/20 to-transparent',
    pill: 'bg-amber-100/80 text-amber-800 border-amber-200/80',
  },
  rose: {
    bg: 'bg-rose-50/70 dark:bg-rose-950/40 border-rose-100/80 dark:border-rose-900/60',
    glow: 'from-rose-400/20 to-transparent',
    pill: 'bg-rose-100/80 text-rose-800 border-rose-200/80',
  },
  cyan: {
    bg: 'bg-cyan-50/70 dark:bg-cyan-950/40 border-cyan-100/80 dark:border-cyan-900/60',
    glow: 'from-cyan-400/20 to-transparent',
    pill: 'bg-cyan-100/80 text-cyan-800 border-cyan-200/80',
  },
  purple: {
    bg: 'bg-purple-50/70 dark:bg-purple-950/40 border-purple-100/80 dark:border-purple-900/60',
    glow: 'from-purple-400/20 to-transparent',
    pill: 'bg-purple-100/80 text-purple-800 border-purple-200/80',
  },
  blue: {
    bg: 'bg-blue-50/70 dark:bg-blue-950/40 border-blue-100/80 dark:border-blue-900/60',
    glow: 'from-blue-400/20 to-transparent',
    pill: 'bg-blue-100/80 text-blue-800 border-blue-200/80',
  },
  slate: {
    bg: 'bg-slate-100/70 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-700/60',
    glow: 'from-slate-400/20 to-transparent',
    pill: 'bg-slate-200/80 text-slate-800 border-slate-300/80',
  },
};

export default function BentoBookCard({
  book,
  currentUser,
  portal = 'kiosk', // 'kiosk' | 'student' | 'admin'
  onSelect,
  onBorrow,
  onJoinWaitlist,
  onReturn,
  onRequestBook,
  loadingActionId
}) {
  const tint = TINT_STYLES[book.card_tint] || TINT_STYLES.indigo;
  const isAvailable = book.available_copies > 0;
  const uCtx = book.user_context;
  const hasActiveLoan = uCtx?.has_active_loan;
  const waitlistPos = uCtx?.waitlist_position;

  const isActionLoading = loadingActionId === book.book_id;

  // Format ISBN with hyphens
  const formatIsbn = (str) => {
    if (str && str.length === 13) {
      return `${str.slice(0, 3)}-${str.slice(3, 4)}-${str.slice(4, 9)}-${str.slice(9, 12)}-${str.slice(12)}`;
    }
    return str;
  };

  const shelf = book.copies?.[0]?.shelf_location || 'Central Library • Floor 2 Stacks';

  return (
    <div 
      className="group bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 overflow-hidden flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-xl hover:shadow-slate-200/40 dark:hover:shadow-slate-950/40 transition-all duration-300"
    >
      {/* Top Floating Cover Area */}
      <div 
        onClick={() => onSelect(book)}
        className={`relative p-6 pb-7 flex items-center justify-center border-b transition-colors cursor-pointer overflow-hidden ${tint.bg}`}
      >
        {/* Subtle Ambient Radial Glow */}
        <div className={`absolute -bottom-8 w-40 h-40 bg-gradient-to-t ${tint.glow} rounded-full blur-xl pointer-events-none`}></div>

        {/* Floating 3D Book Cover */}
        <div className="relative z-10 w-32 h-44 rounded-lg shadow-md group-hover:shadow-xl transition-all duration-300 transform group-hover:-translate-y-2 overflow-hidden bg-slate-200 dark:bg-slate-800 ring-1 ring-black/5">
          {/* Spine Highlight Shadow */}
          <div className="absolute left-0 top-0 bottom-0 w-2.5 bg-gradient-to-r from-black/25 via-transparent to-transparent z-20 pointer-events-none"></div>

          <BookCover book={book} className="w-full h-full" />
        </div>

        {/* Category Badge */}
        <div className="absolute top-3.5 left-3.5 z-10">
          <span className="text-[10px] font-bold tracking-wider uppercase px-2.5 py-0.5 rounded-full bg-white/95 dark:bg-slate-900/90 text-slate-800 dark:text-slate-200 shadow-xs backdrop-blur-xs border border-white/80 dark:border-slate-700">
            {book.category}
          </span>
        </div>

        <div className="absolute top-3.5 right-3.5 z-10">
          <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/10 text-slate-600 dark:text-slate-300">
            {book.published_year}
          </span>
        </div>
      </div>

      {/* Book Metadata Section */}
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          <h3 
            onClick={() => onSelect(book)}
            className="font-bold text-slate-900 dark:text-white text-sm sm:text-base leading-snug line-clamp-2 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer transition-colors"
            title={book.title}
          >
            {book.title}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-1 font-medium">
            by {book.author}
          </p>

          {/* Monospace ISBN & Shelf Info */}
          <div className="mt-3.5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-mono">
            <span>ISBN {formatIsbn(book.isbn)}</span>
            <span className="truncate max-w-[130px] flex items-center gap-1" title={shelf}>
              <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
              {shelf}
            </span>
          </div>

          {/* Copy Availability Pill (3NF Dynamic Computation) */}
          <div className="mt-3 flex items-center justify-between">
            {isAvailable ? (
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/60">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                <span>{book.available_copies} of {book.total_copies} Available</span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/50 text-amber-900 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/60">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                <span>0 Available • {book.waitlist_count} in Queue</span>
              </div>
            )}
          </div>
        </div>

        {/* Dynamic Contextual Action Area — Strictly Adapts to Current Portal */}
        <div className="mt-4 pt-3.5 border-t border-slate-100 dark:border-slate-800">
          
          {/* ========================================================= */}
          {/* PORTAL 1: LIBRARY KIOSK (On-Premise: Borrow & Return ON)   */}
          {/* ========================================================= */}
          {portal === 'kiosk' && (
            <>
              {hasActiveLoan ? (
                <div className="flex items-center gap-2">
                  <div className="flex-1 py-1.5 px-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold flex items-center justify-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>Borrowed by You</span>
                  </div>
                  <button
                    disabled={isActionLoading}
                    onClick={() => onReturn(uCtx.active_loan_id)}
                    className="py-1.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors disabled:opacity-50"
                  >
                    {isActionLoading ? '...' : 'Return at Kiosk'}
                  </button>
                </div>
              ) : waitlistPos ? (
                <div className="w-full py-2 px-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-950 dark:text-amber-200 border border-amber-200/80 dark:border-amber-800 text-xs font-semibold flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    <span>Queue: <strong>Position #{waitlistPos}</strong></span>
                  </span>
                  <span className="text-[10px] text-amber-700 dark:text-amber-300 font-mono bg-amber-100 dark:bg-amber-900/60 px-1.5 py-0.5 rounded">
                    {waitlistPos === 1 ? 'Next copy allocates' : 'Waitlisted'}
                  </span>
                </div>
              ) : isAvailable ? (
                <button
                  disabled={isActionLoading}
                  onClick={() => onBorrow(book.book_id)}
                  className="w-full py-2 px-3 rounded-xl bg-indigo-900 hover:bg-indigo-800 active:bg-indigo-950 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] shadow-xs disabled:opacity-50"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>{isActionLoading ? 'Processing...' : 'Borrow Book at Kiosk'}</span>
                </button>
              ) : (
                <div className="flex items-center gap-1.5">
                  <button
                    disabled={isActionLoading}
                    onClick={() => onJoinWaitlist(book.book_id)}
                    className="flex-1 py-2 px-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold flex items-center justify-center gap-1 transition-all active:scale-[0.98] shadow-xs disabled:opacity-50"
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>Join Waitlist (#{book.waitlist_count + 1})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onRequestBook?.(book)}
                    title="Request extra curriculum copies"
                    className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
                  >
                    <BookPlus className="w-4 h-4" />
                  </button>
                </div>
              )}
            </>
          )}

          {/* ========================================================= */}
          {/* PORTAL 3: STUDENT REMOTE PORTAL (Strictly NO Borrow/Return) */}
          {/* ========================================================= */}
          {portal === 'student' && (
            <div className="space-y-2">
              {hasActiveLoan ? (
                <div className="py-2 px-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 border border-indigo-200 dark:border-indigo-800/60 text-xs font-medium flex items-center justify-between">
                  <span className="flex items-center gap-1.5 font-bold">
                    <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    <span>Checked Out to You</span>
                  </span>
                  <span className="text-[10px] font-mono text-indigo-600 dark:text-indigo-400">
                    Return at Kiosk
                  </span>
                </div>
              ) : waitlistPos ? (
                <div className="py-2 px-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-950 dark:text-amber-200 border border-amber-200 dark:border-amber-800 text-xs font-semibold flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                    <span>Queue: <strong>#{waitlistPos}</strong></span>
                  </span>
                  <span className="text-[10px] text-amber-700 dark:text-amber-300 font-mono">
                    Auto-Dispatches
                  </span>
                </div>
              ) : isAvailable ? (
                <div className="py-2 px-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 text-xs text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 font-semibold text-emerald-700 dark:text-emerald-400">
                    <Building2 className="w-3.5 h-3.5" />
                    <span>Available on Shelf</span>
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                    Borrow at Library Kiosk
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <div className="flex-1 py-1.5 px-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-medium text-center">
                    All Copies On Loan
                  </div>
                  <button
                    type="button"
                    onClick={() => onRequestBook?.(book)}
                    className="flex items-center gap-1 py-1.5 px-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-xs font-semibold hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-colors"
                  >
                    <BookPlus className="w-3.5 h-3.5" />
                    <span>Request Copy</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ========================================================= */}
          {/* PORTAL 2: ADMIN PORTAL (Librarian Overview Action)        */}
          {/* ========================================================= */}
          {portal === 'admin' && (
            <div className="flex items-center justify-between text-xs">
              <span className="font-mono text-slate-500 dark:text-slate-400">
                {book.total_copies} Barcoded Copies
              </span>
              <button
                onClick={() => onSelect(book)}
                className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 flex items-center gap-1"
              >
                <span>View Details</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
