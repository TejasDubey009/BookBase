import BookCover from '../../../components/books/BookCover';

export default function BookOverview({ book }) {
  return (
    <div className="flex flex-col sm:flex-row gap-6">
      <div className="w-32 h-44 flex-shrink-0 self-center sm:self-start">
        <BookCover book={book} className="w-full h-full" isModal={true} />
      </div>

      <div className="flex-1">
        <h2 className="text-xl font-medium text-ink leading-snug">
          {book.title}
        </h2>
        <p className="text-sm text-muted mt-1">
          by {book.author} • Published {book.published_year}
        </p>

        <p className="text-sm text-body mt-3 leading-relaxed">
          {book.description || 'No description provided.'}
        </p>

        {/* Library Inventory Status */}
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1">
          <div className="text-sm text-body">
            <span>Total Shelf Copies: <span className="font-medium text-ink">{book.total_copies}</span></span>
          </div>

          {book.available_copies > 0 ? (
            <div className="text-sm text-body">
              <span><span className="font-medium text-ink">{book.available_copies}</span> Available for Borrowing</span>
            </div>
          ) : (
            <div className="text-sm text-body">
              <span>All Copies on Loan • <span className="font-medium text-ink">{book.waitlist_count}</span> Active Reservations</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
