import { RefreshCw } from 'lucide-react';

export default function AdminHeader({ onRefresh, onOpenAddBook, onResetDemo }) {
  return (
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
      <div>
        <h1 className="font-serif text-[28px] leading-snug text-ink">
          Circulation Desk
        </h1>
        <p className="mt-1 text-sm text-muted max-w-2xl">
          Return requests, loans, fines and the catalogue, in one place.
        </p>
      </div>

      <div className="flex items-stretch flex-wrap gap-2 shrink-0">
        <button
          onClick={onRefresh}
          className="px-2 rounded border border-field text-body hover:bg-shelf transition-colors"
          title="Refresh Overview"
          aria-label="Refresh Overview"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
        <button
          onClick={onResetDemo}
          className="px-3 py-1.5 rounded border border-field text-sm text-danger hover:bg-shelf transition-colors"
          title="Reset system to clean initial demo state"
        >
          Reset Database
        </button>
        <button
          onClick={onOpenAddBook}
          className="px-3 py-1.5 rounded bg-accent hover:bg-accent-hover text-white text-sm font-medium transition-colors"
        >
          Add Book
        </button>
      </div>
    </div>
  );
}
