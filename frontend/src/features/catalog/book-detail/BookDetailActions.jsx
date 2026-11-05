
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
              <span className="text-sm text-body flex items-center gap-1">
                Holding Copy {book.user_context.active_copy_barcode}
              </span>
              <button
                disabled={loadingActionId === book.book_id}
                onClick={() => {
                  onReturn(book.user_context.active_loan_id);
                  onClose();
                }}
                className="px-3 py-1.5 rounded bg-accent hover:bg-accent-hover text-white text-sm font-medium transition-colors"
              >
                Return Copy at Kiosk
              </button>
            </div>
          ) : book.user_context?.waitlist_position ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-body">
                Waitlist Queue: <span className="font-medium text-ink">#{book.user_context.waitlist_position}</span>
              </span>
              <button
                disabled={loadingActionId === book.book_id}
                onClick={() => {
                  onCancelWaitlist(book.user_context.waitlist_reservation_id);
                  onClose();
                }}
                className="px-3 py-2 rounded border border-field text-danger hover:bg-shelf text-xs font-medium transition-colors"
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
              className="px-3 py-1.5 rounded bg-accent hover:bg-accent-hover text-white text-sm font-medium transition-colors"
            >
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
                className="px-3 py-1.5 rounded bg-accent hover:bg-accent-hover text-white text-sm font-medium transition-colors"
              >
                Join Waitlist (#{book.waitlist_count + 1})
              </button>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onRequestBook?.(book);
                }}
                className="px-3 py-2 rounded border border-field text-body hover:bg-shelf text-xs font-medium flex items-center gap-1"
              >
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
            <span className="text-sm text-body flex items-center gap-1.5">
              <span>Holding Copy {book.user_context.active_copy_barcode} • Return at Central Library Kiosk</span>
            </span>
          ) : book.available_copies > 0 ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-body">
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
                className="px-3 py-1.5 rounded bg-accent hover:bg-accent-hover text-white text-sm font-medium transition-colors"
              >
                Join Waitlist (#{book.waitlist_count + 1})
              </button>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onRequestBook?.(book);
                }}
                className="px-4 py-2 rounded border border-field text-body hover:bg-shelf text-xs font-medium flex items-center gap-1.5"
              >
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
        <span className="text-xs text-muted">
          Total {book.total_copies} Accessioned Copies ({book.available_copies} Available)
        </span>
      )}
    </div>
  );
}
