import { AlertTriangle, BookOpen, RotateCcw, Search } from 'lucide-react';
import BookCover from '../../../components/books/BookCover';

function BorrowerCard({ b, loadingActionId, onReturnBook, fetchOverview }) {
  const isActive = b.status === 'Active';
  const isOverdue = b.status === 'Overdue';
  const isReturned = b.status === 'Returned';
  const isActionLoading = loadingActionId === b.loan_id;

  return (
    <div
      className={`p-3 rounded-2xl border transition-all ${
        isOverdue
          ? 'bg-rose-50/60 border-rose-200'
          : isActive
          ? 'bg-white border-slate-200 shadow-2xs'
          : 'bg-slate-100/60 border-slate-200/80 text-slate-600'
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
            isOverdue
              ? 'bg-rose-600 text-white'
              : isActive
              ? 'bg-indigo-600 text-white'
              : 'bg-slate-300 text-slate-700'
          }`}>
            {(b.student_name || b.user_name || 'S').charAt(0)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900">{b.student_name || b.user_name}</span>
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-800 border border-indigo-200">
                Roll: {b.student_enrollment_no || b.enrollment_no}
              </span>
            </div>
            <div className="text-[10px] text-slate-500 font-mono">
              {b.student_email || b.user_email}
            </div>
          </div>
        </div>

        {/* Status & Barcode Pill */}
        <div className="flex items-center gap-2 font-mono text-[11px]">
          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
            Copy: {b.barcode}
          </span>

          {isOverdue && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 font-bold">
              <AlertTriangle className="w-3 h-3 text-rose-600" />
              Overdue • ₹{b.accrued_fine.toFixed(2)} Fine
            </span>
          )}
          {isActive && !isOverdue && (
            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
              Active Loan
            </span>
          )}
          {isReturned && (
            <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 font-medium">
              Returned ({b.return_date?.slice(0, 10)})
            </span>
          )}
        </div>
      </div>

      <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-mono">
        <span>Issued: {b.issue_date?.slice(0, 10)} | Due: {b.due_date?.slice(0, 10)}</span>

        {(isActive || isOverdue) && (
          <button
            disabled={isActionLoading}
            onClick={() => onReturnBook(b.loan_id).then(fetchOverview)}
            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-sans text-xs font-semibold transition-colors disabled:opacity-50 inline-flex items-center gap-1"
          >
            <RotateCcw className="w-3 h-3" />
            <span>{isActionLoading ? 'Processing...' : 'Return Copy'}</span>
          </button>
        )}
      </div>
    </div>
  );
}

/** Each curriculum title beside the searchable history of students who have borrowed it. */
export default function BorrowersMatrixTab({ groupedBooks, matrixSearch, onSearchMatrix, loadingActionId, onReturnBook, fetchOverview }) {
  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
      <div className="p-6 border-b border-slate-200/80 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-600" />
            Book Title &amp; Student Borrowers Correlation Matrix
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Primary column displays the curriculum title; secondary column displays the searchable history of all students who have borrowed copies of that title.
          </p>
        </div>

        {/* Matrix Search Filter */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search by Title, Student Name, or Roll No..."
            value={matrixSearch}
            onChange={(e) => onSearchMatrix(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium"
          />
          {matrixSearch && (
            <button
              onClick={() => onSearchMatrix('')}
              className="absolute right-2.5 top-2.5 text-[11px] text-slate-400 hover:text-slate-600"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-100/75 text-slate-700 font-semibold border-b border-slate-200/70">
            <tr>
              <th className="py-3 px-5 w-2/5">1. Curriculum Book Title &amp; Inventory Status</th>
              <th className="py-3 px-5 w-3/5">2. Student Borrowers (Searchable List: Active, Overdue &amp; Returned)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {groupedBooks.length === 0 ? (
              <tr>
                <td colSpan="2" className="py-12 text-center text-slate-400 font-sans">
                  No books or student borrowers matching "{matrixSearch}".
                </td>
              </tr>
            ) : (
              groupedBooks.map((item) => (
                <tr key={item.book_id} className="hover:bg-slate-50/70 transition-colors align-top">
                  {/* PRIMARY FIRST COLUMN: BOOK TITLE */}
                  <td className="py-4 px-5">
                    <div className="flex gap-3.5">
                      <div className="w-14 h-20 rounded-lg shadow-2xs overflow-hidden bg-slate-100 shrink-0">
                        <BookCover book={item} className="w-full h-full" />
                      </div>
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                          {item.category}
                        </span>
                        <h3 className="font-bold text-sm text-slate-900 leading-snug mt-1">
                          {item.title}
                        </h3>
                        <p className="text-xs text-slate-500 font-medium">
                          by {item.author} ({item.published_year})
                        </p>
                        <div className="mt-2 text-[11px] font-mono text-slate-500">
                          ISBN: {item.isbn}
                        </div>
                        <div className="mt-2 flex items-center gap-2">
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 font-mono">
                            {item.available_copies} / {item.total_copies} Available
                          </span>
                          {item.waitlist_count > 0 && (
                            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 font-mono">
                              {item.waitlist_count} on Waitlist
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* SECOND COLUMN: SEARCHABLE LIST OF ALL STUDENTS WHO HAVE BORROWED */}
                  <td className="py-4 px-5 bg-slate-50/30">
                    {item.borrowers && item.borrowers.length > 0 ? (
                      <div className="space-y-2.5">
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
                      <div className="py-6 text-center text-slate-400 font-sans">
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
