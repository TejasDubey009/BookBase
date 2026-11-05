import RequestStatusBadge from '../../requests/RequestStatusBadge';

export default function RequestsTab({ bookRequests, onUpdateStatus }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-medium text-ink">
            Student Curriculum Acquisition Requests ({bookRequests.length})
          </h2>
          <p className="mt-0.5 text-sm text-muted">
            Books requested by students when copies are exhausted or new curriculum textbooks are required.
          </p>
        </div>
      </div>

      <div className="overflow-x-auto border border-line rounded-lg">
        <table className="w-full text-left text-sm">
          <thead className="text-xs text-muted border-b border-line [&_th]:font-normal">
            <tr>
              <th className="py-3 px-4">Requested Title &amp; Author</th>
              <th className="py-3 px-4">Domain / Category</th>
              <th className="py-3 px-4">Requesting Student (Roll No)</th>
              <th className="py-3 px-4">Student Notes / Justification</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 text-right">Librarian Review Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line text-body">
            {bookRequests.length === 0 ? (
              <tr>
                <td colSpan="6" className="py-12 text-center text-muted">
                  No student acquisition requests submitted yet.
                </td>
              </tr>
            ) : (
              bookRequests.map((req) => (
                <tr key={req.request_id}>
                  <td className="py-3 px-4">
                    <div className="font-medium text-ink">{req.title}</div>
                    <div className="text-xs text-muted">by {req.author}</div>
                  </td>

                  <td className="py-3 px-4">
                    <span className="text-xs text-muted">
                      {req.category}
                    </span>
                  </td>

                  <td className="py-3 px-4">
                    <div className="font-medium text-ink">{req.user_name}</div>
                    <div className="text-xs text-body font-medium">
                      Roll: {req.user_enrollment_no || req.enrollment_no}
                    </div>
                  </td>

                  <td className="py-3 px-4 max-w-[14rem]">
                    <p className="text-body text-xs truncate" title={req.notes}>
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
                          className="px-2.5 py-1 rounded border border-field text-body hover:bg-shelf text-xs font-medium"
                        >
                          Approve
                        </button>
                      )}
                      {req.status !== 'Procured' && (
                        <button
                          onClick={() => onUpdateStatus(req.request_id, 'Procured')}
                          className="px-2.5 py-1 rounded border border-field text-body hover:bg-shelf text-xs font-medium"
                        >
                          Procure
                        </button>
                      )}
                      {req.status !== 'Rejected' && (
                        <button
                          onClick={() => onUpdateStatus(req.request_id, 'Rejected')}
                          className="px-2.5 py-1 rounded border border-field text-danger hover:bg-shelf text-xs"
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
