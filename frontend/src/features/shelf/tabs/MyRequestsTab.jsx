import { BookPlus } from 'lucide-react';
import RequestStatusBadge from '../../requests/RequestStatusBadge';

export default function MyRequestsTab({ bookRequests, onOpenBookRequest }) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <BookPlus className="w-5 h-5 text-purple-600" />
            My Curriculum Acquisition Requests
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Track status updates on book requests submitted to library administration.
          </p>
        </div>
        <button
          onClick={onOpenBookRequest}
          className="px-4 py-2 rounded-xl bg-indigo-900 hover:bg-indigo-800 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 self-start sm:self-auto"
        >
          <BookPlus className="w-4 h-4" />
          <span>Submit New Request</span>
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200/80 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200/60">
              <tr>
                <th className="py-3 px-4">Requested Title &amp; Author</th>
                <th className="py-3 px-4">Domain</th>
                <th className="py-3 px-4">Submitted Date</th>
                <th className="py-3 px-4">Notes</th>
                <th className="py-3 px-4 text-right">Acquisition Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {bookRequests.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-10 text-center text-slate-400 font-sans">
                    You have not submitted any book acquisition requests yet.
                  </td>
                </tr>
              ) : (
                bookRequests.map((req) => (
                  <tr key={req.request_id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-sans">
                      <div className="font-semibold text-slate-900">{req.title}</div>
                      <div className="text-[11px] text-slate-500">by {req.author}</div>
                    </td>
                    <td className="py-3 px-4 font-sans text-slate-600">
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-semibold border border-slate-200">
                        {req.category}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-500">
                      {req.created_at?.slice(0, 10)}
                    </td>
                    <td className="py-3 px-4 italic text-slate-500 max-w-xs truncate">
                      "{req.notes || 'None'}"
                    </td>
                    <td className="py-3 px-4 text-right">
                      <RequestStatusBadge status={req.status} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
