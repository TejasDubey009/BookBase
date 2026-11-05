import { AlertTriangle } from 'lucide-react';

export default function CirculationTab({ allLoans, filterOverdue, setFilterOverdue }) {
  const loans = filterOverdue ? allLoans.filter(l => l.is_overdue) : allLoans;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-medium text-ink">Active Loans ({allLoans.length})</h2>
          <p className="mt-0.5 text-sm text-muted max-w-2xl">
            Every book currently with a student. A return appears under Return Requests once the student raises it.
          </p>
        </div>

        <div className="flex items-center gap-4 text-sm whitespace-nowrap shrink-0">
          <button
            onClick={() => setFilterOverdue(false)}
            className={`transition-colors ${!filterOverdue ? 'text-ink font-medium' : 'text-muted hover:text-ink'}`}
          >
            All Loans ({allLoans.length})
          </button>
          <button
            onClick={() => setFilterOverdue(true)}
            className={`transition-colors ${filterOverdue ? 'text-danger font-medium' : 'text-muted hover:text-ink'}`}
          >
            Overdue Only ({allLoans.filter(l => l.is_overdue).length})
          </button>
        </div>
      </div>

      <div className="overflow-x-auto border border-line rounded-lg">
        <table className="w-full text-left text-sm">
          <thead className="text-xs text-muted border-b border-line [&_th]:font-normal">
            <tr>
              <th className="py-3 px-4">Title / Author</th>
              <th className="py-3 px-4">Borrowing Patron (Roll No)</th>
              <th className="py-3 px-4">Copy Code</th>
              <th className="py-3 px-4">Shelf Location</th>
              <th className="py-3 px-4">Channel</th>
              <th className="py-3 px-4">Due Date &amp; Status</th>
              <th className="py-3 px-4 text-right">Return</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line text-body">
            {loans.length === 0 ? (
              <tr>
                <td colSpan="7" className="py-12 text-center text-muted">
                  No active loans matching criteria.
                </td>
              </tr>
            ) : (
              loans.map((loan) => {
                const isOverdue = loan.is_overdue;
                const isAutoFulfill = loan.issued_via === 'Waitlist Auto-Fulfill';

                return (
                  <tr key={loan.loan_id}>
                    <td className="py-3 px-4">
                      <div className="text-ink line-clamp-1">{loan.title}</div>
                      <div className="text-xs text-muted">{loan.author}</div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="text-ink">
                        {loan.user_name}
                        <span className="ml-1.5 text-xs text-muted">{loan.user_enrollment_no}</span>
                      </div>
                      <div className="text-xs text-muted">{loan.user_email}</div>
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      <div>{loan.barcode}</div>
                      <div className="text-xs text-muted">Issued {loan.condition_at_issue}</div>
                    </td>

                    <td className="py-3 px-4 text-xs text-muted">{loan.shelf_location}</td>

                    <td className="py-3 px-4 text-xs whitespace-nowrap">
                      {isAutoFulfill ? <span className="text-body">Auto-Fulfilled</span> : <span className="text-muted">Direct Checkout</span>}
                    </td>

                    <td className="py-3 px-4 text-xs">
                      {isOverdue ? (
                        <div className="inline-flex items-center gap-1 font-medium text-danger">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                          Overdue ({loan.days_overdue}d) • ₹{loan.accrued_fine.toFixed(2)} Fine
                        </div>
                      ) : (
                        <div>Due in {loan.days_remaining}d ({loan.due_date.slice(0, 10)})</div>
                      )}
                    </td>

                    <td className="py-3 px-4 text-right text-xs whitespace-nowrap">
                      {loan.return_request_id
                        ? <span className="font-medium text-ink">Requested</span>
                        : <span className="text-muted">Not requested</span>}
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
