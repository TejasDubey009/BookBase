import React from 'react';
import { 
  Search, 
  Filter, 
  BookOpen, 
  CheckCircle2, 
  Clock, 
  Layers,
  Plus,
  Monitor,
  Smartphone,
  BookPlus
} from 'lucide-react';
import BentoBookCard from '../components/BentoBookCard';

const CATEGORIES = [
  'All',
  'Core Computer Science',
  'Business & Management',
  'Data Science & AI',
  'Banking Tech & FinTech',
  'Systems & Security',
];

export default function CatalogView({
  books,
  loading,
  searchQuery,
  setSearchQuery,
  selectedCategory,
  setSelectedCategory,
  availabilityFilter,
  setAvailabilityFilter,
  currentUser,
  portal = 'kiosk', // 'kiosk' | 'student' | 'admin'
  onSelectBook,
  onBorrow,
  onJoinWaitlist,
  onReturn,
  onRequestBook,
  loadingActionId,
  onOpenAddBook,
  onOpenBookRequest
}) {
  const totalAvailable = books.reduce((acc, b) => acc + (b.available_copies || 0), 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      
      {/* Portal Mode Explanatory Notice */}
      {portal === 'kiosk' ? (
        <div className="bg-indigo-900 text-indigo-100 p-4 rounded-2xl flex items-center justify-between border border-indigo-800 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-indigo-800 flex items-center justify-center text-white shrink-0">
              <Monitor className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-indigo-200">
                Portal 1 • Central Library Kiosk (On-Premise Terminal)
              </div>
              <div className="text-xs text-indigo-100 font-medium">
                Physical borrowing and return station. Click "Borrow Book at Kiosk" below to instantly check out an available copy.
              </div>
            </div>
          </div>
          <button
            onClick={onOpenBookRequest}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-800 hover:bg-indigo-700 text-white text-xs font-semibold border border-indigo-600 transition-colors"
          >
            <BookPlus className="w-3.5 h-3.5" />
            <span>Request Unavailable Title</span>
          </button>
        </div>
      ) : portal === 'student' ? (
        <div className="bg-emerald-900 text-emerald-100 p-4 rounded-2xl flex items-center justify-between border border-emerald-800 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-800 flex items-center justify-center text-white shrink-0">
              <Smartphone className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-emerald-200">
                Portal 3 • Student Personal Portal (Remote Discovery Mode)
              </div>
              <div className="text-xs text-emerald-100 font-medium">
                Remote catalogue inquiry. Checkout and returns are restricted to the Central Library Kiosk. You may submit book procurement requests below.
              </div>
            </div>
          </div>
          <button
            onClick={onOpenBookRequest}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white text-xs font-semibold border border-emerald-600 transition-colors"
          >
            <BookPlus className="w-3.5 h-3.5" />
            <span>Request Book</span>
          </button>
        </div>
      ) : null}

      {/* Top Banner: Minimalist Library Header */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
              Curriculum Library
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl leading-relaxed">
              Curriculum textbooks, references, and technical publications for Computer Science &amp; Business Systems.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Quick Catalog Stats */}
            <div className="hidden sm:flex items-center gap-4 bg-slate-50 border border-slate-200/80 p-3 rounded-2xl">
              <div className="px-2 text-center">
                <div className="text-base font-extrabold font-mono text-slate-900">{books.length}</div>
                <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Titles</div>
              </div>
              <div className="h-6 w-px bg-slate-200"></div>
              <div className="px-2 text-center">
                <div className="text-base font-extrabold font-mono text-emerald-600">{totalAvailable}</div>
                <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Available</div>
              </div>
            </div>

            {portal === 'kiosk' || portal === 'student' ? (
              <button
                onClick={onOpenBookRequest}
                className="px-4 py-2.5 rounded-2xl bg-indigo-50 hover:bg-indigo-100 text-indigo-900 text-xs font-semibold border border-indigo-200 transition-colors flex items-center gap-2"
              >
                <BookPlus className="w-4 h-4 text-indigo-600" />
                <span>Request Title</span>
              </button>
            ) : null}

            {currentUser?.role === 'admin' && (
              <button
                onClick={onOpenAddBook}
                className="px-4 py-2.5 rounded-2xl bg-indigo-900 hover:bg-indigo-800 text-white text-xs font-semibold shadow-xs transition-colors flex items-center gap-2 self-start md:self-auto"
              >
                <Plus className="w-4 h-4" />
                <span>Add Title</span>
              </button>
            )}
          </div>
        </div>

        {/* Search Bar & Availability Toggle */}
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

        {/* Category Chips */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mr-1 hidden sm:inline">
            Subject Area:
          </span>
          {CATEGORIES.map((cat) => {
            const active = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                  active
                    ? 'bg-indigo-900 text-white font-semibold shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80 hover:text-slate-900'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* Book Grid */}
      {loading ? (
        <div className="py-24 text-center">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 animate-spin mb-3">
            <Layers className="w-5 h-5" />
          </div>
          <p className="text-sm text-slate-500 font-medium">
            Loading library catalog...
          </p>
        </div>
      ) : books.length === 0 ? (
        <div className="py-20 text-center bg-white rounded-3xl border border-slate-200/80 p-8 shadow-xs">
          <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">No books found matching your criteria</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Try adjusting your search query, clearing filters, or switching subject categories.
          </p>
          <div className="mt-4 flex items-center justify-center gap-2">
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('All');
                setAvailabilityFilter('all');
              }}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
            >
              Reset Filters
            </button>
            <button
              onClick={onOpenBookRequest}
              className="px-4 py-2 rounded-xl bg-indigo-900 hover:bg-indigo-800 text-white text-xs font-semibold transition-colors flex items-center gap-1.5"
            >
              <BookPlus className="w-3.5 h-3.5" />
              <span>Submit Request for this Book</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {books.map((book) => (
            <BentoBookCard
              key={book.book_id}
              book={book}
              currentUser={currentUser}
              portal={portal}
              onSelect={onSelectBook}
              onBorrow={onBorrow}
              onJoinWaitlist={onJoinWaitlist}
              onReturn={onReturn}
              onRequestBook={onRequestBook}
              loadingActionId={loadingActionId}
            />
          ))}
        </div>
      )}

    </div>
  );
}
