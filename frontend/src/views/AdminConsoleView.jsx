import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Layers, 
  BookOpen, 
  Clock, 
  DollarSign, 
  CheckCircle2, 
  AlertTriangle, 
  RotateCcw, 
  Barcode, 
  User, 
  Plus, 
  RefreshCw,
  Zap,
  Filter
} from 'lucide-react';
import { api } from '../api';

export default function AdminConsoleView({
  onReturnBook,
  onOpenAddBook,
  onResetDemo,
  loadingActionId,
  showToast,
  lastEventTimestamp
}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filterOverdue, setFilterOverdue] = useState(false);

  const fetchOverview = () => {
    setLoading(true);
    api.getAdminOverview()
      .then((res) => {
        setData(res);
        setLoading(false);
      })
      .catch((err) => {
        showToast({ type: 'error', message: err.message });
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchOverview();
  }, [lastEventTimestamp]);

  if (loading && !data) {
    return (
      <div className="py-24 text-center">
        <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 animate-spin mb-3">
          <Layers className="w-5 h-5" />
        </div>
        <p className="text-sm text-slate-500 font-medium">Aggregating library circulation metrics and active loans...</p>
      </div>
    );
  }

  const kpis = data?.kpis || {};
  const allLoans = data?.active_loans || [];
  const loans = filterOverdue ? allLoans.filter(l => l.is_overdue) : allLoans;
  const waitlistQueue = data?.waitlist_queue || [];

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      
      {/* Admin Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-indigo-600" />
            Central Library Circulation Desk
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Active borrowings, return processing, overdue assessments, and course reservation queues.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchOverview}
            className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors"
            title="Refresh Overview"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={onOpenAddBook}
            className="px-4 py-2 rounded-xl bg-indigo-900 hover:bg-indigo-800 text-white text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Add Curriculum Title</span>
          </button>
        </div>
      </div>

      {/* 4 Bento KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {/* KPI 1: Total Titles */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Curriculum Titles</span>
            <BookOpen className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900">{kpis.total_titles || 0}</div>
          <p className="text-[11px] text-slate-500 mt-1">CSBS Prescribed &amp; O'Reilly</p>
        </div>

        {/* KPI 2: Physical Copies */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Physical Copies</span>
            <Layers className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900">{kpis.physical_copies || 0}</div>
          <p className="text-[11px] text-emerald-600 font-medium mt-1">
            {kpis.available_copies || 0} Available on shelf
          </p>
        </div>

        {/* KPI 3: Active Loans */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Active Loans</span>
            <Barcode className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900">{kpis.active_loans || 0}</div>
          <p className="text-[11px] text-slate-500 mt-1">Checked out to students</p>
        </div>

        {/* KPI 4: Waitlist Depth */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Reservations</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900">{kpis.waitlist_queue_depth || 0}</div>
          <p className="text-[11px] text-amber-700 font-medium mt-1">Students in queue</p>
        </div>

        {/* KPI 5: Total Fines */}
        <div className="col-span-2 lg:col-span-1 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Library Fines</span>
            <span className="font-bold text-rose-500 font-mono">₹</span>
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900">₹{(kpis.total_fines || 0).toFixed(2)}</div>
          <p className="text-[11px] text-slate-500 mt-1">₹2.00/day retention rate</p>
        </div>
      </div>

      {/* SECTION 1: Live Circulation Loans Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
              <Barcode className="w-4 h-4 text-indigo-600" />
              Active Circulation Loans ({allLoans.length})
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Process physical copy returns, calculate applicable overdue charges, and allocate to next pending student reservation.
            </p>
          </div>

          <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-medium self-start sm:self-auto">
            <button
              onClick={() => setFilterOverdue(false)}
              className={`px-3 py-1 rounded-lg transition-all ${
                !filterOverdue ? 'bg-white text-slate-900 font-semibold shadow-2xs' : 'text-slate-600'
              }`}
            >
              All Loans ({allLoans.length})
            </button>
            <button
              onClick={() => setFilterOverdue(true)}
              className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1 ${
                filterOverdue ? 'bg-white text-rose-700 font-semibold shadow-2xs' : 'text-slate-600'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
              Overdue Only ({allLoans.filter(l => l.is_overdue).length})
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100/70 text-slate-600 font-semibold border-b border-slate-200/60">
              <tr>
                <th className="py-3 px-4">Title / Author</th>
                <th className="py-3 px-4">Borrowing Patron</th>
                <th className="py-3 px-4">Copy Barcode</th>
                <th className="py-3 px-4">Shelf Location</th>
                <th className="py-3 px-4">Channel</th>
                <th className="py-3 px-4">Due Date &amp; Status</th>
                <th className="py-3 px-4 text-right">Desk Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-slate-700">
              {loans.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-slate-400 font-sans">
                    No active loans matching criteria.
                  </td>
                </tr>
              ) : (
                loans.map((loan) => {
                  const isOverdue = loan.is_overdue;
                  const isAutoFulfill = loan.issued_via === 'Waitlist Auto-Fulfill';
                  const isActionLoading = loadingActionId === loan.loan_id;

                  return (
                    <tr key={loan.loan_id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-sans">
                        <div className="font-semibold text-slate-900 line-clamp-1">{loan.title}</div>
                        <div className="text-[11px] text-slate-500">{loan.author}</div>
                      </td>

                      <td className="py-3 px-4 font-sans">
                        <div className="font-medium text-slate-900">{loan.user_name}</div>
                        <div className="text-[11px] text-slate-500 font-mono">{loan.user_email}</div>
                      </td>

                      <td className="py-3 px-4">
                        <span className="font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200/60">
                          {loan.barcode}
                        </span>
                      </td>

                      <td className="py-3 px-4 font-sans text-slate-600">
                        {loan.shelf_location}
                      </td>

                      <td className="py-3 px-4 font-sans">
                        {isAutoFulfill ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                            <Zap className="w-3 h-3 text-amber-600" />
                            Auto-Fulfilled
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-500">
                            Direct Checkout
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 font-sans">
                        {isOverdue ? (
                          <div className="inline-flex items-center gap-1 text-xs font-semibold text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200">
                            <AlertTriangle className="w-3 h-3 text-rose-600" />
                            Overdue ({Math.abs(loan.days_remaining)}d) • ₹{Math.abs(loan.days_remaining * 2).toFixed(2)} Fine
                          </div>
                        ) : (
                          <div className="text-xs text-slate-600">
                            Due in {loan.days_remaining}d ({loan.due_date.slice(0, 10)})
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <button
                          disabled={isActionLoading}
                          onClick={() => onReturnBook(loan.loan_id).then(fetchOverview)}
                          className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-semibold transition-colors disabled:opacity-50 inline-flex items-center gap-1"
                        >
                          <RotateCcw className="w-3 h-3 text-emerald-600" />
                          <span>{isActionLoading ? 'Processing...' : 'Process Return'}</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION 2: Live FIFO Waitlist Lineup across Library */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200/80 flex items-center justify-between bg-slate-50/50">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-600" />
              Active CSBS Course Reservations ({waitlistQueue.length} Pending Holds)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Course reservation queue. Returns automatically dispatch to the first student waiting in line.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100/70 text-slate-600 font-semibold border-b border-slate-200/60">
              <tr>
                <th className="py-3 px-4">Queue Pos</th>
                <th className="py-3 px-4">Book Title</th>
                <th className="py-3 px-4">Patron Name &amp; Email</th>
                <th className="py-3 px-4">Joined Timestamp</th>
                <th className="py-3 px-4">Dispatch Priority</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-slate-700">
              {waitlistQueue.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-10 text-center text-slate-400 font-sans">
                    Zero patrons waiting in queue across all titles.
                  </td>
                </tr>
              ) : (
                waitlistQueue.map((w) => {
                  const isFirst = w.queue_position === 1;
                  return (
                    <tr key={w.reservation_id} className={`hover:bg-slate-50 ${isFirst ? 'bg-amber-50/30' : ''}`}>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full font-bold text-xs ${
                          isFirst ? 'bg-amber-200 text-amber-900' : 'bg-slate-200 text-slate-700'
                        }`}>
                          #{w.queue_position}
                        </span>
                      </td>

                      <td className="py-3 px-4 font-sans font-semibold text-slate-900">
                        {w.book_title}
                      </td>

                      <td className="py-3 px-4 font-sans">
                        <div className="font-medium text-slate-900">{w.user_name}</div>
                        <div className="text-[11px] text-slate-500 font-mono">{w.user_email}</div>
                      </td>

                      <td className="py-3 px-4 text-slate-500">
                        {new Date(w.created_at).toLocaleString()}
                      </td>

                      <td className="py-3 px-4 font-sans">
                        {isFirst ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-100/80 px-2.5 py-0.5 rounded-full border border-amber-300">
                            <Zap className="w-3.5 h-3.5 text-amber-600" />
                            Next Copy Auto-Assigns
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-500">
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

    </div>
  );
}

