export default function CatalogEmptyState({ setSearchQuery, setSelectedCategory, setAvailabilityFilter, onOpenBookRequest }) {
  return (
    <div className="py-20 text-center">
      <h3 className="text-base font-medium text-ink">No books found matching your criteria</h3>
      <p className="mt-1 text-sm text-muted max-w-sm mx-auto">
        Try adjusting your search query, clearing filters, or switching subject categories.
      </p>
      <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
        <button
          onClick={() => {
            setSearchQuery('');
            setSelectedCategory('All');
            setAvailabilityFilter('all');
          }}
          className="px-3 py-1.5 rounded border border-field text-sm text-body hover:bg-shelf transition-colors"
        >
          Reset Filters
        </button>
        <button
          onClick={onOpenBookRequest}
          className="px-3 py-1.5 rounded bg-accent hover:bg-accent-hover text-white text-sm font-medium transition-colors"
        >
          Submit Request for this Book
        </button>
      </div>
    </div>
  );
}
