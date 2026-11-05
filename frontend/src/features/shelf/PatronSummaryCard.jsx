import { BookPlus } from 'lucide-react';

export default function PatronSummaryCard({ user, activeLoansCount, onOpenBookRequest }) {
  return (
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
            <span>{activeLoansCount}</span>
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
  );
}
