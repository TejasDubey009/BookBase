import RequestStatusBadge from '../../requests/RequestStatusBadge';

export default function MyRequestsTab({ bookRequests, onOpenBookRequest }) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-medium text-ink">
            My Curriculum Acquisition Requests
          </h2>
          <p className="mt-0.5 text-sm text-muted">
            Track status updates on book requests submitted to library administration.
          </p>
        </div>
        <button
          onClick={onOpenBookRequest}
          className="px-3 py-1.5 rounded bg-accent hover:bg-accent-hover text-white text-sm font-medium self-start sm:self-auto"
        >
          <span>Submit New Request</span>
        </button>
      </div>

      <div className="border border-line rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs text-muted border-b border-line [&_th]:font-normal">
              <tr>
                <th className="py-3 px-4">Requested Title &amp; Author</th>
                <th className="py-3 px-4">Domain</th>
                <th className="py-3 px-4">Submitted Date</th>
                <th className="py-3 px-4">Notes</th>
                <th className="py-3 px-4 text-right">Acquisition Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line text-body">
              {bookRequests.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-10 text-center text-muted">
                    You have not submitted any book acquisition requests yet.
                  </td>
                </tr>
              ) : (
                bookRequests.map((req) => (
                  <tr key={req.request_id}>
                    <td className="py-3 px-4">
                      <div className="font-medium text-ink">{req.title}</div>
                      <div className="text-xs text-muted">by {req.author}</div>
                    </td>
                    <td className="py-3 px-4 text-body">
                      <span className="text-xs text-muted">
                        {req.category}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-muted">
                      {req.created_at?.slice(0, 10)}
                    </td>
                    <td className="py-3 px-4 text-muted max-w-xs truncate">
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
