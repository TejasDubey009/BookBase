import { BookPlus } from 'lucide-react';

const PRIMARY_CLASSES = 'w-full py-1.5 px-3 rounded bg-accent hover:bg-accent-hover text-white text-sm font-medium transition-colors disabled:opacity-50';
const OUTLINE_CLASSES = 'py-1.5 px-3 rounded border border-field text-sm text-body hover:bg-shelf transition-colors';

function StatusLines({ primary, secondary }) {
  return (
    <div className="text-xs">
      <div className="text-body">{primary}</div>
      <div className="mt-0.5 text-muted">{secondary}</div>
    </div>
  );
}

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
    <div className="mt-auto w-full">
      {/* The kiosk is the only place books can physically be borrowed or returned */}
      {portal === 'kiosk' && (
        <>
          {hasActiveLoan && uCtx.return_requested ? (
            <StatusLines primary="Return Requested" secondary="Waiting for a librarian" />
          ) : hasActiveLoan ? (
            <div className="space-y-2">
              <div className="text-xs text-body">Borrowed by You</div>
              <button
                onClick={() => onReturn({ loan_id: uCtx.active_loan_id, title: book.title, barcode: uCtx.active_copy_barcode })}
                className={PRIMARY_CLASSES}
              >
                Request Return
              </button>
            </div>
          ) : waitlistPos ? (
            <StatusLines
              primary={<>Queue: Position #{waitlistPos}</>}
              secondary={waitlistPos === 1 ? 'Next copy allocates' : 'Waitlisted'}
            />
          ) : isAvailable ? (
            <button
              disabled={isActionLoading}
              onClick={() => onBorrow(book)}
              className={PRIMARY_CLASSES}
            >
              Borrow
            </button>
          ) : (
            <div className="flex items-stretch gap-1.5">
              <button
                disabled={isActionLoading}
                onClick={() => onJoinWaitlist(book.book_id)}
                className={PRIMARY_CLASSES}
              >
                Join Waitlist (#{book.waitlist_count + 1})
              </button>
              <button
                type="button"
                onClick={() => onRequestBook?.(book)}
                title="Request more copies"
                aria-label="Request more copies"
                className="px-2 rounded border border-field text-body hover:bg-shelf transition-colors"
              >
                <BookPlus className="w-4 h-4" />
              </button>
            </div>
          )}
        </>
      )}

      {/* The student site can reserve and request, but never borrow or return */}
      {portal === 'student' && (
        <>
          {hasActiveLoan ? (
            <StatusLines
              primary="Checked Out to You"
              secondary={uCtx.return_requested ? 'Return requested' : 'Return at the Library Kiosk'}
            />
          ) : waitlistPos ? (
            <StatusLines primary={<>Queue: #{waitlistPos}</>} secondary="Auto-Dispatches" />
          ) : isAvailable ? (
            <StatusLines primary="Available on Shelf" secondary="Borrow at the Library Kiosk" />
          ) : (
            <div className="space-y-2">
              <div className="text-xs text-body">All Copies On Loan</div>
              <button type="button" onClick={() => onRequestBook?.(book)} className={`${OUTLINE_CLASSES} w-full`}>
                Request Copy
              </button>
            </div>
          )}
        </>
      )}

      {portal === 'admin' && (
        <div className="text-xs text-muted">
          <div>{book.total_copies} Copies</div>
          <button onClick={() => onSelect(book)} className="mt-1 text-body hover:text-ink underline underline-offset-2 transition-colors">
            View Details
          </button>
        </div>
      )}
    </div>
  );
}
