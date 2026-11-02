import React, { useEffect, useState } from 'react';
import { 
  BookOpen, 
  Clock, 
  Calendar, 
  Barcode, 
  MapPin, 
  AlertTriangle, 
  CheckCircle2, 
  Zap, 
  RotateCcw,
  History,
  Layers,
  User
} from 'lucide-react';
import { api } from '../api';
import BookCover from '../components/BookCover';

export default function MemberShelfView({
  currentUser,
  onReturnBook,
  onCancelWaitlist,
  onSelectBook,
  loadingActionId,
  showToast
}) {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = () => {
    if (!currentUser) return;
    setLoading(true);
    api.getUserDashboard(currentUser.user_id)
      .then((data) => {
        setDashboard(data);
        setLoading(false);
      })
      .catch((err) => {
        showToast({ type: 'error', message: err.message });
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchDashboard();
  }, [currentUser]);

  if (loading && !dashboard) {
    return (
      <div className="py-24 text-center">
        <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 animate-spin mb-3">
          <Layers className="w-5 h-5" />
        </div>
        <p className="text-sm text-slate-500 font-medium">Loading patron shelf and queue records...</p>
      </div>
    );
  }

  const activeLoans = dashboard?.active_loans || [];
  const waitlists = dashboard?.active_waitlists || [];
  const history = dashboard?.loan_history || [];
  const user = dashboard?.user || currentUser;

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      
      {/* Patron Summary Card */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xl font-mono">
            {user.full_name.charAt(0)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-slate-900">
                {user.full_name}
              </h1>
              <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200/60 font-mono">
                Patron ID #{user.user_id}
              </span>
            </div>
            <p className="text-xs text-slate-500 font-mono mt-0.5">{user.email}</p>
          </div>
        </div>

        {/* Quota & Fines Bento Pills */}
        <div className="flex items-center flex-wrap gap-4">
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 min-w-[140px]">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
              Active Quota
            </div>
            <div className="text-base font-bold text-slate-900 font-mono flex items-center gap-1.5">
              <span>{activeLoans.length}</span>
              <span className="text-xs font-normal text-slate-400">/ {user.max_books_quota} Books</span>
            </div>
          </div>

          <div className={`p-3.5 rounded-2xl border min-w-[140px] ${
            user.outstanding_fines > 0 
              ? 'bg-rose-50/70 border-rose-200 text-rose-900' 
              : 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
          }`}>
            <div className="text-[11px] font-semibold uppercase tracking-wider opacity-75 mb-1">
              Outstanding Fines
            </div>
            <div className="text-base font-bold font-mono">
              ₹{user.outstanding_fines.toFixed(2)}
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 1: Active Borrowed Loans */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-indigo-600" />
              Currently Borrowed Books
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Physical copies currently checked out to your student account. Please ensure returns within the 14-day renewal period.
            </p>
          </div>
          <span className="text-xs font-mono font-medium text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
            {activeLoans.length} Active Loans
          </span>
        </div>

        {activeLoans.length === 0 ? (
          <div className="py-12 text-center bg-white rounded-3xl border border-dashed border-slate-300 p-8">
            <BookOpen className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <h3 className="text-sm font-semibold text-slate-800">No books currently borrowed</h3>
            <p className="text-xs text-slate-500 mt-1">Browse the library catalog to borrow an available title.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {activeLoans.map((loan) => {
              const isOverdue = loan.is_overdue;
              const isAutoFulfill = loan.issued_via === 'Waitlist Auto-Fulfill';
              const isLoading = loadingActionId === loan.loan_id;

              return (
                <div 
                  key={loan.loan_id}
                  className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-all space-y-4"
                >
                  <div className="flex gap-4">
                    <div 
                      onClick={() => onSelectBook({ book_id: loan.book_id })}
                      className="w-20 h-28 rounded-lg shadow-sm overflow-hidden bg-slate-100 flex-shrink-0 cursor-pointer hover:opacity-90 transition-opacity"
                    >
                      <BookCover book={loan} className="w-full h-full" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 
                        onClick={() => onSelectBook({ book_id: loan.book_id })}
                        className="font-bold text-sm text-slate-900 leading-snug line-clamp-2 hover:text-indigo-600 cursor-pointer"
                        title={loan.title}
                      >
                        {loan.title}
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5 truncate">
                        by {loan.author}
                      </p>

                      {/* Barcode & Shelf */}
                      <div className="mt-2.5 space-y-1 font-mono text-[11px] text-slate-600">
                        <div className="flex items-center gap-1.5">
                          <Barcode className="w-3.5 h-3.5 text-indigo-500" />
                          <span className="font-semibold text-slate-800">{loan.barcode}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-500">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          <span className="truncate">{loan.shelf_location}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Badges: Issue Method & Due Date */}
                  <div className="pt-3 border-t border-slate-100 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      {isAutoFulfill ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200/80 font-mono text-[10px] font-semibold">
                          <Zap className="w-3 h-3 text-amber-600" />
                          Auto-Issued from Queue #1
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-500 font-mono">
                          Direct Checkout
                        </span>
                      )}

                      <span className="text-[10px] text-slate-400 font-mono">
                        Loan #{loan.loan_id}
                      </span>
                    </div>

                    <div className={`p-2.5 rounded-xl border text-xs flex items-center justify-between ${
                      isOverdue 
                        ? 'bg-rose-50 border-rose-200 text-rose-800' 
                        : 'bg-slate-50 border-slate-200 text-slate-700'
                    }`}>
                      <div className="flex items-center gap-1.5">
                        {isOverdue ? (
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                        ) : (
                          <Calendar className="w-3.5 h-3.5 text-slate-500" />
                        )}
                        <span className="font-medium">
                          {isOverdue 
                            ? `Overdue (${Math.abs(loan.days_remaining)}d) • ₹${(Math.abs(loan.days_remaining) * 2).toFixed(2)} Fine` 
                            : `Due in ${loan.days_remaining} days`}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-500">
                        {loan.due_date.slice(0, 10)}
                      </span>
                    </div>

                    {/* Return Action Button */}
                    <button
                      disabled={isLoading}
                      onClick={() => onReturnBook(loan.loan_id).then(fetchDashboard)}
                      className="w-full py-2 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200/80 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{isLoading ? 'Processing Return...' : 'Return Book to Library'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* SECTION 2: Active FIFO Waitlist Queue */}
      <div className="space-y-4 pt-4 border-t border-slate-200">
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
            {waitlists.map((res) => {
              const isFirst = res.queue_position === 1;
              return (
                <div
                  key={res.reservation_id}
                  className={`bg-white rounded-2xl border p-5 shadow-xs flex flex-col justify-between space-y-4 ${
                    isFirst ? 'border-amber-300 ring-2 ring-amber-400/20' : 'border-slate-200/80'
                  }`}
                >
                  <div className="flex gap-4">
                    <div 
                      onClick={() => onSelectBook({ book_id: res.book_id })}
                      className="w-18 h-26 rounded-lg shadow-sm overflow-hidden bg-slate-100 flex-shrink-0 cursor-pointer"
                    >
                      <img
                        src={res.cover_url}
                        alt={res.title}
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = `https://placehold.co/300x450/4f46e5/ffffff?text=${encodeURIComponent(res.title.slice(0, 15))}`;
                        }}
                        className="w-full h-full object-cover"
                      />
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

                      {/* Monospace ISBN */}
                      <div className="mt-2 text-[11px] font-mono text-slate-500">
                        ISBN {res.isbn}
                      </div>
                    </div>
                  </div>

                  {/* Queue Position Card */}
                  <div className="pt-3 border-t border-slate-100 space-y-2">
                    <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-200 text-amber-900 flex items-center justify-between">
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
                      className="w-full py-1.5 px-3 rounded-lg text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 text-xs font-medium transition-colors"
                    >
                      Cancel Reservation
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* SECTION 3: Past Borrowing History */}
      {history.length > 0 && (
        <div className="space-y-4 pt-4 border-t border-slate-200">
          <div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <History className="w-5 h-5 text-slate-600" />
              Borrowing &amp; Return History
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Historical circulation log with audit timestamps and fines assessed.
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200/60">
                <tr>
                  <th className="py-2.5 px-4">Title</th>
                  <th className="py-2.5 px-4">Copy Barcode</th>
                  <th className="py-2.5 px-4">Issue Date</th>
                  <th className="py-2.5 px-4">Return Date</th>
                  <th className="py-2.5 px-4">Fine Assessed</th>
                  <th className="py-2.5 px-4">Channel</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-slate-700">
                {history.map((h) => (
                  <tr key={h.loan_id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-4 font-sans font-medium text-slate-900">{h.title}</td>
                    <td className="py-2.5 px-4 text-indigo-600">{h.barcode}</td>
                    <td className="py-2.5 px-4 text-slate-500">{h.issue_date.slice(0, 10)}</td>
                    <td className="py-2.5 px-4 text-emerald-700">{h.return_date?.slice(0, 10) || '-'}</td>
                    <td className="py-2.5 px-4">
                      {h.fine_assessed > 0 ? (
                        <span className="text-rose-600 font-bold">₹{h.fine_assessed.toFixed(2)}</span>
                      ) : (
                        <span className="text-slate-400">₹0.00</span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 font-sans text-[11px] text-slate-500">{h.issued_via}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}

