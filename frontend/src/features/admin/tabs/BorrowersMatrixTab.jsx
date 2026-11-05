import { AlertTriangle, Search } from 'lucide-react';
import BookCover from '../../../components/books/BookCover';

function BorrowerCard({ b, loadingActionId, onReturnBook, fetchOverview }) {
  const isActive = b.status === 'Active';
  const isOverdue = b.status === 'Overdue';
  const isReturned = b.status === 'Returned';
  const isActionLoading = loadingActionId === b.loan_id;

  return (
    <div className="py-3 first:pt-0 last:pb-0">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-1">
        <div>
          <span className="text-ink">{b.student_name || b.user_name}</span>
          <span className="ml-2 text-xs text-muted">Roll: {b.student_enrollment_no || b.enrollment_no}</span>
          <div className="text-xs text-muted">{b.student_email || b.user_email}</div>
        </div>

        <div className="text-xs">
          {isOverdue && (
            <span className="inline-flex items-center gap-1 font-medium text-danger">
              <AlertTriangle className="w-3.5 h-3.5" />
              Overdue • ₹{b.accrued_fine.toFixed(2)} Fine
            </span>
          )}
          {isActive && !isOverdue && <span className="text-body">Active Loan</span>}
          {isReturned && <span className="text-muted">Returned ({b.return_date?.slice(0, 10)})</span>}
        </div>
      </div>

      <div className="mt-1.5 flex items-center justify-between gap-3 text-xs text-muted">
        <span>Copy: {b.barcode} · Issued: {b.issue_date?.slice(0, 10)} | Due: {b.due_date?.slice(0, 10)}</span>

        {(isActive || isOverdue) && (
          <button
            disabled={isActionLoading}
            onClick={() => onReturnBook(b.loan_id).then(fetchOverview)}
            className="px-2.5 py-1 rounded border border-field text-body hover:bg-shelf whitespace-nowrap transition-colors disabled:opacity-50"
          >
            {isActionLoading ? 'Processing...' : 'Return Copy'}
          </button>
        )}
      </div>
    </div>
  );
}

/** Each curriculum title beside the searchable history of students who have borrowed it. */
export default function BorrowersMatrixTab({ groupedBooks, matrixSearch, onSearchMatrix, loadingActionId, onReturnBook, fetchOverview }) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-medium text-ink">Book Title &amp; Student Borrowers Correlation Matrix</h2>
          <p className="mt-0.5 text-sm text-muted max-w-2xl">
            Primary column displays the curriculum title; secondary column displays the searchable history of all students who have borrowed copies of that title.
          </p>
        </div>

        <div className="relative w-full md:w-80 shrink-0">
          <Search className="w-4 h-4 text-muted absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search by Title, Student Name, or Roll No..."
            value={matrixSearch}
            onChange={(e) => onSearchMatrix(e.target.value)}
            className="w-full h-10 pl-9 pr-14 text-sm text-ink rounded border border-field bg-white text-ellipsis focus:outline-none focus:ring-1 focus:ring-ink focus:border-ink placeholder:text-muted"
          />
          {matrixSearch && (
            <button
              onClick={() => onSearchMatrix('')}
              className="absolute right-3 top-2.5 text-sm text-muted hover:text-ink transition-colors"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto border border-line rounded-lg">
        <table className="w-full text-left text-sm">
          <thead className="text-xs text-muted border-b border-line [&_th]:font-normal">
            <tr>
              <th className="py-3 px-5 w-2/5">1. Curriculum Book Title &amp; Inventory Status</th>
              <th className="py-3 px-5 w-3/5">2. Student Borrowers (Searchable List: Active, Overdue &amp; Returned)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {groupedBooks.length === 0 ? (
              <tr>
                <td colSpan="2" className="py-12 text-center text-muted">
                  No books or student borrowers matching "{matrixSearch}".
                </td>
              </tr>
            ) : (
              groupedBooks.map((item) => (
                <tr key={item.book_id} className="align-top">
                  <td className="py-4 px-5">
                    <div className="flex gap-3.5">
                      <div className="w-14 h-20 shrink-0">
                        <BookCover book={item} className="w-full h-full" />
                      </div>
                      <div>
                        <h3 className="text-ink leading-snug">{item.title}</h3>
                        <p className="mt-0.5 text-xs text-muted">by {item.author} ({item.published_year})</p>
                        <p className="mt-2 text-xs text-muted">{item.category} · ISBN: {item.isbn}</p>
                        <p className="mt-0.5 text-xs text-body tabular-nums">
                          {item.available_copies} / {item.total_copies} Available
                          {item.waitlist_count > 0 && <> · {item.waitlist_count} on Waitlist</>}
                        </p>
                      </div>
                    </div>
                  </td>

                  <td className="py-4 px-5">
                    {item.borrowers && item.borrowers.length > 0 ? (
                      <div className="divide-y divide-line">
                        {item.borrowers.map((b) => (
                          <BorrowerCard
                            key={b.loan_id}
                            b={b}
                            loadingActionId={loadingActionId}
                            onReturnBook={onReturnBook}
                            fetchOverview={fetchOverview}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="text-xs text-muted">
                        No students have borrowed this book yet. All copies are currently available on shelf.
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
