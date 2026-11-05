import { Plus, RefreshCw, ShieldCheck } from 'lucide-react';

export default function AdminHeader({ onRefresh, onOpenAddBook, onResetDemo }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/90 shadow-2xs">
      <div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 font-mono">
            Central Administration
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
          onClick={onRefresh}
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
  );
}
