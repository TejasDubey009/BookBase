import { BookPlus, Plus } from 'lucide-react';

export default function CatalogHeader({ books, currentUser, portal, onOpenAddBook, onOpenBookRequest }) {
  const totalAvailable = books.reduce((acc, b) => acc + (b.available_copies || 0), 0);

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
          Curriculum Library
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl leading-relaxed">
          Curriculum textbooks, references, and technical publications for Computer Science &amp; Business Systems.
        </p>
      </div>

      <div className="flex items-center gap-3">
        {/* Quick Catalog Stats */}
        <div className="hidden sm:flex items-center gap-4 bg-slate-50 border border-slate-200/80 p-3 rounded-2xl">
          <div className="px-2 text-center">
            <div className="text-base font-extrabold font-mono text-slate-900">{books.length}</div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Titles</div>
          </div>
          <div className="h-6 w-px bg-slate-200"></div>
          <div className="px-2 text-center">
            <div className="text-base font-extrabold font-mono text-emerald-600">{totalAvailable}</div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Available</div>
          </div>
        </div>

        {portal === 'kiosk' || portal === 'student' ? (
          <button
            onClick={onOpenBookRequest}
            className="px-4 py-2.5 rounded-2xl bg-indigo-50 hover:bg-indigo-100 text-indigo-900 text-xs font-semibold border border-indigo-200 transition-colors flex items-center gap-2"
          >
            <BookPlus className="w-4 h-4 text-indigo-600" />
            <span>Request Title</span>
          </button>
        ) : null}

        {currentUser?.role === 'admin' && (
          <button
            onClick={onOpenAddBook}
            className="px-4 py-2.5 rounded-2xl bg-indigo-900 hover:bg-indigo-800 text-white text-xs font-semibold shadow-xs transition-colors flex items-center gap-2 self-start md:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Add Title</span>
          </button>
        )}
      </div>
    </div>
  );
}
