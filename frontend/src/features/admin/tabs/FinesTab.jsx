import { CreditCard } from 'lucide-react';

export default function FinesTab({ kpis, students, fineRate, onSettleFine }) {
  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-200/80 bg-slate-50/50 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-rose-600" />
            Student Fines Ledger &amp; Cashier Settlement Desk
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Students with overdue penalties. Fines accumulate at {fineRate} per day after the 14-day loan duration.
          </p>
        </div>
        <div className="text-right">
          <span className="text-xs text-slate-500">Total Uncollected Fines:</span>
          <div className="text-lg font-bold font-mono text-rose-600">
            ₹{(kpis.total_fines || 0).toFixed(2)}
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100/70 text-slate-600 font-semibold border-b border-slate-200/60">
              <tr>
                <th className="py-3 px-4">Student Name</th>
                <th className="py-3 px-4">Enrollment Number</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4">Outstanding Fine</th>
                <th className="py-3 px-4 text-right">Cashier Desk Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-slate-700">
              {students.length === 0 && (
                <tr>
                  <td colSpan="5" className="py-10 text-center text-slate-400 font-sans">
                    No student accounts found.
                  </td>
                </tr>
              )}
              {students.map((stu) => (
                <tr key={stu.user_id} className="hover:bg-slate-50/80">
                  <td className="py-3 px-4 font-sans font-semibold text-slate-900">
                    {stu.full_name}
                  </td>
                  <td className="py-3 px-4 text-indigo-700 font-bold">
                    {stu.enrollment_no}
                  </td>
                  <td className="py-3 px-4 text-slate-500">
                    {stu.email}
                  </td>
                  <td className="py-3 px-4">
                    {stu.outstanding_fines > 0 ? (
                      <span className="font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                        ₹{stu.outstanding_fines.toFixed(2)}
                      </span>
                    ) : (
                      <span className="text-emerald-600 font-semibold">
                        ₹0.00 (No Dues)
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right font-sans">
                    {stu.outstanding_fines > 0 ? (
                      <button
                        onClick={() => onSettleFine(stu.user_id, stu.full_name)}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors"
                      >
                        Collect &amp; Settle Fine
                      </button>
                    ) : (
                      <span className="text-slate-400 text-xs italic">Clear</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
