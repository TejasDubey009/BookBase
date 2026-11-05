function Kpi({ label, value, note }) {
  return (
    <div className="bg-white p-4">
      <div className="text-xs text-muted">{label}</div>
      <div className="mt-1 text-2xl font-medium text-ink tabular-nums">{value}</div>
      <div className="mt-0.5 text-xs text-muted">{note}</div>
    </div>
  );
}

/** One joined strip of figures: the 1px gaps show the background as hairline dividers. */
export default function AdminKpiGrid({ kpis, requestsCount, pendingRequestsCount, fineRule }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-6 gap-px bg-line border border-line rounded-lg overflow-hidden">
      <Kpi label="Titles" value={kpis.total_titles || 0} note="In the catalogue" />
      <Kpi
        label="Physical Copies"
        value={kpis.physical_copies || 0}
        note={`${kpis.available_copies || 0} on the shelf`}
      />
      <Kpi label="Active Loans" value={kpis.active_loans || 0} note="With students" />
      <Kpi label="Return Requests" value={kpis.pending_returns_count || 0} note="Waiting for you" />
      <Kpi label="Book Requests" value={requestsCount} note={`${pendingRequestsCount} pending`} />
      <Kpi label="Fines Owed" value={`₹${(kpis.total_fines || 0).toFixed(2)}`} note={fineRule} />
    </div>
  );
}
