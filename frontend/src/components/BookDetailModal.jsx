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
  Info,
  BookPlus,
  Monitor,
  Building
} from 'lucide-react';
import { api } from '../api';
import BookCover from './BookCover';

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
                              <td className="py-2.5 px-4 font-sans text-slate-600">{copy.shelf_location}</td>
                              <td className="py-2.5 px-4 font-sans">
                                <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px]">
                                  {copy.condition}
                                </span>
                              </td>
                              <td className="py-2.5 px-4">
                                {isAvailable ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-semibold border border-emerald-200">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                                    Available
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 text-[10px] font-semibold border border-amber-200">
                                    <Clock className="w-3 h-3 text-amber-500" />
                                    Issued
                                  </span>
                                )}
                              </td>
                              <td className="py-2.5 px-4 font-sans text-slate-600">
                                {isIssued && copy.current_loan ? (
                                  <span className="text-[11px]">
                                    Due: {copy.current_loan.due_date?.slice(0, 10)}
                                  </span>
                                ) : (
                                  <span className="text-slate-400 italic text-[11px]">Ready on shelf</span>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan="6" className="py-4 text-center text-slate-400">
                            No physical copies registered for this title.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* SECTION 2: Active Waitlist Lineup */}
              <div className="border border-slate-200/80 rounded-2xl overflow-hidden bg-white">
                <div className="px-4 py-3 bg-slate-50/70 border-b border-slate-200/80 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-600" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                      Active Course Reservations Queue ({book.waitlist_entries?.length || 0})
                    </h3>
                  </div>
                  <span className="text-[11px] text-amber-800 font-mono">
                    FIFO Dispatch
                  </span>
                </div>

                {book.waitlist_entries && book.waitlist_entries.length > 0 ? (
                  <div className="p-4 space-y-2">
                    {book.waitlist_entries.map((w) => {
                      const isFirst = w.queue_position === 1;
                      const isCurrentUser = currentUser?.user_id === w.user_id;

                      return (
                        <div 
                          key={w.reservation_id}
                          className={`p-2.5 rounded-xl border flex items-center justify-between text-xs ${
                            isCurrentUser 
                              ? 'bg-amber-50 border-amber-300 font-semibold' 
                              : 'bg-slate-50 border-slate-200'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold font-mono text-[11px] ${
                              isFirst ? 'bg-amber-200 text-amber-900' : 'bg-slate-200 text-slate-700'
                            }`}>
                              #{w.queue_position}
                            </span>
                            <div>
                              <span className="text-slate-900">{w.user_name}</span>
                              {isCurrentUser && (
                                <span className="ml-1.5 text-[10px] text-amber-800 font-bold bg-amber-100 px-1.5 py-0.2 rounded">
                                  You
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="text-[11px] text-slate-500 font-mono">
                            {isFirst ? (
                              <span className="text-amber-800 font-bold flex items-center gap-1">
                                <Zap className="w-3 h-3 text-amber-600" />
                                Next Available Copy
                              </span>
                            ) : (
                              <span>Position #{w.queue_position}</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
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
              {/* ========================================================= */}
              {/* PORTAL 1: KIOSK (Full Borrow & Return Actions)             */}
              {/* ========================================================= */}
              {portal === 'kiosk' && (
                <>
                  {book.user_context?.has_active_loan ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-emerald-700 font-medium flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        Holding Copy {book.user_context.active_copy_barcode}
                      </span>
                      <button
                        disabled={loadingActionId === book.book_id}
                        onClick={() => {
                          onReturn(book.user_context.active_loan_id);
                          onClose();
                        }}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors"
                      >
                        Return Copy at Kiosk
                      </button>
                    </div>
                  ) : book.user_context?.waitlist_position ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-amber-800 font-medium">
                        Waitlist Queue: <strong>#{book.user_context.waitlist_position}</strong>
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
                      className="px-5 py-2 rounded-xl bg-indigo-900 hover:bg-indigo-800 text-white text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5"
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      Borrow Copy at Kiosk
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        disabled={loadingActionId === book.book_id}
                        onClick={() => {
                          onJoinWaitlist(book.book_id);
                          onClose();
                        }}
                        className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5"
                      >
                        <Clock className="w-3.5 h-3.5" />
                        Join Waitlist (#{book.waitlist_count + 1})
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onRequestBook?.(book);
                        }}
                        className="px-3 py-2 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center gap-1"
                      >
                        <BookPlus className="w-3.5 h-3.5" />
                        <span>Request Extra Copies</span>
                      </button>
                    </div>
                  )}
                </>
              )}

              {/* ========================================================= */}
              {/* PORTAL 3: STUDENT REMOTE PORTAL (Strictly NO Borrow/Return)*/}
              {/* ========================================================= */}
              {portal === 'student' && (
                <div className="flex items-center gap-2">
                  {book.user_context?.has_active_loan ? (
                    <span className="text-xs text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-xl border border-indigo-200 font-medium flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Holding Copy {book.user_context.active_copy_barcode} • Return at Central Library Kiosk</span>
                    </span>
                  ) : book.available_copies > 0 ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-600 bg-slate-100 px-3 py-1.5 rounded-xl font-medium flex items-center gap-1.5">
                        <Building className="w-3.5 h-3.5 text-slate-500" />
                        <span>Available on shelf • Visit Library Kiosk to borrow</span>
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        disabled={loadingActionId === book.book_id}
                        onClick={() => {
                          onJoinWaitlist(book.book_id);
                          onClose();
                        }}
                        className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5"
                      >
                        <Clock className="w-3.5 h-3.5" />
                        Join Waitlist (#{book.waitlist_count + 1})
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onRequestBook?.(book);
                        }}
                        className="px-4 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200 text-xs font-semibold flex items-center gap-1.5"
                      >
                        <BookPlus className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Request Additional Copy</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* ========================================================= */}
              {/* PORTAL 2: ADMIN PORTAL                                    */}
              {/* ========================================================= */}
              {portal === 'admin' && (
                <span className="text-xs font-mono text-slate-500">
                  Total {book.total_copies} Accessioned Copies ({book.available_copies} Available)
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
