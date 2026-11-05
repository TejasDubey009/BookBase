import { useState } from 'react';

function ReturnRow({ request, conditions, busy, onConfirm, onReject }) {
  const [condition, setCondition] = useState(request.reported_condition);

  return (
    <tr>
      <td className="py-3 px-4">
        <div className="text-ink line-clamp-1">{request.title}</div>
        <div className="text-xs text-muted">Copy {request.barcode}</div>
      </td>

      <td className="py-3 px-4">
        <div className="text-ink">{request.user_name}</div>
        <div className="text-xs text-muted">{request.user_enrollment_no}</div>
      </td>

      <td className="py-3 px-4 text-xs whitespace-nowrap">{request.created_at.slice(0, 10)}</td>

      <td className="py-3 px-4 text-xs">
        <div>Issued: {request.condition_at_issue}</div>
        <div className={request.reported_condition === request.condition_at_issue ? 'text-muted' : 'text-danger font-medium'}>
          Reported: {request.reported_condition}
        </div>
        {request.notes && <div className="mt-0.5 text-muted">{request.notes}</div>}
      </td>

      <td className="py-3 px-4 text-xs tabular-nums whitespace-nowrap">
        {request.fine_if_confirmed > 0
          ? <span className="font-medium text-danger">₹{request.fine_if_confirmed.toFixed(2)}</span>
          : <span className="text-muted">None</span>}
      </td>

      <td className="py-3 px-4">
        <div className="flex items-center justify-end gap-2">
          <select
            aria-label={`Condition of copy ${request.barcode}`}
            value={condition}
            onChange={(e) => setCondition(e.target.value)}
            className="h-7 px-1.5 rounded border border-field bg-white text-xs text-ink"
          >
            {conditions.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
          <button
            disabled={busy}
            onClick={() => onConfirm(request.return_request_id, condition)}
            className="px-2.5 py-1 rounded bg-accent hover:bg-accent-hover text-white text-xs font-medium whitespace-nowrap transition-colors disabled:opacity-50"
          >
            Confirm Return
          </button>
          <button
            disabled={busy}
            onClick={() => onReject(request.return_request_id, request.title)}
            className="px-2.5 py-1 rounded border border-field text-xs text-body hover:bg-shelf transition-colors disabled:opacity-50"
          >
            Reject
          </button>
        </div>
      </td>
    </tr>
  );
}

/** Returns reach the librarian only once a student has raised one at the Library Kiosk. */
export default function ReturnsTab({ returnRequests, policy, busyRequestId, onConfirm, onReject }) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-medium text-ink">Return Requests ({returnRequests.length})</h2>
        <p className="mt-0.5 text-sm text-muted max-w-2xl">
          Raised by students at the Library Kiosk. Check the physical copy, set the condition you see, and confirm.
          The fine stops on the day the student raised the request.
        </p>
      </div>

      <div className="overflow-x-auto border border-line rounded-lg">
        <table className="w-full text-left text-sm">
          <thead className="text-xs text-muted border-b border-line [&_th]:font-normal">
            <tr>
              <th className="py-3 px-4">Book &amp; Copy</th>
              <th className="py-3 px-4">Student</th>
              <th className="py-3 px-4">Raised</th>
              <th className="py-3 px-4">Condition</th>
              <th className="py-3 px-4">Fine</th>
              <th className="py-3 px-4 text-right">Condition You See</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line text-body">
            {returnRequests.length === 0 ? (
              <tr>
                <td colSpan="6" className="py-12 text-center text-muted">
                  No return requests are waiting. They appear here when a student raises one.
                </td>
              </tr>
            ) : (
              returnRequests.map((request) => (
                <ReturnRow
                  key={request.return_request_id}
                  request={request}
                  conditions={policy.copyConditions}
                  busy={busyRequestId === request.return_request_id}
                  onConfirm={onConfirm}
                  onReject={onReject}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
