import { AlertTriangle } from 'lucide-react';
import BookCover from '../../../components/books/BookCover';

function LoanCard({ loan, portal, onSelectBook, onReturnBook }) {
  const isOverdue = loan.is_overdue;
  const isAutoFulfill = loan.issued_via === 'Waitlist Auto-Fulfill';

  return (
    <div className="p-5 border border-line -ml-px -mt-px flex flex-col justify-between gap-4">
      <div className="flex gap-4">
        <div
          onClick={() => onSelectBook({ book_id: loan.book_id })}
          className="w-20 h-28 flex-shrink-0 cursor-pointer"
        >
          <BookCover book={loan} className="w-full h-full" />
        </div>

        <div className="flex-1 min-w-0">
          <h3
            onClick={() => onSelectBook({ book_id: loan.book_id })}
            className="text-sm text-ink leading-snug line-clamp-2 cursor-pointer hover:underline underline-offset-2"
            title={loan.title}
          >
            {loan.title}
          </h3>
          <p className="mt-0.5 text-xs text-muted truncate">by {loan.author}</p>
          <p className="mt-2.5 text-xs text-body">Copy {loan.barcode} · {loan.condition_at_issue}</p>
          <p className="mt-0.5 text-xs text-muted truncate">{loan.shelf_location}</p>
          <p className="mt-2.5 text-xs text-muted">
            {isAutoFulfill ? <span className="text-body">Auto-Issued from Queue #1</span> : 'Direct Checkout'} · Loan #{loan.loan_id}
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <div className="pt-3 border-t border-line flex items-start justify-between gap-3">
          <div>
            {isOverdue ? (
              <>
                <div className="flex items-center gap-1.5 text-sm font-medium text-danger">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  Overdue by {loan.days_overdue} Days
                </div>
                <div className="mt-0.5 text-xs text-danger">Accrued fine: ₹{loan.accrued_fine.toFixed(2)}</div>
              </>
            ) : (
              <>
                <div className="text-sm text-ink">Due in {loan.days_remaining} Days</div>
                <div className="mt-0.5 text-xs text-muted">On schedule</div>
              </>
            )}
          </div>
          <div className="text-right shrink-0">
            <div className="text-sm text-ink tabular-nums">{loan.due_date.slice(0, 10)}</div>
            <div className="mt-0.5 text-xs text-muted">Due Date</div>
          </div>
        </div>

        {/* A return starts at the kiosk, and a librarian then confirms it */}
        {loan.return_request_id ? (
          <p className="text-xs text-body">
            Return requested on {loan.return_requested_at.slice(0, 10)}. Waiting for a librarian to confirm.
          </p>
        ) : portal === 'kiosk' ? (
          <button
            onClick={() => onReturnBook(loan)}
            className="w-full py-1.5 px-3 rounded bg-accent hover:bg-accent-hover text-white text-sm font-medium transition-colors"
          >
            Request Return
          </button>
        ) : (
          <p className="text-xs text-muted">To return this copy, request it at the Library Kiosk.</p>
        )}
      </div>
    </div>
  );
}

export default function ActiveLoansTab({ activeLoans, portal, onSelectBook, onReturnBook }) {
  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-medium text-ink">{portal === 'kiosk' ? 'Return a Book' : 'My Loans'}</h2>
          <p className="mt-0.5 text-sm text-muted">
            {portal === 'kiosk'
              ? 'You will be asked for the code on the book\'s label and its condition.'
              : 'Your books and when each one is due.'}
          </p>
        </div>
        <span className="text-sm text-muted whitespace-nowrap tabular-nums">{activeLoans.length} Borrowed</span>
      </div>

      {activeLoans.length === 0 ? (
        <div className="py-12 text-center">
          <h3 className="text-sm font-medium text-ink">No books currently borrowed</h3>
          <p className="mt-1 text-sm text-muted">Browse the library catalog to borrow an available title.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 pl-px pt-px">
          {activeLoans.map((loan) => (
            <LoanCard
              key={loan.loan_id}
              loan={loan}
              portal={portal}
              onSelectBook={onSelectBook}
              onReturnBook={onReturnBook}
            />
          ))}
        </div>
      )}
    </div>
  );
}
