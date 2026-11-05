import { History } from 'lucide-react';

export default function HistoryTab({ history }) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <History className="w-5 h-5 text-slate-600" />
          Borrowing &amp; Return History
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Historical circulation log with audit timestamps and fines assessed.
        </p>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200/80 overflow-hidden shadow-xs">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200/60">
            <tr>
              <th className="py-3 px-4">Title</th>
              <th className="py-3 px-4">Copy Barcode</th>
              <th className="py-3 px-4">Issue Date</th>
              <th className="py-3 px-4">Return Date</th>
              <th className="py-3 px-4">Fine Assessed</th>
              <th className="py-3 px-4">Channel</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-mono text-slate-700">
            {history.map((h) => (
              <tr key={h.loan_id} className="hover:bg-slate-50">
                <td className="py-3 px-4 font-sans font-medium text-slate-900">{h.title}</td>
                <td className="py-3 px-4 text-indigo-600 font-bold">{h.barcode}</td>
                <td className="py-3 px-4 text-slate-500">{h.issue_date.slice(0, 10)}</td>
                <td className="py-3 px-4 text-emerald-700">{h.return_date?.slice(0, 10) || '-'}</td>
                <td className="py-3 px-4">
                  {h.fine_assessed > 0 ? (
                    <span className="text-rose-600 font-bold">₹{h.fine_assessed.toFixed(2)}</span>
                  ) : (
                    <span className="text-slate-400">₹0.00</span>
                  )}
                </td>
                <td className="py-3 px-4 font-sans text-[11px] text-slate-500">{h.issued_via}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
