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
  User,
  Monitor,
  Smartphone,
  BookPlus,
  HelpCircle,
  PhoneCall,
  Mail,
  ShieldCheck,
  Building,
  Info
} from 'lucide-react';
import { api } from '../api';
import BookCover from '../components/BookCover';

export default function MemberShelfView({
  currentUser,
  portal = 'kiosk', // 'kiosk' | 'student'
  onReturnBook,
  onCancelWaitlist,
  onSelectBook,
  onOpenBookRequest,
  loadingActionId,
  showToast
}) {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('loans'); // 'loans' | 'waitlists' | 'requests' | 'helpdesk' | 'history'

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
        <p className="text-sm text-slate-500 font-medium">Loading student shelf, due dates, and circulation records...</p>
      </div>
    );
  }

  const activeLoans = dashboard?.active_loans || [];
  const waitlists = dashboard?.active_waitlists || [];
  const history = dashboard?.loan_history || [];
  const bookRequests = dashboard?.book_requests || [];
  const user = dashboard?.user || currentUser;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      
      {/* Portal Mode Context Banner */}
      {portal === 'kiosk' ? (
        <div className="bg-indigo-900 text-indigo-100 p-4 rounded-2xl flex items-center justify-between border border-indigo-800 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-800 flex items-center justify-center text-white shrink-0">
              <Monitor className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-indigo-200">
                Library Kiosk Desk Mode (On-Premise Terminal)
              </div>
              <div className="text-xs text-indigo-100 font-medium">
                Self-service return station enabled. You can return physical copies directly below.
              </div>
            </div>
          </div>
          <span className="hidden sm:inline-block text-[11px] font-mono bg-indigo-800/80 px-2.5 py-1 rounded-lg border border-indigo-700">
            KIOSK-CIRCULATION-ACTIVE
          </span>
        </div>
      ) : (
        <div className="bg-emerald-900 text-emerald-100 p-4 rounded-2xl flex items-center justify-between border border-emerald-800 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-800 flex items-center justify-center text-white shrink-0">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-emerald-200">
                Student Personal Portal (Remote Access)
              </div>
              <div className="text-xs text-emerald-100 font-medium">
                Remote inquiry portal. Due dates are shown below. Physical returns must be processed at the Central Library Kiosk.
              </div>
            </div>
          </div>
          <span className="hidden sm:inline-block text-[11px] font-mono bg-emerald-800/80 px-2.5 py-1 rounded-lg border border-emerald-700">
            REMOTE-STUDENT-VIEW
          </span>
        </div>
      )}

      {/* Patron Summary Card */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xl font-mono">
            {user.full_name?.charAt(0) || 'U'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-slate-900">
                {user.full_name}
              </h1>
              {user.enrollment_no && (
                <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-800 border border-indigo-200 font-mono">
                  Roll: {user.enrollment_no}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 font-mono mt-0.5">{user.email}</p>
          </div>
        </div>

        {/* Quota & Fines Bento Pills */}
        <div className="flex items-center flex-wrap gap-3">
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 min-w-[130px]">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-0.5">
              Borrowed Quota
            </div>
            <div className="text-base font-bold text-slate-900 font-mono flex items-center gap-1.5">
              <span>{activeLoans.length}</span>
              <span className="text-xs font-normal text-slate-400">/ {user.max_books_quota} Books</span>
            </div>
          </div>

          <div className={`p-3.5 rounded-2xl border min-w-[130px] ${
            user.outstanding_fines > 0 
              ? 'bg-rose-50/70 border-rose-200 text-rose-900' 
              : 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
          }`}>
            <div className="text-[10px] font-semibold uppercase tracking-wider opacity-75 mb-0.5">
              Outstanding Fines
            </div>
            <div className="text-base font-bold font-mono">
              ₹{(user.outstanding_fines || 0).toFixed(2)}
            </div>
          </div>

          <button
            onClick={onOpenBookRequest}
            className="p-3.5 rounded-2xl bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200/80 transition-colors flex items-center gap-2 text-xs font-semibold"
          >
            <BookPlus className="w-4 h-4 text-indigo-600" />
            <span>Request New Book</span>
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('loans')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
            activeTab === 'loans'
              ? 'bg-indigo-900 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Active Borrowings &amp; Due Dates ({activeLoans.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('waitlists')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
            activeTab === 'waitlists'
              ? 'bg-indigo-900 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Course Reservations ({waitlists.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('requests')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
            activeTab === 'requests'
              ? 'bg-indigo-900 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <BookPlus className="w-3.5 h-3.5" />
          <span>My Acquisition Requests ({bookRequests.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('helpdesk')}
          id="helpdesk-tab"
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
            activeTab === 'helpdesk'
              ? 'bg-indigo-900 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <HelpCircle className="w-3.5 h-3.5" />
          <span>Library Help Desk</span>
        </button>

        {history.length > 0 && (
          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === 'history'
                ? 'bg-indigo-900 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Circulation History</span>
          </button>
        )}
      </div>

      {/* ========================================================================= */}
      {/* SECTION 1: ACTIVE BORROWINGS & EXACT DUE DATES                            */}
      {/* ========================================================================= */}
      {activeTab === 'loans' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-indigo-600" />
                Active Borrowings &amp; Return Deadlines
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {portal === 'kiosk' 
                  ? 'Self-service physical return station. Click Return to deposit copy.' 
                  : 'Track your loan countdowns and return deadlines. Returns must be dropped off at the Library Kiosk.'}
              </p>
            </div>
            <span className="text-xs font-mono font-medium text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
              {activeLoans.length} Borrowed
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
                    className={`bg-white rounded-3xl border p-5 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-all space-y-4 ${
                      isOverdue ? 'border-rose-300 ring-2 ring-rose-500/10' : 'border-slate-200/80'
                    }`}
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

                      {/* DUE DATE CARD */}
                      <div className={`p-3 rounded-2xl border text-xs flex items-center justify-between ${
                        isOverdue 
                          ? 'bg-rose-50 border-rose-200 text-rose-800' 
                          : 'bg-slate-50 border-slate-200 text-slate-700'
                      }`}>
                        <div className="flex items-center gap-1.5">
                          {isOverdue ? (
                            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                          ) : (
                            <Calendar className="w-4 h-4 text-indigo-600 shrink-0" />
                          )}
                          <div>
                            <div className="font-bold">
                              {isOverdue 
                                ? `Overdue by ${Math.abs(loan.days_remaining)} Days` 
                                : `Due in ${loan.days_remaining} Days`}
                            </div>
                            <div className="text-[10px] opacity-80 font-mono">
                              {isOverdue ? `Accrued fine: ₹${(Math.abs(loan.days_remaining) * 2).toFixed(2)}` : 'On schedule'}
                            </div>
                          </div>
                        </div>
                        <div className="text-right font-mono">
                          <span className="text-[11px] font-bold block">
                            {loan.due_date.slice(0, 10)}
                          </span>
                          <span className="text-[9px] text-slate-400">Target Date</span>
                        </div>
                      </div>

                      {/* CONDITIONAL ACTION BASED ON PORTAL */}
                      {portal === 'kiosk' ? (
                        <button
                          disabled={isLoading}
                          onClick={() => onReturnBook(loan.loan_id).then(fetchDashboard)}
                          className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 shadow-xs"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>{isLoading ? 'Processing Return...' : 'Return Book at Kiosk'}</span>
                        </button>
                      ) : (
                        <div className="p-2.5 rounded-xl bg-slate-100 text-slate-600 text-xs text-center font-medium">
                          <span className="text-[11px]">To return, drop off this physical copy at the Central Library Kiosk.</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 2: ACTIVE COURSE RESERVATIONS (WAITLIST)                           */}
      {/* ========================================================================= */}
      {activeTab === 'waitlists' && (
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
              {waitlists.map((res) => {
                const isFirst = res.queue_position === 1;
                return (
                  <div
                    key={res.reservation_id}
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
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 3: MY BOOK PROCUREMENT REQUESTS                                   */}
      {/* ========================================================================= */}
      {activeTab === 'requests' && (
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
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider font-mono ${
                            req.status === 'Procured'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : req.status === 'Approved'
                              ? 'bg-blue-100 text-blue-800 border border-blue-300'
                              : req.status === 'Rejected'
                              ? 'bg-rose-100 text-rose-800 border border-rose-300'
                              : 'bg-amber-100 text-amber-800 border border-amber-300'
                          }`}>
                            {req.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 4: LIBRARY HELP DESK & CIRCULATION POLICIES                       */}
      {/* ========================================================================= */}
      {activeTab === 'helpdesk' && (
        <div id="helpdesk-section" className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-6">
            <div>
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-indigo-600" />
                Central Library Help Desk &amp; Operating Policies
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Essential circulation rules, operating schedules, fine assessment schedules, and librarian contact.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Card 1: Operating Hours */}
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
                <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs uppercase tracking-wider">
                  <Clock className="w-4 h-4" />
                  <span>Library Working Hours</span>
                </div>
                <div className="space-y-1.5 text-xs text-slate-600">
                  <div className="flex justify-between">
                    <span className="font-medium">Monday – Friday:</span>
                    <span className="font-mono font-bold text-slate-800">8:30 AM – 8:00 PM</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Saturday:</span>
                    <span className="font-mono font-bold text-slate-800">9:00 AM – 5:00 PM</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Sunday &amp; Holidays:</span>
                    <span className="text-rose-600 font-semibold">Closed</span>
                  </div>
                </div>
                <div className="pt-2 border-t border-slate-200 text-[11px] text-slate-500">
                  Drop box accessible 24/7 at East Entrance.
                </div>
              </div>

              {/* Card 2: Circulation Rules */}
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
                <div className="flex items-center gap-2 text-emerald-600 font-bold text-xs uppercase tracking-wider">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Borrowing Policies</span>
                </div>
                <div className="space-y-1.5 text-xs text-slate-600">
                  <div className="flex justify-between">
                    <span>Borrowing Quota:</span>
                    <span className="font-bold text-slate-800">4 Books per Student</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Loan Duration:</span>
                    <span className="font-bold text-slate-800">14 Calendar Days</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Late Return Penalty:</span>
                    <span className="font-mono font-bold text-rose-600">₹2.00 / day / book</span>
                  </div>
                </div>
                <div className="pt-2 border-t border-slate-200 text-[11px] text-slate-500">
                  Fines must be cleared before exam hall tickets.
                </div>
              </div>

              {/* Card 3: Contact Desk */}
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
                <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs uppercase tracking-wider">
                  <PhoneCall className="w-4 h-4" />
                  <span>Contact Information</span>
                </div>
                <div className="space-y-2 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-mono">library@bookbase.in</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <PhoneCall className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-mono">+91 0413 2655 000</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span>2nd Floor, Central Academic Block</span>
                  </div>
                </div>
                <div className="pt-2 border-t border-slate-200 text-[11px] text-slate-500">
                  For missing books, submit an Acquisition Request.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 5: PAST BORROWING HISTORY                                         */}
      {/* ========================================================================= */}
      {activeTab === 'history' && history.length > 0 && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <History className="w-5 h-5 text-slate-600" />
              Borrowing &amp; Return History
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Historical circulation log with audit timestamps and fines assessed.
            </p>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200/80 overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200/60">
                <tr>
                  <th className="py-3 px-4">Title</th>
                  <th className="py-3 px-4">Copy Barcode</th>
                  <th className="py-3 px-4">Issue Date</th>
                  <th className="py-3 px-4">Return Date</th>
                  <th className="py-3 px-4">Fine Assessed</th>
                  <th className="py-3 px-4">Channel</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-slate-700">
                {history.map((h) => (
                  <tr key={h.loan_id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-sans font-medium text-slate-900">{h.title}</td>
                    <td className="py-3 px-4 text-indigo-600 font-bold">{h.barcode}</td>
                    <td className="py-3 px-4 text-slate-500">{h.issue_date.slice(0, 10)}</td>
                    <td className="py-3 px-4 text-emerald-700">{h.return_date?.slice(0, 10) || '-'}</td>
                    <td className="py-3 px-4">
                      {h.fine_assessed > 0 ? (
                        <span className="text-rose-600 font-bold">₹{h.fine_assessed.toFixed(2)}</span>
                      ) : (
                        <span className="text-slate-400">₹0.00</span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-sans text-[11px] text-slate-500">{h.issued_via}</td>
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
