import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { api } from '../../../api/bookbase';
import BookDetailActions from './BookDetailActions';
import BookOverview from './BookOverview';
import CopiesTable from './CopiesTable';
import WaitlistLineup from './WaitlistLineup';

export default function BookDetailModal({
  bookId,
  currentUser,
  portal = 'kiosk', // 'kiosk' | 'student' | 'admin'
  onClose,
  onBorrow,
  onJoinWaitlist,
  onReturn,
  onCancelWaitlist,
  onRequestBook,
  loadingActionId
}) {
  const [book, setBook] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!bookId) return;
    setLoading(true);
    api.getBookDetail(bookId)
      .then((data) => {
        setBook(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [bookId, currentUser]);

  if (!bookId) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div 
        className="bg-white w-full max-w-3xl rounded-lg border border-line shadow-soft overflow-hidden max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-line flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs px-2 py-0.5 rounded-full bg-shelf text-ink">
              {book?.category || 'Book Detail'}
            </span>
            <span className="text-xs text-muted">
              ISBN {book?.isbn}
            </span>
            {portal === 'student' && (
              <span className="text-xs text-muted">
                Remote View
              </span>
            )}
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-line text-muted hover:text-ink transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body (Scrollable) */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {loading ? (
            <div className="py-20 text-center text-muted text-sm">
              Loading book specifications and physical inventory...
            </div>
          ) : error ? (
            <div className="p-4 rounded bg-shelf text-danger border border-line text-sm">
              {error}
            </div>
          ) : book ? (
            <>
              <BookOverview book={book} />
              <CopiesTable book={book} />
              <WaitlistLineup book={book} currentUser={currentUser} />
            </>
          ) : null}
        </div>

        {/* Modal Footer with Contextual Actions */}
        <div className="px-6 py-4 border-t border-line flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded text-sm text-body hover:text-ink transition-colors"
          >
            Close
          </button>

          {book && (
            <BookDetailActions
              book={book}
              portal={portal}
              onClose={onClose}
              onBorrow={onBorrow}
              onJoinWaitlist={onJoinWaitlist}
              onReturn={onReturn}
              onCancelWaitlist={onCancelWaitlist}
              onRequestBook={onRequestBook}
              loadingActionId={loadingActionId}
            />
          )}
        </div>
      </div>
    </div>
  );
}
