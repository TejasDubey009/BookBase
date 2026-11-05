import { BookOpen, BookPlus } from 'lucide-react';

export default function CatalogEmptyState({ setSearchQuery, setSelectedCategory, setAvailabilityFilter, onOpenBookRequest }) {
  return (
    <div className="py-20 text-center bg-white rounded-3xl border border-slate-200/80 p-8 shadow-xs">
      <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-3" />
      <h3 className="text-base font-bold text-slate-800">No books found matching your criteria</h3>
      <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
        Try adjusting your search query, clearing filters, or switching subject categories.
      </p>
      <div className="mt-4 flex items-center justify-center gap-2">
        <button
          onClick={() => {
            setSearchQuery('');
            setSelectedCategory('All');
            setAvailabilityFilter('all');
          }}
          className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
        >
          Reset Filters
        </button>
        <button
          onClick={onOpenBookRequest}
          className="px-4 py-2 rounded-xl bg-indigo-900 hover:bg-indigo-800 text-white text-xs font-semibold transition-colors flex items-center gap-1.5"
        >
          <BookPlus className="w-3.5 h-3.5" />
          <span>Submit Request for this Book</span>
        </button>
      </div>
    </div>
  );
}
