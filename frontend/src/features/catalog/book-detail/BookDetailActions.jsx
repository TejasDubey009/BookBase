import { BookOpen, BookPlus, Building, CheckCircle2, Clock } from 'lucide-react';

/** The modal footer's contextual actions, which depend on the portal and the patron's loan state. */
export default function BookDetailActions({
  book,
  portal,
  onClose,
  onBorrow,
  onJoinWaitlist,
  onReturn,
  onCancelWaitlist,
  onRequestBook,
  loadingActionId
}) {
  return (
    <div className="flex items-center gap-2">
      {/* ========================================================= */}
      {/* PORTAL 1: KIOSK (Full Borrow & Return Actions)             */}
      {/* ========================================================= */}
      {portal === 'kiosk' && (
        <>
          {book.user_context?.has_active_loan ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-emerald-700 font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Holding Copy {book.user_context.active_copy_barcode}
              </span>
              <button
                disabled={loadingActionId === book.book_id}
                onClick={() => {
                  onReturn(book.user_context.active_loan_id);
                  onClose();
                }}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors"
              >
                Return Copy at Kiosk
              </button>
            </div>
          ) : book.user_context?.waitlist_position ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-amber-800 font-medium">
                Waitlist Queue: <strong>#{book.user_context.waitlist_position}</strong>
              </span>
              <button
                disabled={loadingActionId === book.book_id}
                onClick={() => {
                  onCancelWaitlist(book.user_context.waitlist_reservation_id);
                  onClose();
                }}
                className="px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-medium transition-colors"
              >
                Leave Waitlist
              </button>
            </div>
          ) : book.available_copies > 0 ? (
            <button
              disabled={loadingActionId === book.book_id}
              onClick={() => {
                onBorrow(book.book_id);
                onClose();
              }}
              className="px-5 py-2 rounded-xl bg-indigo-900 hover:bg-indigo-800 text-white text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5"
            >
              <BookOpen className="w-3.5 h-3.5" />
              Borrow Copy at Kiosk
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                disabled={loadingActionId === book.book_id}
                onClick={() => {
                  onJoinWaitlist(book.book_id);
                  onClose();
                }}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5"
              >
                <Clock className="w-3.5 h-3.5" />
                Join Waitlist (#{book.waitlist_count + 1})
              </button>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onRequestBook?.(book);
                }}
                className="px-3 py-2 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center gap-1"
              >
                <BookPlus className="w-3.5 h-3.5" />
                <span>Request Extra Copies</span>
              </button>
            </div>
          )}
        </>
      )}

      {/* ========================================================= */}
      {/* PORTAL 3: STUDENT REMOTE PORTAL (Strictly NO Borrow/Return)*/}
      {/* ========================================================= */}
      {portal === 'student' && (
        <div className="flex items-center gap-2">
          {book.user_context?.has_active_loan ? (
            <span className="text-xs text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-xl border border-indigo-200 font-medium flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />
              <span>Holding Copy {book.user_context.active_copy_barcode} • Return at Central Library Kiosk</span>
            </span>
          ) : book.available_copies > 0 ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-600 bg-slate-100 px-3 py-1.5 rounded-xl font-medium flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-slate-500" />
                <span>Available on shelf • Visit Library Kiosk to borrow</span>
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                disabled={loadingActionId === book.book_id}
                onClick={() => {
                  onJoinWaitlist(book.book_id);
                  onClose();
                }}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5"
              >
                <Clock className="w-3.5 h-3.5" />
                Join Waitlist (#{book.waitlist_count + 1})
              </button>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onRequestBook?.(book);
                }}
                className="px-4 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200 text-xs font-semibold flex items-center gap-1.5"
              >
                <BookPlus className="w-3.5 h-3.5 text-indigo-600" />
                <span>Request Additional Copy</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* PORTAL 2: ADMIN PORTAL                                    */}
      {/* ========================================================= */}
      {portal === 'admin' && (
        <span className="text-xs font-mono text-slate-500">
          Total {book.total_copies} Accessioned Copies ({book.available_copies} Available)
        </span>
      )}
    </div>
  );
}
