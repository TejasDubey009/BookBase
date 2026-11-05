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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white w-full max-w-3xl rounded-3xl border border-slate-200/90 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200/60">
              {book?.category || 'Book Detail'}
            </span>
            <span className="text-xs font-mono text-slate-500">
              ISBN {book?.isbn}
            </span>
            {portal === 'student' && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                Remote View
              </span>
            )}
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body (Scrollable) */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {loading ? (
            <div className="py-20 text-center text-slate-400 text-sm">
              Loading book specifications and physical inventory...
            </div>
          ) : error ? (
            <div className="p-4 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 text-sm">
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
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200/80 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 transition-colors"
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
