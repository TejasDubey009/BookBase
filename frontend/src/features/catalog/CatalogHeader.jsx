export default function CatalogHeader({ books, currentUser, portal, onOpenAddBook, onOpenBookRequest, children }) {
  const totalAvailable = books.reduce((acc, b) => acc + (b.available_copies || 0), 0);

  return (
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
      <div>
        <h1 className="font-serif text-[28px] leading-snug text-ink">Curriculum Library</h1>
        {children}
      </div>

      <div className="flex items-center gap-4 shrink-0">
        <p className="text-sm text-muted tabular-nums whitespace-nowrap">
          {books.length} Titles · {totalAvailable} Available
        </p>

        {portal === 'kiosk' || portal === 'student' ? (
          <button
            onClick={onOpenBookRequest}
            className="px-3 py-1.5 rounded border border-field text-sm text-body hover:bg-shelf whitespace-nowrap transition-colors"
          >
            Request Title
          </button>
        ) : null}

        {currentUser?.role === 'admin' && (
          <button
            onClick={onOpenAddBook}
            className="px-3 py-1.5 rounded bg-accent hover:bg-accent-hover text-white text-sm font-medium whitespace-nowrap transition-colors"
          >
            Add Title
          </button>
        )}
      </div>
    </div>
  );
}
