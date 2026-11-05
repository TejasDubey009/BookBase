import { Clock } from 'lucide-react';
import BookCover from '../../../components/books/BookCover';

function ReservationCard({ res, onSelectBook, onCancelWaitlist, fetchDashboard }) {
  const isFirst = res.queue_position === 1;

  return (
    <div
      className={`bg-white rounded-3xl border p-5 shadow-xs flex flex-col justify-between space-y-4 ${
        isFirst ? 'border-amber-300 ring-2 ring-amber-400/20' : 'border-slate-200/80'
      }`}
    >
      <div className="flex gap-4">
        <div
          onClick={() => onSelectBook({ book_id: res.book_id })}
          className="w-18 h-26 rounded-lg shadow-sm overflow-hidden bg-slate-100 flex-shrink-0 cursor-pointer"
        >
          <BookCover book={res} className="w-full h-full" />
        </div>

        <div className="flex-1 min-w-0">
          <h3
            onClick={() => onSelectBook({ book_id: res.book_id })}
            className="font-bold text-sm text-slate-900 leading-snug line-clamp-2 hover:text-indigo-600 cursor-pointer"
          >
            {res.title}
          </h3>
          <p className="text-xs text-slate-500 mt-0.5 truncate">
            by {res.author}
          </p>

          <div className="mt-2 text-[11px] font-mono text-slate-500">
            ISBN {res.isbn}
          </div>
        </div>
      </div>

      <div className="pt-3 border-t border-slate-100 space-y-2">
        <div className="p-3 rounded-2xl bg-amber-50/80 border border-amber-200 text-amber-900 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-full bg-amber-200 text-amber-900 font-mono font-bold text-xs flex items-center justify-center">
              #{res.queue_position}
            </span>
            <div>
              <div className="text-xs font-bold">
                {isFirst ? 'You are Queue #1' : `Position #${res.queue_position}`}
              </div>
              <div className="text-[10px] text-amber-700">
                {isFirst ? '⚡ Next copy auto-assigns to you!' : `${res.total_waiting} total patrons waiting`}
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={() => onCancelWaitlist(res.reservation_id).then(fetchDashboard)}
          className="w-full py-1.5 px-3 rounded-xl text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 text-xs font-medium transition-colors"
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-600" />
            Active Course Reservations
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Automated reservation queue. Once a checked-out copy is returned, it will be allocated directly to your student account.
          </p>
        </div>
        <span className="text-xs font-mono font-medium text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">
          {waitlists.length} Waiting
        </span>
      </div>

      {waitlists.length === 0 ? (
        <div className="py-10 text-center bg-white rounded-3xl border border-dashed border-slate-300 p-8">
          <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <h3 className="text-sm font-semibold text-slate-800">You are not waiting for any books</h3>
          <p className="text-xs text-slate-500 mt-1">If a title is fully loaned out, you can join its waitlist from the catalog.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
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
