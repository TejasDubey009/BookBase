
export default function WaitlistLineup({ book, currentUser }) {
  return (
    <div className="border border-line rounded-lg overflow-hidden bg-white">
      <div className="px-4 py-3 border-b border-line flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium text-ink">
            Active Course Reservations Queue ({book.waitlist_entries?.length || 0})
          </h3>
        </div>
        <span className="text-xs text-body">
          FIFO Dispatch
        </span>
      </div>

      {book.waitlist_entries && book.waitlist_entries.length > 0 ? (
        <div className="p-4 space-y-2">
          {book.waitlist_entries.map((w) => {
            const isFirst = w.queue_position === 1;
            const isCurrentUser = Boolean(currentUser) && currentUser.user_id === w.user_id;

            return (
              <div
                key={w.reservation_id}
                className={`p-2.5 rounded border flex items-center justify-between text-xs ${
                  isCurrentUser
                    ? 'border-field font-medium'
                    : 'border-line'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center font-medium text-xs ${
                    'bg-shelf text-ink'
                  }`}>
                    #{w.queue_position}
                  </span>
                  <div>
                    <span className="text-ink">{w.user_name || 'Reserved'}</span>
                    {isCurrentUser && (
                      <span className="ml-1.5 text-xs font-normal text-muted">
                        You
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-xs text-muted">
                  {isFirst ? (
                    <span className="text-ink">
                      Next Available Copy
                    </span>
                  ) : (
                    <span>Position #{w.queue_position}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="py-6 text-center text-xs text-muted font-medium">
          Waitlist queue is empty. No patrons currently waiting for this title.
        </div>
      )}
    </div>
  );
}
