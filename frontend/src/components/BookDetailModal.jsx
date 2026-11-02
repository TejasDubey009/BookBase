import React, { useEffect, useState } from 'react';
import { 
  X, 
  BookOpen, 
  Clock, 
  Layers, 
  MapPin, 
  Barcode, 
  User, 
  Calendar, 
  CheckCircle2, 
  AlertCircle,
  Zap,
  Info
} from 'lucide-react';
import { api } from '../api';
import BookCover from './BookCover';

export default function BookDetailModal({
  bookId,
  currentUser,
  onClose,
  onBorrow,
  onJoinWaitlist,
  onReturn,
  onCancelWaitlist,
  loadingActionId
}) {
  const [book, setBook] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!bookId) return;
    setLoading(true);
    api.getBookDetail(bookId, currentUser?.user_id)
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
              {/* Top Overview: Cover + Title + Details */}
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

              {/* SECTION 1: Physical Copies Breakdown */}
              <div className="border border-slate-200/80 rounded-2xl overflow-hidden bg-slate-50/50">
                <div className="px-4 py-3 bg-white border-b border-slate-200/80 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Barcode className="w-4 h-4 text-indigo-600" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                      Shelf Copies &amp; Accession Details
                    </h3>
                  </div>
                  <span className="text-[11px] text-slate-500 font-mono">
                    Accession Records
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100/75 text-slate-600 font-semibold border-b border-slate-200/60">
                      <tr>
                        <th className="py-2.5 px-4">Copy ID</th>
                        <th className="py-2.5 px-4">Barcode</th>
                        <th className="py-2.5 px-4">Shelf Location</th>
                        <th className="py-2.5 px-4">Condition</th>
                        <th className="py-2.5 px-4">Status</th>
                        <th className="py-2.5 px-4">Borrower / Due Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200/60 bg-white font-mono">
                      {book.copies && book.copies.length > 0 ? (
                        book.copies.map((copy) => {
                          const isIssued = copy.status === 'Issued';
                          const isAvailable = copy.status === 'Available';
                          return (
                            <tr key={copy.copy_id} className="hover:bg-slate-50/80">
                              <td className="py-2.5 px-4 text-slate-500">#{copy.copy_id}</td>
                              <td className="py-2.5 px-4 font-semibold text-slate-800">{copy.barcode}</td>
                              <td className="py-2.5 px-4 text-slate-600 font-sans">{copy.shelf_location}</td>
                              <td className="py-2.5 px-4 text-slate-600 font-sans">{copy.condition}</td>
                              <td className="py-2.5 px-4">
                                <span
                                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-sans font-medium ${
                                    isAvailable
                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                      : isIssued
                                      ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                      : 'bg-amber-50 text-amber-700 border border-amber-200'
                                  }`}
                                >
                                  {copy.status}
                                </span>
                              </td>
                              <td className="py-2.5 px-4 font-sans text-slate-600">
                                {copy.current_borrower_name ? (
                                  <div className="flex flex-col">
                                    <span className="font-medium text-slate-900">{copy.current_borrower_name}</span>
                                    <span className="text-[10px] text-slate-500 font-mono">
                                      Due: {copy.current_due_date?.slice(0, 10)}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-slate-400 font-mono italic">On Shelf</span>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan="6" className="py-4 text-center text-slate-400 font-sans">
                            No physical copies registered for this title.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* SECTION 2: Live FIFO Waitlist Queue */}
              <div className="border border-slate-200/80 rounded-2xl overflow-hidden bg-slate-50/50">
                <div className="px-4 py-3 bg-white border-b border-slate-200/80 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-600" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                      Circulation Reservation Queue
                    </h3>
                  </div>
                  <span className="text-[11px] text-amber-700 font-medium bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200/60 font-mono">
                    {book.waitlist_count} Patrons Waiting
                  </span>
                </div>

                <div className="p-3 text-xs bg-amber-50/40 border-b border-amber-100 flex items-start gap-2 text-amber-900">
                  <Zap className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <span className="leading-relaxed">
                    <strong>Automated Hold Allocation:</strong> When a currently checked-out copy is returned to the circulation desk, 
                    the library system immediately allocates it to the next patron holding an active reservation.
                  </span>
                </div>

                {book.waitlist_count > 0 ? (
                  <div className="p-4">
                    <div className="space-y-2">
                      <div className="text-xs font-semibold text-slate-600 mb-2">Current Queue Lineup:</div>
                      {/* Visual Queue representation */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {Array.from({ length: book.waitlist_count }).map((_, idx) => {
                          const isYou = book.user_context?.waitlist_position === idx + 1;
                          return (
                            <div 
                              key={idx}
                              className={`p-3 rounded-xl border flex items-center justify-between ${
                                isYou
                                  ? 'bg-amber-50/90 border-amber-300 ring-2 ring-amber-400/20'
                                  : 'bg-white border-slate-200/80'
                              }`}
                            >
                              <div className="flex items-center gap-2.5">
                                <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-800 font-mono font-bold text-xs flex items-center justify-center">
                                  #{idx + 1}
                                </span>
                                <div>
                                  <div className="text-xs font-semibold text-slate-900">
                                    {isYou ? 'You (Current Patron)' : `Waitlisted Patron #${idx + 1}`}
                                  </div>
                                  <div className="text-[10px] text-slate-500 font-mono">
                                    {idx === 0 ? '⚡ Next returned copy assigns here' : 'In queue'}
                                  </div>
                                </div>
                              </div>

                              {isYou && (
                                <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md">
                                  Your Spot
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="py-6 text-center text-xs text-slate-400 font-medium">
                    Waitlist queue is empty. No patrons currently waiting for this title.
                  </div>
                )}
              </div>
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
            <div className="flex items-center gap-2">
              {book.user_context?.has_active_loan ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-emerald-700 font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    You are holding Copy {book.user_context.active_copy_barcode}
                  </span>
                  <button
                    disabled={loadingActionId === book.book_id}
                    onClick={() => {
                      onReturn(book.user_context.active_loan_id);
                      onClose();
                    }}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors"
                  >
                    Return Book Now
                  </button>
                </div>
              ) : book.user_context?.waitlist_position ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-amber-800 font-medium">
                    Queue Position: <strong>#{book.user_context.waitlist_position}</strong>
                  </span>
                  <button
                    disabled={loadingActionId === book.book_id}
                    onClick={() => {
                      onCancelWaitlist(book.user_context.waitlist_reservation_id);
                      onClose();
                    }}
                    className="px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-medium transition-colors"
                  >
                    Leave Waitlist
                  </button>
                </div>
              ) : book.available_copies > 0 ? (
                <button
                  disabled={loadingActionId === book.book_id}
                  onClick={() => {
                    onBorrow(book.book_id);
                    onClose();
                  }}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  Borrow an Available Copy
                </button>
              ) : (
                <button
                  disabled={loadingActionId === book.book_id}
                  onClick={() => {
                    onJoinWaitlist(book.book_id);
                    onClose();
                  }}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5"
                >
                  <Clock className="w-3.5 h-3.5" />
                  Join FIFO Waitlist (Queue #{book.waitlist_count + 1})
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

