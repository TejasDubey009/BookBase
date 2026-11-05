import { Search } from 'lucide-react';

export default function CatalogSearchBar({ searchQuery, setSearchQuery, availabilityFilter, setAvailabilityFilter }) {
  return (
    <div className="flex flex-col sm:flex-row items-center gap-3 pt-1">
      {/* Instant Search Bar */}
      <div className="relative flex-1 w-full">
        <Search className="w-4 h-4 text-slate-400 absolute left-4 top-3.5" />
        <input
          type="text"
          placeholder="Search by Title, Author, ISBN, or Shelf Location (e.g. 'Cormen', 'Silberschatz', 'Floor 2')..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-11 pr-14 py-3 text-xs sm:text-sm rounded-2xl border border-slate-200 bg-slate-50/60 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400 font-medium"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3.5 top-3 text-xs text-slate-400 hover:text-slate-600 px-2 py-0.5 rounded-md hover:bg-slate-100 font-medium"
          >
            Clear
          </button>
        )}
      </div>

      {/* Availability Filter Segment */}
      <div className="flex items-center bg-slate-100 p-1.5 rounded-2xl border border-slate-200/60 text-xs font-medium w-full sm:w-auto">
        <button
          onClick={() => setAvailabilityFilter('all')}
          className={`flex-1 sm:flex-initial px-3.5 py-2 rounded-xl transition-all ${
            availabilityFilter === 'all'
              ? 'bg-white text-slate-900 font-bold shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          All Books
        </button>
        <button
          onClick={() => setAvailabilityFilter('available')}
          className={`flex-1 sm:flex-initial px-3.5 py-2 rounded-xl transition-all ${
            availabilityFilter === 'available'
              ? 'bg-white text-emerald-700 font-bold shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Available Now
        </button>
        <button
          onClick={() => setAvailabilityFilter('waitlist')}
          className={`flex-1 sm:flex-initial px-3.5 py-2 rounded-xl transition-all ${
            availabilityFilter === 'waitlist'
              ? 'bg-white text-amber-700 font-bold shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          On Loan / Waitlist
        </button>
      </div>
    </div>
  );
}
