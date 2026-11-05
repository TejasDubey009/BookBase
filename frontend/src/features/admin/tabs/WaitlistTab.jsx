
export default function WaitlistTab({ waitlistQueue }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-medium text-ink">
            Active CSBS Course Reservations ({waitlistQueue.length} Pending Holds)
          </h2>
          <p className="mt-0.5 text-sm text-muted">
            FIFO reservation queue. Physical returns automatically allocate to the #1 student waiting in line.
          </p>
        </div>
      </div>

      <div className="overflow-x-auto border border-line rounded-lg">
        <table className="w-full text-left text-sm">
          <thead className="text-xs text-muted border-b border-line [&_th]:font-normal">
            <tr>
              <th className="py-3 px-4">Queue Pos</th>
              <th className="py-3 px-4">Book Title</th>
              <th className="py-3 px-4">Patron Name &amp; Roll No</th>
              <th className="py-3 px-4">Joined Timestamp</th>
              <th className="py-3 px-4">Dispatch Priority</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line text-body">
            {waitlistQueue.length === 0 ? (
              <tr>
                <td colSpan="5" className="py-10 text-center text-muted">
                  Zero patrons waiting in queue across all titles.
                </td>
              </tr>
            ) : (
              waitlistQueue.map((w) => {
                const isFirst = w.queue_position === 1;
                return (
                  <tr key={w.reservation_id}>
                    <td className="py-3 px-4">
                      <span className="text-ink tabular-nums">
                        #{w.queue_position}
                      </span>
                    </td>

                    <td className="py-3 px-4 font-medium text-ink">
                      {w.book_title}
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-medium text-ink flex items-center gap-1.5">
                        <span>{w.user_name}</span>
                        <span className="text-xs font-normal text-muted">
                          {w.user_enrollment_no}
                        </span>
                      </div>
                      <div className="text-xs text-muted">{w.user_email}</div>
                    </td>

                    <td className="py-3 px-4 text-xs text-muted">
                      {new Date(w.created_at).toLocaleString()}
                    </td>

                    <td className="py-3 px-4">
                      {isFirst ? (
                        <span className="text-xs text-ink">
                          Next Copy Auto-Assigns
                        </span>
                      ) : (
                        <span className="text-xs text-muted">
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
