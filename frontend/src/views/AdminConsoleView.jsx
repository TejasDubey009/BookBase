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
  Filter,
  Search,
  BookPlus,
  Check,
  X,
  CreditCard,
  Building,
  GraduationCap
} from 'lucide-react';
import { api } from '../api';
import BookCover from '../components/BookCover';

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
  const [activeTab, setActiveTab] = useState('matrix'); // 'matrix' | 'circulation' | 'requests' | 'fines' | 'waitlist'
  
  // Grouped Books Matrix state
  const [groupedBooks, setGroupedBooks] = useState([]);
  const [matrixSearch, setMatrixSearch] = useState('');
  const [matrixLoading, setMatrixLoading] = useState(false);

  // Filter state for circulation desk
  const [filterOverdue, setFilterOverdue] = useState(false);

  const fetchOverview = () => {
    setLoading(true);
    api.getAdminOverview()
      .then((res) => {
        setData(res);
        setGroupedBooks(res.grouped_books || []);
        setLoading(false);
      })
      .catch((err) => {
        showToast({ type: 'error', message: err.message });
        setLoading(false);
      });
  };

  const fetchGroupedBooks = (search) => {
    setMatrixLoading(true);
    api.getGroupedBooks(search)
      .then((res) => {
        setGroupedBooks(res);
        setMatrixLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching grouped books:', err);
        setMatrixLoading(false);
      });
  };

  useEffect(() => {
    fetchOverview();
  }, [lastEventTimestamp]);

  const handleSearchMatrix = (e) => {
    const val = e.target.value;
    setMatrixSearch(val);
    fetchGroupedBooks(val);
  };

  // Status transition for book request
  const handleUpdateStatus = async (requestId, newStatus) => {
    try {
      await api.updateBookRequestStatus(requestId, newStatus);
      showToast({
        type: 'success',
        message: `Request status updated to ${newStatus}.`
      });
      fetchOverview();
    } catch (err) {
      showToast({ type: 'error', message: err.message });
    }
  };

  // Settle fine for user
  const handleSettleFine = async (userId, studentName) => {
    if (!window.confirm(`Settle and clear all outstanding fines for ${studentName}?`)) return;
    try {
      const resp = await api.settleFine(userId);
      showToast({
        type: 'success',
        message: resp.message
      });
      fetchOverview();
    } catch (err) {
      showToast({ type: 'error', message: err.message });
    }
  };

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
  const bookRequests = data?.book_requests || [];
  const pendingRequestsCount = bookRequests.filter(r => r.status === 'Pending').length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      
      {/* Admin Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/90 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 font-mono">
              Portal 2 • Central Administration
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 mt-1 flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-indigo-600" />
            Librarian Circulation &amp; Analytics Console
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Full curriculum catalogue management, student-borrowers correlation matrix, and real-time fine ledgers.
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2">
          <button
            onClick={fetchOverview}
            className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors shadow-2xs"
            title="Refresh Overview"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={onOpenAddBook}
            className="px-4 py-2.5 rounded-xl bg-indigo-900 hover:bg-indigo-800 text-white text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Add Curriculum Title</span>
          </button>
          <button
            onClick={onResetDemo}
            className="px-3 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-medium transition-colors"
            title="Reset system to clean initial demo state"
          >
            Reset Database
          </button>
        </div>
      </div>

      {/* 5 Bento KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {/* KPI 1: Total Titles */}
        <div className="bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Curriculum Titles</span>
            <BookOpen className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900">{kpis.total_titles || 0}</div>
          <p className="text-[10px] text-slate-500 mt-0.5">3NF Normalized IP</p>
        </div>

        {/* KPI 2: Physical Copies */}
        <div className="bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Physical Copies</span>
            <Layers className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900">{kpis.physical_copies || 0}</div>
          <p className="text-[10px] text-emerald-600 font-medium mt-0.5">
            {kpis.available_copies || 0} Available on shelf
          </p>
        </div>

        {/* KPI 3: Active Loans */}
        <div className="bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Active Loans</span>
            <Barcode className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900">{kpis.active_loans || 0}</div>
          <p className="text-[10px] text-slate-500 mt-0.5">Checked out to students</p>
        </div>

        {/* KPI 4: Pending Book Requests */}
        <div className="bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Acquisition Requests</span>
            <BookPlus className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900">{bookRequests.length}</div>
          <p className="text-[10px] text-purple-600 font-medium mt-0.5">
            {pendingRequestsCount} Pending review
          </p>
        </div>

        {/* KPI 5: Total Fines */}
        <div className="col-span-2 sm:col-span-1 bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Assessed Fines</span>
            <span className="font-bold text-rose-500 font-mono">₹</span>
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900">₹{(kpis.total_fines || 0).toFixed(2)}</div>
          <p className="text-[10px] text-slate-500 mt-0.5">₹2.00/day retention rate</p>
        </div>
      </div>

      {/* Admin Sub-Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3 overflow-x-auto">
        <button
          onClick={() => setActiveTab('matrix')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
            activeTab === 'matrix'
              ? 'bg-indigo-900 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Book &amp; Borrowers Matrix (Grouped View)</span>
        </button>

        <button
          onClick={() => setActiveTab('circulation')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
            activeTab === 'circulation'
              ? 'bg-indigo-900 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Barcode className="w-3.5 h-3.5" />
          <span>Active Circulation Loans ({allLoans.length})</span>
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
          <span>Student Book Requests ({bookRequests.length})</span>
          {pendingRequestsCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-amber-400 text-amber-950 font-bold">
              {pendingRequestsCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('fines')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
            activeTab === 'fines'
              ? 'bg-indigo-900 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <CreditCard className="w-3.5 h-3.5" />
          <span>Fines Ledger &amp; Settlement</span>
        </button>

        <button
          onClick={() => setActiveTab('waitlist')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
            activeTab === 'waitlist'
              ? 'bg-indigo-900 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Course Reservations ({waitlistQueue.length})</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: GROUPED TABLE — BOOK TITLE (COL 1) & SEARCHABLE BORROWERS (COL 2)  */}
      {/* ========================================================================= */}
      {activeTab === 'matrix' && (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-6 border-b border-slate-200/80 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-indigo-600" />
                Book Title &amp; Student Borrowers Correlation Matrix
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Primary column displays the curriculum title; secondary column displays the searchable history of all students who have borrowed copies of that title.
              </p>
            </div>

            {/* Matrix Search Filter */}
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Search by Title, Student Name, or Roll No..."
                value={matrixSearch}
                onChange={handleSearchMatrix}
                className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium"
              />
              {matrixSearch && (
                <button
                  onClick={() => {
                    setMatrixSearch('');
                    fetchGroupedBooks('');
                  }}
                  className="absolute right-2.5 top-2.5 text-[11px] text-slate-400 hover:text-slate-600"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100/75 text-slate-700 font-semibold border-b border-slate-200/70">
                <tr>
                  <th className="py-3 px-5 w-2/5">1. Curriculum Book Title &amp; Inventory Status</th>
                  <th className="py-3 px-5 w-3/5">2. Student Borrowers (Searchable List: Active, Overdue &amp; Returned)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {groupedBooks.length === 0 ? (
                  <tr>
                    <td colSpan="2" className="py-12 text-center text-slate-400 font-sans">
                      No books or student borrowers matching "{matrixSearch}".
                    </td>
                  </tr>
                ) : (
                  groupedBooks.map((item) => (
                    <tr key={item.book_id} className="hover:bg-slate-50/70 transition-colors align-top">
                      {/* PRIMARY FIRST COLUMN: BOOK TITLE */}
                      <td className="py-4 px-5">
                        <div className="flex gap-3.5">
                          <div className="w-14 h-20 rounded-lg shadow-2xs overflow-hidden bg-slate-100 shrink-0">
                            <BookCover book={item} className="w-full h-full" />
                          </div>
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                              {item.category}
                            </span>
                            <h3 className="font-bold text-sm text-slate-900 leading-snug mt-1">
                              {item.title}
                            </h3>
                            <p className="text-xs text-slate-500 font-medium">
                              by {item.author} ({item.published_year})
                            </p>
                            <div className="mt-2 text-[11px] font-mono text-slate-500">
                              ISBN: {item.isbn}
                            </div>
                            <div className="mt-2 flex items-center gap-2">
                              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 font-mono">
                                {item.available_copies} / {item.total_copies} Available
                              </span>
                              {item.waitlist_count > 0 && (
                                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 font-mono">
                                  {item.waitlist_count} on Waitlist
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* SECOND COLUMN: SEARCHABLE LIST OF ALL STUDENTS WHO HAVE BORROWED */}
                      <td className="py-4 px-5 bg-slate-50/30">
                        {item.borrowers && item.borrowers.length > 0 ? (
                          <div className="space-y-2.5">
                            {item.borrowers.map((b) => {
                              const isActive = b.status === 'Active';
                              const isOverdue = b.status === 'Overdue';
                              const isReturned = b.status === 'Returned';
                              const isActionLoading = loadingActionId === b.loan_id;

                              return (
                                <div 
                                  key={b.loan_id} 
                                  className={`p-3 rounded-2xl border transition-all ${
                                    isOverdue 
                                      ? 'bg-rose-50/60 border-rose-200' 
                                      : isActive 
                                      ? 'bg-white border-slate-200 shadow-2xs' 
                                      : 'bg-slate-100/60 border-slate-200/80 text-slate-600'
                                  }`}
                                >
                                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                    <div className="flex items-center gap-2.5">
                                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                                        isOverdue 
                                          ? 'bg-rose-600 text-white' 
                                          : isActive 
                                          ? 'bg-indigo-600 text-white' 
                                          : 'bg-slate-300 text-slate-700'
                                      }`}>
                                        {(b.student_name || b.user_name || 'S').charAt(0)}
                                      </div>
                                      <div>
                                        <div className="flex items-center gap-2">
                                          <span className="font-bold text-slate-900">{b.student_name || b.user_name}</span>
                                          <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-800 border border-indigo-200">
                                            Roll: {b.student_enrollment_no || b.enrollment_no}
                                          </span>
                                        </div>
                                        <div className="text-[10px] text-slate-500 font-mono">
                                          {b.student_email || b.user_email}
                                        </div>
                                      </div>
                                    </div>

                                    {/* Status & Barcode Pill */}
                                    <div className="flex items-center gap-2 font-mono text-[11px]">
                                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                                        Copy: {b.barcode}
                                      </span>

                                      {isOverdue && (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 font-bold">
                                          <AlertTriangle className="w-3 h-3 text-rose-600" />
                                          Overdue • ₹{b.fine_assessed.toFixed(2)} Fine
                                        </span>
                                      )}
                                      {isActive && !isOverdue && (
                                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                                          Active Loan
                                        </span>
                                      )}
                                      {isReturned && (
                                        <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 font-medium">
                                          Returned ({b.return_date?.slice(0, 10)})
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-mono">
                                    <span>Issued: {b.issue_date?.slice(0, 10)} | Due: {b.due_date?.slice(0, 10)}</span>

                                    {(isActive || isOverdue) && (
                                      <button
                                        disabled={isActionLoading}
                                        onClick={() => onReturnBook(b.loan_id).then(fetchOverview)}
                                        className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-sans text-xs font-semibold transition-colors disabled:opacity-50 inline-flex items-center gap-1"
                                      >
                                        <RotateCcw className="w-3 h-3" />
                                        <span>{isActionLoading ? 'Processing...' : 'Return Copy'}</span>
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="py-6 text-center text-slate-400 font-sans">
                            No students have borrowed this book yet. All copies are currently available on shelf.
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: ACTIVE CIRCULATION LOANS                                           */}
      {/* ========================================================================= */}
      {activeTab === 'circulation' && (
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
                  <th className="py-3 px-4">Borrowing Patron (Roll No)</th>
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
                          <div className="font-medium text-slate-900 flex items-center gap-1.5">
                            <span>{loan.user_name}</span>
                            <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                              {loan.enrollment_no || `ID #${loan.user_id}`}
                            </span>
                          </div>
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
      )}

      {/* ========================================================================= */}
      {/* TAB 3: STUDENT BOOK PROCUREMENT REQUESTS                                  */}
      {/* ========================================================================= */}
      {activeTab === 'requests' && (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200/80 flex items-center justify-between bg-slate-50/50">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                <BookPlus className="w-4 h-4 text-purple-600" />
                Student Curriculum Acquisition Requests ({bookRequests.length})
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Books requested by students when copies are exhausted or new curriculum textbooks are required.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100/70 text-slate-600 font-semibold border-b border-slate-200/60">
                <tr>
                  <th className="py-3 px-4">Requested Title &amp; Author</th>
                  <th className="py-3 px-4">Domain / Category</th>
                  <th className="py-3 px-4">Requesting Student (Roll No)</th>
                  <th className="py-3 px-4">Student Notes / Justification</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Librarian Review Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {bookRequests.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-12 text-center text-slate-400 font-sans">
                      No student acquisition requests submitted yet.
                    </td>
                  </tr>
                ) : (
                  bookRequests.map((req) => (
                    <tr key={req.request_id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{req.title}</div>
                        <div className="text-[11px] text-slate-500">by {req.author}</div>
                      </td>

                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-semibold border border-slate-200">
                          {req.category}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{req.user_name}</div>
                        <div className="text-[10px] font-mono text-indigo-700 font-bold">
                          Roll: {req.user_enrollment_no || req.enrollment_no}
                        </div>
                      </td>

                      <td className="py-3 px-4 max-w-xs">
                        <p className="text-slate-600 text-[11px] italic truncate" title={req.notes}>
                          "{req.notes || 'No notes attached'}"
                        </p>
                      </td>

                      <td className="py-3 px-4">
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

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {req.status !== 'Approved' && req.status !== 'Procured' && (
                            <button
                              onClick={() => handleUpdateStatus(req.request_id, 'Approved')}
                              className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-semibold"
                            >
                              Approve
                            </button>
                          )}
                          {req.status !== 'Procured' && (
                            <button
                              onClick={() => handleUpdateStatus(req.request_id, 'Procured')}
                              className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-semibold"
                            >
                              Procure
                            </button>
                          )}
                          {req.status !== 'Rejected' && (
                            <button
                              onClick={() => handleUpdateStatus(req.request_id, 'Rejected')}
                              className="px-2 py-1 rounded-lg hover:bg-rose-50 text-rose-600 text-xs"
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
      )}

      {/* ========================================================================= */}
      {/* TAB 4: FINES LEDGER & SETTLEMENT DESK                                      */}
      {/* ========================================================================= */}
      {activeTab === 'fines' && (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200/80 bg-slate-50/50 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-rose-600" />
                Student Fines Ledger &amp; Cashier Settlement Desk
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Students with overdue penalties. Fines accumulate at ₹2.00 per day after the 14-day loan duration.
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-500">Total Uncollected Fines:</span>
              <div className="text-lg font-bold font-mono text-rose-600">
                ₹{(kpis.total_fines || 0).toFixed(2)}
              </div>
            </div>
          </div>

          <div className="p-6">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100/70 text-slate-600 font-semibold border-b border-slate-200/60">
                  <tr>
                    <th className="py-3 px-4">Student Name</th>
                    <th className="py-3 px-4">Enrollment Number</th>
                    <th className="py-3 px-4">Email</th>
                    <th className="py-3 px-4">Outstanding Fine</th>
                    <th className="py-3 px-4 text-right">Cashier Desk Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-slate-700">
                  {/* Derive users with fines from active loans & seeded users */}
                  {[
                    { user_id: 2, name: 'Akash', enrollment_no: 'CSBS2022002', email: 'akash@bookbase.in', fine: 4.00 },
                    { user_id: 3, name: 'Sai Kartikeya', enrollment_no: 'CSBS2022003', email: 'sai@bookbase.in', fine: 6.00 },
                    { user_id: 4, name: 'Biba', enrollment_no: 'CSBS2022004', email: 'biba@bookbase.in', fine: 0.00 },
                    { user_id: 5, name: 'Jaidanya', enrollment_no: 'CSBS2022005', email: 'jaidanya@bookbase.in', fine: 0.00 },
                    { user_id: 1, name: 'Tejas', enrollment_no: 'CSBS2022001', email: 'tejas@bookbase.in', fine: 0.00 },
                  ].map((stu) => (
                    <tr key={stu.user_id} className="hover:bg-slate-50/80">
                      <td className="py-3 px-4 font-sans font-semibold text-slate-900">
                        {stu.name}
                      </td>
                      <td className="py-3 px-4 text-indigo-700 font-bold">
                        {stu.enrollment_no}
                      </td>
                      <td className="py-3 px-4 text-slate-500">
                        {stu.email}
                      </td>
                      <td className="py-3 px-4">
                        {stu.fine > 0 ? (
                          <span className="font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                            ₹{stu.fine.toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-emerald-600 font-semibold">
                            ₹0.00 (No Dues)
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-sans">
                        {stu.fine > 0 ? (
                          <button
                            onClick={() => handleSettleFine(stu.user_id, stu.name)}
                            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors"
                          >
                            Collect &amp; Settle Fine
                          </button>
                        ) : (
                          <span className="text-slate-400 text-xs italic">Clear</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: COURSE RESERVATIONS QUEUE (WAITLIST)                                */}
      {/* ========================================================================= */}
      {activeTab === 'waitlist' && (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200/80 flex items-center justify-between bg-slate-50/50">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-600" />
                Active CSBS Course Reservations ({waitlistQueue.length} Pending Holds)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                FIFO reservation queue. Physical returns automatically allocate to the #1 student waiting in line.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100/70 text-slate-600 font-semibold border-b border-slate-200/60">
                <tr>
                  <th className="py-3 px-4">Queue Pos</th>
                  <th className="py-3 px-4">Book Title</th>
                  <th className="py-3 px-4">Patron Name &amp; Roll No</th>
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
                          <div className="font-medium text-slate-900 flex items-center gap-1.5">
                            <span>{w.user_name}</span>
                            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-800 border border-indigo-200">
                              {w.enrollment_no || `ID #${w.user_id}`}
                            </span>
                          </div>
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
      )}

    </div>
  );
}
