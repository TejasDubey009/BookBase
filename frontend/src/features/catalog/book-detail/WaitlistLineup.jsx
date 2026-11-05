import { Clock, Zap } from 'lucide-react';

export default function WaitlistLineup({ book, currentUser }) {
  return (
    <div className="border border-slate-200/80 rounded-2xl overflow-hidden bg-white">
      <div className="px-4 py-3 bg-slate-50/70 border-b border-slate-200/80 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-amber-600" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
            Active Course Reservations Queue ({book.waitlist_entries?.length || 0})
          </h3>
        </div>
        <span className="text-[11px] text-amber-800 font-mono">
          FIFO Dispatch
        </span>
      </div>

      {book.waitlist_entries && book.waitlist_entries.length > 0 ? (
        <div className="p-4 space-y-2">
          {book.waitlist_entries.map((w) => {
            const isFirst = w.queue_position === 1;
            const isCurrentUser = currentUser?.user_id === w.user_id;

            return (
              <div
                key={w.reservation_id}
                className={`p-2.5 rounded-xl border flex items-center justify-between text-xs ${
                  isCurrentUser
                    ? 'bg-amber-50 border-amber-300 font-semibold'
                    : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold font-mono text-[11px] ${
                    isFirst ? 'bg-amber-200 text-amber-900' : 'bg-slate-200 text-slate-700'
                  }`}>
                    #{w.queue_position}
                  </span>
                  <div>
                    <span className="text-slate-900">{w.user_name}</span>
                    {isCurrentUser && (
                      <span className="ml-1.5 text-[10px] text-amber-800 font-bold bg-amber-100 px-1.5 py-0.2 rounded">
                        You
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-[11px] text-slate-500 font-mono">
                  {isFirst ? (
                    <span className="text-amber-800 font-bold flex items-center gap-1">
                      <Zap className="w-3 h-3 text-amber-600" />
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
        <div className="py-6 text-center text-xs text-slate-400 font-medium">
          Waitlist queue is empty. No patrons currently waiting for this title.
        </div>
      )}
    </div>
  );
}
