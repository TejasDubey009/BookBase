import { CheckCircle2, Clock, Layers } from 'lucide-react';
import BookCover from '../../../components/books/BookCover';

export default function BookOverview({ book }) {
  return (
    <div className="flex flex-col sm:flex-row gap-6">
      <div className="w-32 h-44 rounded-xl shadow-md overflow-hidden bg-slate-100 flex-shrink-0 self-center sm:self-start">
        <BookCover book={book} className="w-full h-full" isModal={true} />
      </div>

      <div className="flex-1">
        <h2 className="text-xl font-bold text-slate-900 tracking-tight leading-snug">
          {book.title}
        </h2>
        <p className="text-sm text-slate-600 mt-1 font-medium">
          by {book.author} • Published {book.published_year}
        </p>

        <p className="text-xs text-slate-600 mt-3 leading-relaxed">
          {book.description || 'No description provided.'}
        </p>

        {/* Library Inventory Status */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-mono font-medium">
            <Layers className="w-3.5 h-3.5 text-slate-500" />
            <span>Total Shelf Copies: <strong>{book.total_copies}</strong></span>
          </div>

          {book.available_copies > 0 ? (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200/80 text-xs font-medium">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span><strong>{book.available_copies}</strong> Available for Borrowing</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200/80 text-xs font-medium">
              <Clock className="w-3.5 h-3.5 text-amber-600" />
              <span>All Copies on Loan • <strong>{book.waitlist_count}</strong> Active Reservations</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
