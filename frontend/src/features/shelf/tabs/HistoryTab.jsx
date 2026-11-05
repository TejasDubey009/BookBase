export default function HistoryTab({ history }) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-medium text-ink">
          Borrowing &amp; Return History
        </h2>
        <p className="mt-0.5 text-sm text-muted">
          Historical circulation log with audit timestamps and fines assessed.
        </p>
      </div>

      <div className="border border-line rounded-lg overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-xs text-muted border-b border-line [&_th]:font-normal">
            <tr>
              <th className="py-3 px-4">Title</th>
              <th className="py-3 px-4">Copy Barcode</th>
              <th className="py-3 px-4">Issue Date</th>
              <th className="py-3 px-4">Return Date</th>
              <th className="py-3 px-4">Fine Assessed</th>
              <th className="py-3 px-4">Channel</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line text-body">
            {history.map((h) => (
              <tr key={h.loan_id}>
                <td className="py-3 px-4 font-medium text-ink">{h.title}</td>
                <td className="py-3 px-4 text-muted font-medium">{h.barcode}</td>
                <td className="py-3 px-4 text-muted">{h.issue_date.slice(0, 10)}</td>
                <td className="py-3 px-4 text-body">{h.return_date?.slice(0, 10) || '-'}</td>
                <td className="py-3 px-4">
                  {h.fine_assessed > 0 ? (
                    <span className="text-danger font-medium">₹{h.fine_assessed.toFixed(2)}</span>
                  ) : (
                    <span className="text-muted">₹0.00</span>
                  )}
                </td>
                <td className="py-3 px-4 text-xs text-muted">{h.issued_via}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
