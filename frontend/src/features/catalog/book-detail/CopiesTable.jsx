import { Barcode, CheckCircle2, Clock } from 'lucide-react';

export default function CopiesTable({ book }) {
  return (
    <div className="border border-slate-200/80 rounded-2xl overflow-hidden bg-slate-50/50">
      <div className="px-4 py-3 bg-white border-b border-slate-200/80 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Barcode className="w-4 h-4 text-indigo-600" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
            Shelf Copies &amp; Accession Details
          </h3>
        </div>
        <span className="text-[11px] text-slate-500 font-mono">
          Accession Records
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-100/75 text-slate-600 font-semibold border-b border-slate-200/60">
            <tr>
              <th className="py-2.5 px-4">Copy ID</th>
              <th className="py-2.5 px-4">Barcode</th>
              <th className="py-2.5 px-4">Shelf Location</th>
              <th className="py-2.5 px-4">Condition</th>
              <th className="py-2.5 px-4">Status</th>
              <th className="py-2.5 px-4">Borrower / Due Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200/60 bg-white font-mono">
            {book.copies && book.copies.length > 0 ? (
              book.copies.map((copy) => {
                const isIssued = copy.status === 'Issued';
                const isAvailable = copy.status === 'Available';
                return (
                  <tr key={copy.copy_id} className="hover:bg-slate-50/80">
                    <td className="py-2.5 px-4 text-slate-500">#{copy.copy_id}</td>
                    <td className="py-2.5 px-4 font-semibold text-slate-800">{copy.barcode}</td>
                    <td className="py-2.5 px-4 font-sans text-slate-600">{copy.shelf_location}</td>
                    <td className="py-2.5 px-4 font-sans">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px]">
                        {copy.condition}
                      </span>
                    </td>
                    <td className="py-2.5 px-4">
                      {isAvailable ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-semibold border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                          Available
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 text-[10px] font-semibold border border-amber-200">
                          <Clock className="w-3 h-3 text-amber-500" />
                          Issued
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 font-sans text-slate-600">
                      {isIssued && copy.current_due_date ? (
                        <span className="text-[11px]">
                          {copy.current_borrower_name} • Due: {copy.current_due_date.slice(0, 10)}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">Ready on shelf</span>
                      )}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="6" className="py-4 text-center text-slate-400">
                  No physical copies registered for this title.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
