import { BookPlus } from 'lucide-react';
import RequestStatusBadge from '../../requests/RequestStatusBadge';

export default function RequestsTab({ bookRequests, onUpdateStatus }) {
  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-200/80 flex items-center justify-between bg-slate-50/50">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
            <BookPlus className="w-4 h-4 text-purple-600" />
            Student Curriculum Acquisition Requests ({bookRequests.length})
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Books requested by students when copies are exhausted or new curriculum textbooks are required.
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-100/70 text-slate-600 font-semibold border-b border-slate-200/60">
            <tr>
              <th className="py-3 px-4">Requested Title &amp; Author</th>
              <th className="py-3 px-4">Domain / Category</th>
              <th className="py-3 px-4">Requesting Student (Roll No)</th>
              <th className="py-3 px-4">Student Notes / Justification</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 text-right">Librarian Review Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {bookRequests.length === 0 ? (
              <tr>
                <td colSpan="6" className="py-12 text-center text-slate-400 font-sans">
                  No student acquisition requests submitted yet.
                </td>
              </tr>
            ) : (
              bookRequests.map((req) => (
                <tr key={req.request_id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-4">
                    <div className="font-bold text-slate-900">{req.title}</div>
                    <div className="text-[11px] text-slate-500">by {req.author}</div>
                  </td>

                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-semibold border border-slate-200">
                      {req.category}
                    </span>
                  </td>

                  <td className="py-3 px-4">
                    <div className="font-semibold text-slate-900">{req.user_name}</div>
                    <div className="text-[10px] font-mono text-indigo-700 font-bold">
                      Roll: {req.user_enrollment_no || req.enrollment_no}
                    </div>
                  </td>

                  <td className="py-3 px-4 max-w-xs">
                    <p className="text-slate-600 text-[11px] italic truncate" title={req.notes}>
                      "{req.notes || 'No notes attached'}"
                    </p>
                  </td>

                  <td className="py-3 px-4">
                    <RequestStatusBadge status={req.status} />
                  </td>

                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {req.status !== 'Approved' && req.status !== 'Procured' && (
                        <button
                          onClick={() => onUpdateStatus(req.request_id, 'Approved')}
                          className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-semibold"
                        >
                          Approve
                        </button>
                      )}
                      {req.status !== 'Procured' && (
                        <button
                          onClick={() => onUpdateStatus(req.request_id, 'Procured')}
                          className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-semibold"
                        >
                          Procure
                        </button>
                      )}
                      {req.status !== 'Rejected' && (
                        <button
                          onClick={() => onUpdateStatus(req.request_id, 'Rejected')}
                          className="px-2 py-1 rounded-lg hover:bg-rose-50 text-rose-600 text-xs"
                        >
                          Reject
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
