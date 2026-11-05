import { AlertTriangle, Barcode, RotateCcw, Zap } from 'lucide-react';

export default function CirculationTab({ allLoans, filterOverdue, setFilterOverdue, loadingActionId, onReturnBook, fetchOverview }) {
  const loans = filterOverdue ? allLoans.filter(l => l.is_overdue) : allLoans;

  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
            <Barcode className="w-4 h-4 text-indigo-600" />
            Active Circulation Loans ({allLoans.length})
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Process physical copy returns, calculate applicable overdue charges, and allocate to next pending student reservation.
          </p>
        </div>

        <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-medium self-start sm:self-auto">
          <button
            onClick={() => setFilterOverdue(false)}
            className={`px-3 py-1 rounded-lg transition-all ${
              !filterOverdue ? 'bg-white text-slate-900 font-semibold shadow-2xs' : 'text-slate-600'
            }`}
          >
            All Loans ({allLoans.length})
          </button>
          <button
            onClick={() => setFilterOverdue(true)}
            className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1 ${
              filterOverdue ? 'bg-white text-rose-700 font-semibold shadow-2xs' : 'text-slate-600'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
            Overdue Only ({allLoans.filter(l => l.is_overdue).length})
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-100/70 text-slate-600 font-semibold border-b border-slate-200/60">
            <tr>
              <th className="py-3 px-4">Title / Author</th>
              <th className="py-3 px-4">Borrowing Patron (Roll No)</th>
              <th className="py-3 px-4">Copy Barcode</th>
              <th className="py-3 px-4">Shelf Location</th>
              <th className="py-3 px-4">Channel</th>
              <th className="py-3 px-4">Due Date &amp; Status</th>
              <th className="py-3 px-4 text-right">Desk Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-mono text-slate-700">
            {loans.length === 0 ? (
              <tr>
                <td colSpan="7" className="py-12 text-center text-slate-400 font-sans">
                  No active loans matching criteria.
                </td>
              </tr>
            ) : (
              loans.map((loan) => {
                const isOverdue = loan.is_overdue;
                const isAutoFulfill = loan.issued_via === 'Waitlist Auto-Fulfill';
                const isActionLoading = loadingActionId === loan.loan_id;

                return (
                  <tr key={loan.loan_id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-sans">
                      <div className="font-semibold text-slate-900 line-clamp-1">{loan.title}</div>
                      <div className="text-[11px] text-slate-500">{loan.author}</div>
                    </td>

                    <td className="py-3 px-4 font-sans">
                      <div className="font-medium text-slate-900 flex items-center gap-1.5">
                        <span>{loan.user_name}</span>
                        <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                          {loan.enrollment_no || `ID #${loan.user_id}`}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono">{loan.user_email}</div>
                    </td>

                    <td className="py-3 px-4">
                      <span className="font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200/60">
                        {loan.barcode}
                      </span>
                    </td>

                    <td className="py-3 px-4 font-sans text-slate-600">
                      {loan.shelf_location}
                    </td>

                    <td className="py-3 px-4 font-sans">
                      {isAutoFulfill ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                          <Zap className="w-3 h-3 text-amber-600" />
                          Auto-Fulfilled
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-500">
                          Direct Checkout
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4 font-sans">
                      {isOverdue ? (
                        <div className="inline-flex items-center gap-1 text-xs font-semibold text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200">
                          <AlertTriangle className="w-3 h-3 text-rose-600" />
                          Overdue ({Math.abs(loan.days_remaining)}d) • ₹{Math.abs(loan.days_remaining * 2).toFixed(2)} Fine
                        </div>
                      ) : (
                        <div className="text-xs text-slate-600">
                          Due in {loan.days_remaining}d ({loan.due_date.slice(0, 10)})
                        </div>
                      )}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <button
                        disabled={isActionLoading}
                        onClick={() => onReturnBook(loan.loan_id).then(fetchOverview)}
                        className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-semibold transition-colors disabled:opacity-50 inline-flex items-center gap-1"
                      >
                        <RotateCcw className="w-3 h-3 text-emerald-600" />
                        <span>{isActionLoading ? 'Processing...' : 'Process Return'}</span>
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
