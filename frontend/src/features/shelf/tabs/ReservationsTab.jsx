import BookCover from '../../../components/books/BookCover';

function ReservationCard({ res, onSelectBook, onCancelWaitlist, fetchDashboard }) {
  const isFirst = res.queue_position === 1;

  return (
    <div className="p-5 border border-line -ml-px -mt-px flex flex-col justify-between gap-4">
      <div className="flex gap-4">
        <div
          onClick={() => onSelectBook({ book_id: res.book_id })}
          className="w-20 h-28 flex-shrink-0 cursor-pointer"
        >
          <BookCover book={res} className="w-full h-full" />
        </div>

        <div className="flex-1 min-w-0">
          <h3
            onClick={() => onSelectBook({ book_id: res.book_id })}
            className="text-sm text-ink leading-snug line-clamp-2 cursor-pointer hover:underline underline-offset-2"
          >
            {res.title}
          </h3>
          <p className="mt-0.5 text-xs text-muted truncate">by {res.author}</p>
          <p className="mt-2 text-xs text-muted">ISBN {res.isbn}</p>
        </div>
      </div>

      <div className="pt-3 border-t border-line flex items-start justify-between gap-3">
        <div>
          <div className="text-sm text-ink">{isFirst ? 'You are Queue #1' : `Position #${res.queue_position}`}</div>
          <div className="mt-0.5 text-xs text-muted">
            {isFirst ? '⚡ Next copy auto-assigns to you!' : `${res.total_waiting} total patrons waiting`}
          </div>
        </div>
        <button
          onClick={() => onCancelWaitlist(res.reservation_id).then(fetchDashboard)}
          className="px-3 py-1.5 rounded border border-field text-sm text-danger hover:bg-shelf whitespace-nowrap transition-colors"
        >
          Cancel Reservation
        </button>
      </div>
    </div>
  );
}

export default function ReservationsTab({ waitlists, onSelectBook, onCancelWaitlist, fetchDashboard }) {
  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-medium text-ink">Active Course Reservations</h2>
          <p className="mt-0.5 text-sm text-muted">
            Automated reservation queue. Once a checked-out copy is returned, it will be allocated directly to your student account.
          </p>
        </div>
        <span className="text-sm text-muted whitespace-nowrap tabular-nums">{waitlists.length} Waiting</span>
      </div>

      {waitlists.length === 0 ? (
        <div className="py-12 text-center">
          <h3 className="text-sm font-medium text-ink">You are not waiting for any books</h3>
          <p className="mt-1 text-sm text-muted">If a title is fully loaned out, you can join its waitlist from the catalog.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 pl-px pt-px">
          {waitlists.map((res) => (
            <ReservationCard
              key={res.reservation_id}
              res={res}
              onSelectBook={onSelectBook}
              onCancelWaitlist={onCancelWaitlist}
              fetchDashboard={fetchDashboard}
            />
          ))}
        </div>
      )}
    </div>
  );
}
