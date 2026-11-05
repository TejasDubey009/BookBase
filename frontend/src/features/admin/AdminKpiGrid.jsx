function Kpi({ label, value, note, className = '' }) {
  return (
    <div className={`bg-white p-4 ${className}`}>
      <div className="text-xs text-muted">{label}</div>
      <div className="mt-1 text-2xl font-medium text-ink tabular-nums">{value}</div>
      <div className="mt-0.5 text-xs text-muted">{note}</div>
    </div>
  );
}

/** One joined strip of figures: the 1px gaps show the background as hairline dividers. */
export default function AdminKpiGrid({ kpis, requestsCount, pendingRequestsCount, fineRate }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-px bg-line border border-line rounded-lg overflow-hidden">
      <Kpi label="Curriculum Titles" value={kpis.total_titles || 0} note="3NF Normalized IP" />
      <Kpi
        label="Physical Copies"
        value={kpis.physical_copies || 0}
        note={`${kpis.available_copies || 0} Available on shelf`}
      />
      <Kpi label="Active Loans" value={kpis.active_loans || 0} note="Checked out to students" />
      <Kpi label="Acquisition Requests" value={requestsCount} note={`${pendingRequestsCount} Pending review`} />
      <Kpi
        className="col-span-2 lg:col-span-1"
        label="Assessed Fines"
        value={`₹${(kpis.total_fines || 0).toFixed(2)}`}
        note={`${fineRate}/day retention rate`}
      />
    </div>
  );
}
