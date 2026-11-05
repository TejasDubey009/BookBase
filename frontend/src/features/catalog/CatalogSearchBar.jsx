import { Search } from 'lucide-react';

const AVAILABILITY_OPTIONS = [
  { value: 'all', label: 'All Books' },
  { value: 'available', label: 'Available Now' },
  { value: 'waitlist', label: 'On Loan / Waitlist' },
];

export default function CatalogSearchBar({ searchQuery, setSearchQuery, availabilityFilter, setAvailabilityFilter }) {
  return (
    <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-6">
      <div className="relative flex-1 w-full">
        <Search className="w-4 h-4 text-muted absolute left-3 top-3" />
        <input
          type="text"
          placeholder="Search by Title, Author, ISBN, or Shelf Location (e.g. 'Cormen', 'Silberschatz', 'Floor 2')..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full h-10 pl-9 pr-14 text-sm text-ink rounded border border-field bg-white text-ellipsis focus:outline-none focus:ring-1 focus:ring-ink focus:border-ink placeholder:text-muted"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-2.5 text-sm text-muted hover:text-ink transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      <div className="flex items-center gap-4 text-sm whitespace-nowrap overflow-x-auto no-scrollbar">
        {AVAILABILITY_OPTIONS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setAvailabilityFilter(value)}
            className={`transition-colors ${availabilityFilter === value ? 'text-ink font-medium' : 'text-muted hover:text-ink'}`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
