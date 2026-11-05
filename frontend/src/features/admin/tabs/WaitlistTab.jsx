import { Clock, Zap } from 'lucide-react';

export default function WaitlistTab({ waitlistQueue }) {
  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-200/80 flex items-center justify-between bg-slate-50/50">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-600" />
            Active CSBS Course Reservations ({waitlistQueue.length} Pending Holds)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            FIFO reservation queue. Physical returns automatically allocate to the #1 student waiting in line.
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-100/70 text-slate-600 font-semibold border-b border-slate-200/60">
            <tr>
              <th className="py-3 px-4">Queue Pos</th>
              <th className="py-3 px-4">Book Title</th>
              <th className="py-3 px-4">Patron Name &amp; Roll No</th>
              <th className="py-3 px-4">Joined Timestamp</th>
              <th className="py-3 px-4">Dispatch Priority</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-mono text-slate-700">
            {waitlistQueue.length === 0 ? (
              <tr>
                <td colSpan="5" className="py-10 text-center text-slate-400 font-sans">
                  Zero patrons waiting in queue across all titles.
                </td>
              </tr>
            ) : (
              waitlistQueue.map((w) => {
                const isFirst = w.queue_position === 1;
                return (
                  <tr key={w.reservation_id} className={`hover:bg-slate-50 ${isFirst ? 'bg-amber-50/30' : ''}`}>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full font-bold text-xs ${
                        isFirst ? 'bg-amber-200 text-amber-900' : 'bg-slate-200 text-slate-700'
                      }`}>
                        #{w.queue_position}
                      </span>
                    </td>

                    <td className="py-3 px-4 font-sans font-semibold text-slate-900">
                      {w.book_title}
                    </td>

                    <td className="py-3 px-4 font-sans">
                      <div className="font-medium text-slate-900 flex items-center gap-1.5">
                        <span>{w.user_name}</span>
                        <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-800 border border-indigo-200">
                          {w.enrollment_no || `ID #${w.user_id}`}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono">{w.user_email}</div>
                    </td>

                    <td className="py-3 px-4 text-slate-500">
                      {new Date(w.created_at).toLocaleString()}
                    </td>

                    <td className="py-3 px-4 font-sans">
                      {isFirst ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-100/80 px-2.5 py-0.5 rounded-full border border-amber-300">
                          <Zap className="w-3.5 h-3.5 text-amber-600" />
                          Next Copy Auto-Assigns
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-500">
                          Waiting in line (#{w.queue_position})
                        </span>
                      )}
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
