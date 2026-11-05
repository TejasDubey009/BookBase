export default function PatronSummaryCard({ user, activeLoansCount, onOpenBookRequest, children }) {
  return (
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
      <div>
        <h1 className="font-serif text-[28px] leading-snug text-ink">{user.full_name}</h1>
        <p className="mt-1 text-sm text-muted">
          {user.enrollment_no && <>Roll: {user.enrollment_no} · </>}
          {user.email}
        </p>
        {children}
      </div>

      <div className="flex items-end flex-wrap gap-x-6 gap-y-3 shrink-0">
        <div>
          <div className="text-xs text-muted">Borrowed Quota</div>
          <div className="mt-0.5 text-sm text-ink tabular-nums">
            {activeLoansCount} / {user.max_books_quota} Books
          </div>
        </div>

        <div>
          <div className="text-xs text-muted">Outstanding Fines</div>
          <div className={`mt-0.5 text-sm tabular-nums ${user.outstanding_fines > 0 ? 'text-danger font-medium' : 'text-ink'}`}>
            ₹{(user.outstanding_fines || 0).toFixed(2)}
          </div>
        </div>

        <button
          onClick={onOpenBookRequest}
          className="px-3 py-1.5 rounded border border-field text-sm text-body hover:bg-shelf whitespace-nowrap transition-colors"
        >
          Request New Book
        </button>
      </div>
    </div>
  );
}
