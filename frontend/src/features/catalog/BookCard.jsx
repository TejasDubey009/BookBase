import BookCover from '../../components/books/BookCover';
import BookCardActions from './BookCardActions';

/** One cell of the catalog's ruled grid: the cover is the only colour on the page. */
export default function BookCard({
  book,
  portal = 'kiosk', // 'kiosk' | 'student' | 'admin'
  onSelect,
  onBorrow,
  onJoinWaitlist,
  onReturn,
  onRequestBook,
  loadingActionId
}) {
  const isAvailable = book.available_copies > 0;

  return (
    <div className="flex flex-col items-center text-center p-4 sm:p-6 border border-line -ml-px -mt-px">
      <div onClick={() => onSelect(book)} className="w-24 sm:w-28 h-[137px] sm:h-40 cursor-pointer">
        <BookCover book={book} className="w-full h-full" />
      </div>

      <h3
        onClick={() => onSelect(book)}
        title={book.title}
        className="mt-4 text-sm text-ink leading-snug line-clamp-2 cursor-pointer hover:underline underline-offset-2"
      >
        {book.title}
      </h3>
      <p className="mt-0.5 text-sm text-muted line-clamp-1">{book.author}</p>

      <p className="mt-2 mb-4 text-xs text-muted flex items-center gap-1.5">
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isAvailable ? 'bg-positive' : 'bg-muted'}`}></span>
        {isAvailable
          ? <span>{book.available_copies} of {book.total_copies} Available</span>
          : <span>0 Available • {book.waitlist_count} in Queue</span>}
      </p>

      <BookCardActions
        book={book}
        portal={portal}
        onSelect={onSelect}
        onBorrow={onBorrow}
        onJoinWaitlist={onJoinWaitlist}
        onReturn={onReturn}
        onRequestBook={onRequestBook}
        loadingActionId={loadingActionId}
      />
    </div>
  );
}
