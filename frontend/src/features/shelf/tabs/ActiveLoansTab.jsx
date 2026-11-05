import { AlertTriangle } from 'lucide-react';
import BookCover from '../../../components/books/BookCover';

function LoanCard({ loan, portal, onSelectBook, onReturnBook, fetchDashboard, loadingActionId }) {
  const isOverdue = loan.is_overdue;
  const isAutoFulfill = loan.issued_via === 'Waitlist Auto-Fulfill';
  const isLoading = loadingActionId === loan.loan_id;

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
          <p className="mt-2.5 text-xs text-body">{loan.barcode}</p>
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
            <div className="mt-0.5 text-xs text-muted">Target Date</div>
          </div>
        </div>

        {/* Books can only physically be returned at the kiosk */}
        {portal === 'kiosk' ? (
          <button
            disabled={isLoading}
            onClick={() => onReturnBook(loan.loan_id).then(fetchDashboard)}
            className="w-full py-1.5 px-3 rounded bg-accent hover:bg-accent-hover text-white text-sm font-medium transition-colors disabled:opacity-50"
          >
            {isLoading ? 'Processing Return...' : 'Return Book at Kiosk'}
          </button>
        ) : (
          <p className="text-xs text-muted">To return, drop off this physical copy at the Central Library Kiosk.</p>
        )}
      </div>
    </div>
  );
}

export default function ActiveLoansTab({ activeLoans, portal, onSelectBook, onReturnBook, fetchDashboard, loadingActionId }) {
  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-medium text-ink">Active Borrowings &amp; Return Deadlines</h2>
          <p className="mt-0.5 text-sm text-muted">
            {portal === 'kiosk'
              ? 'Self-service physical return station. Click Return to deposit copy.'
              : 'Track your loan countdowns and return deadlines. Returns must be dropped off at the Library Kiosk.'}
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
              fetchDashboard={fetchDashboard}
              loadingActionId={loadingActionId}
            />
          ))}
        </div>
      )}
    </div>
  );
}
