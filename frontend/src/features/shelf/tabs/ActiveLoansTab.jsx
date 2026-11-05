import { AlertTriangle, Barcode, BookOpen, Calendar, MapPin, RotateCcw, Zap } from 'lucide-react';
import BookCover from '../../../components/books/BookCover';

function LoanCard({ loan, portal, onSelectBook, onReturnBook, fetchDashboard, loadingActionId }) {
  const isOverdue = loan.is_overdue;
  const isAutoFulfill = loan.issued_via === 'Waitlist Auto-Fulfill';
  const isLoading = loadingActionId === loan.loan_id;

  return (
    <div
      className={`bg-white rounded-3xl border p-5 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-all space-y-4 ${
        isOverdue ? 'border-rose-300 ring-2 ring-rose-500/10' : 'border-slate-200/80'
      }`}
    >
      <div className="flex gap-4">
        <div
          onClick={() => onSelectBook({ book_id: loan.book_id })}
          className="w-20 h-28 rounded-lg shadow-sm overflow-hidden bg-slate-100 flex-shrink-0 cursor-pointer hover:opacity-90 transition-opacity"
        >
          <BookCover book={loan} className="w-full h-full" />
        </div>

        <div className="flex-1 min-w-0">
          <h3
            onClick={() => onSelectBook({ book_id: loan.book_id })}
            className="font-bold text-sm text-slate-900 leading-snug line-clamp-2 hover:text-indigo-600 cursor-pointer"
            title={loan.title}
          >
            {loan.title}
          </h3>
          <p className="text-xs text-slate-500 mt-0.5 truncate">
            by {loan.author}
          </p>

          {/* Barcode & Shelf */}
          <div className="mt-2.5 space-y-1 font-mono text-[11px] text-slate-600">
            <div className="flex items-center gap-1.5">
              <Barcode className="w-3.5 h-3.5 text-indigo-500" />
              <span className="font-semibold text-slate-800">{loan.barcode}</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-500">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              <span className="truncate">{loan.shelf_location}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Badges: Issue Method & Due Date */}
      <div className="pt-3 border-t border-slate-100 space-y-2">
        <div className="flex items-center justify-between text-xs">
          {isAutoFulfill ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200/80 font-mono text-[10px] font-semibold">
              <Zap className="w-3 h-3 text-amber-600" />
              Auto-Issued from Queue #1
            </span>
          ) : (
            <span className="text-[10px] text-slate-500 font-mono">
              Direct Checkout
            </span>
          )}

          <span className="text-[10px] text-slate-400 font-mono">
            Loan #{loan.loan_id}
          </span>
        </div>

        {/* DUE DATE CARD */}
        <div className={`p-3 rounded-2xl border text-xs flex items-center justify-between ${
          isOverdue
            ? 'bg-rose-50 border-rose-200 text-rose-800'
            : 'bg-slate-50 border-slate-200 text-slate-700'
        }`}>
          <div className="flex items-center gap-1.5">
            {isOverdue ? (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            ) : (
              <Calendar className="w-4 h-4 text-indigo-600 shrink-0" />
            )}
            <div>
              <div className="font-bold">
                {isOverdue
                  ? `Overdue by ${Math.abs(loan.days_remaining)} Days`
                  : `Due in ${loan.days_remaining} Days`}
              </div>
              <div className="text-[10px] opacity-80 font-mono">
                {isOverdue ? `Accrued fine: ₹${(Math.abs(loan.days_remaining) * 2).toFixed(2)}` : 'On schedule'}
              </div>
            </div>
          </div>
          <div className="text-right font-mono">
            <span className="text-[11px] font-bold block">
              {loan.due_date.slice(0, 10)}
            </span>
            <span className="text-[9px] text-slate-400">Target Date</span>
          </div>
        </div>

        {/* CONDITIONAL ACTION BASED ON PORTAL */}
        {portal === 'kiosk' ? (
          <button
            disabled={isLoading}
            onClick={() => onReturnBook(loan.loan_id).then(fetchDashboard)}
            className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 shadow-xs"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{isLoading ? 'Processing Return...' : 'Return Book at Kiosk'}</span>
          </button>
        ) : (
          <div className="p-2.5 rounded-xl bg-slate-100 text-slate-600 text-xs text-center font-medium">
            <span className="text-[11px]">To return, drop off this physical copy at the Central Library Kiosk.</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ActiveLoansTab({ activeLoans, portal, onSelectBook, onReturnBook, fetchDashboard, loadingActionId }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-600" />
            Active Borrowings &amp; Return Deadlines
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {portal === 'kiosk'
              ? 'Self-service physical return station. Click Return to deposit copy.'
              : 'Track your loan countdowns and return deadlines. Returns must be dropped off at the Library Kiosk.'}
          </p>
        </div>
        <span className="text-xs font-mono font-medium text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
          {activeLoans.length} Borrowed
        </span>
      </div>

      {activeLoans.length === 0 ? (
        <div className="py-12 text-center bg-white rounded-3xl border border-dashed border-slate-300 p-8">
          <BookOpen className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <h3 className="text-sm font-semibold text-slate-800">No books currently borrowed</h3>
          <p className="text-xs text-slate-500 mt-1">Browse the library catalog to borrow an available title.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
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
