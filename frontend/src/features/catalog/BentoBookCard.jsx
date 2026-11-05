import { MapPin } from 'lucide-react';
import BookCover from '../../components/books/BookCover';
import BookCardActions from './BookCardActions';
import { TINT_STYLES } from './cardTints';

// Format ISBN with hyphens
function formatIsbn(str) {
  if (str && str.length === 13) {
    return `${str.slice(0, 3)}-${str.slice(3, 4)}-${str.slice(4, 9)}-${str.slice(9, 12)}-${str.slice(12)}`;
  }
  return str;
}

export default function BentoBookCard({
  book,
  portal = 'kiosk', // 'kiosk' | 'student' | 'admin'
  onSelect,
  onBorrow,
  onJoinWaitlist,
  onReturn,
  onRequestBook,
  loadingActionId
}) {
  const tint = TINT_STYLES[book.card_tint] || TINT_STYLES.indigo;
  const isAvailable = book.available_copies > 0;
  const shelf = book.copies?.[0]?.shelf_location || 'Central Library • Floor 2 Stacks';

  return (
    <div
      className="group bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 overflow-hidden flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-xl hover:shadow-slate-200/40 dark:hover:shadow-slate-950/40 transition-all duration-300"
    >
      {/* Top Floating Cover Area */}
      <div
        onClick={() => onSelect(book)}
        className={`relative p-6 pb-7 flex items-center justify-center border-b transition-colors cursor-pointer overflow-hidden ${tint.bg}`}
      >
        {/* Subtle Ambient Radial Glow */}
        <div className={`absolute -bottom-8 w-40 h-40 bg-gradient-to-t ${tint.glow} rounded-full blur-xl pointer-events-none`}></div>

        {/* Floating 3D Book Cover */}
        <div className="relative z-10 w-32 h-44 rounded-lg shadow-md group-hover:shadow-xl transition-all duration-300 transform group-hover:-translate-y-2 overflow-hidden bg-slate-200 dark:bg-slate-800 ring-1 ring-black/5">
          {/* Spine Highlight Shadow */}
          <div className="absolute left-0 top-0 bottom-0 w-2.5 bg-gradient-to-r from-black/25 via-transparent to-transparent z-20 pointer-events-none"></div>

          <BookCover book={book} className="w-full h-full" />
        </div>

        {/* Category Badge */}
        <div className="absolute top-3.5 left-3.5 z-10">
          <span className="text-[10px] font-bold tracking-wider uppercase px-2.5 py-0.5 rounded-full bg-white/95 dark:bg-slate-900/90 text-slate-800 dark:text-slate-200 shadow-xs backdrop-blur-xs border border-white/80 dark:border-slate-700">
            {book.category}
          </span>
        </div>

        <div className="absolute top-3.5 right-3.5 z-10">
          <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/10 text-slate-600 dark:text-slate-300">
            {book.published_year}
          </span>
        </div>
      </div>

      {/* Book Metadata Section */}
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          <h3
            onClick={() => onSelect(book)}
            className="font-bold text-slate-900 dark:text-white text-sm sm:text-base leading-snug line-clamp-2 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer transition-colors"
            title={book.title}
          >
            {book.title}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-1 font-medium">
            by {book.author}
          </p>

          {/* Monospace ISBN & Shelf Info */}
          <div className="mt-3.5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-mono">
            <span>ISBN {formatIsbn(book.isbn)}</span>
            <span className="truncate max-w-[130px] flex items-center gap-1" title={shelf}>
              <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
              {shelf}
            </span>
          </div>

          {/* Copy Availability Pill (3NF Dynamic Computation) */}
          <div className="mt-3 flex items-center justify-between">
            {isAvailable ? (
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/60">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                <span>{book.available_copies} of {book.total_copies} Available</span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/50 text-amber-900 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/60">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                <span>0 Available • {book.waitlist_count} in Queue</span>
              </div>
            )}
          </div>
        </div>

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
    </div>
  );
}
