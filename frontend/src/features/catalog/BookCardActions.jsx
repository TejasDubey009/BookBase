import { ArrowRight, BookOpen, BookPlus, Building2, Check, Clock } from 'lucide-react';

/** What a patron can do with a book from its card. This strictly adapts to the current portal. */
export default function BookCardActions({
  book,
  portal,
  onSelect,
  onBorrow,
  onJoinWaitlist,
  onReturn,
  onRequestBook,
  loadingActionId
}) {
  const isAvailable = book.available_copies > 0;
  const uCtx = book.user_context;
  const hasActiveLoan = uCtx?.has_active_loan;
  const waitlistPos = uCtx?.waitlist_position;
  const isActionLoading = loadingActionId === book.book_id;

  return (
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
  );
}
