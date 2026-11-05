import { useEffect, useState } from 'react';
import { X, CheckCircle2, AlertCircle } from 'lucide-react';
import { api } from '../../api/bookbase';
import { BOOK_CATEGORIES, DEFAULT_CATEGORY } from '../../constants/catalog';

const REQUEST_CATEGORIES = [...BOOK_CATEGORIES, 'General Reference'];

export default function BookRequestModal({ isOpen, onClose, currentUser, prefillBook, onSuccess }) {
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [category, setCategory] = useState(DEFAULT_CATEGORY);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  // This modal stays mounted, so start each opening from the chosen book or a blank form.
  useEffect(() => {
    if (!isOpen) return;
    setTitle(prefillBook?.title || '');
    setAuthor(prefillBook?.author || '');
    setCategory(prefillBook?.category || DEFAULT_CATEGORY);
    setNotes('');
    setError(null);
  }, [isOpen, prefillBook]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Please provide the book title.');
      return;
    }
    if (!currentUser) {
      setError('You must be signed in to submit a book request.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await api.createBookRequest({
        title: title.trim(),
        author: author.trim() || null,
        category: category,
        notes: notes.trim() || null,
        book_id: prefillBook?.book_id || null,
      });

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setTitle('');
        setAuthor('');
        setNotes('');
        onSuccess?.();
        onClose();
      }, 1800);
    } catch (err) {
      setError(err.message || 'Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="relative w-full max-w-lg bg-white border border-line rounded-lg shadow-soft overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-line">
          <div className="flex items-center gap-2.5">
            <div>
              <h2 className="text-base font-medium text-ink">
                Request Book / Acquisition
              </h2>
              <p className="text-xs text-muted">
                Submit a title for library procurement or book bank addition
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-muted hover:text-ink rounded hover:bg-shelf transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        {success ? (
          <div className="p-8 text-center space-y-3">
            <div className="inline-flex p-3 rounded-full bg-shelf text-muted border border-line">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-base font-medium text-ink">
              Book Request Submitted!
            </h3>
            <p className="text-sm text-body max-w-sm mx-auto">
              Your request for <span className="font-medium text-ink">"{title}"</span> has been logged. The Central Library desk will review it for curriculum procurement.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {error && (
              <div className="flex items-start gap-2.5 p-3 text-xs bg-shelf text-danger border border-line rounded">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Requesting Patron Info */}
            {currentUser && (
              <div className="flex items-center justify-between px-3 py-2 bg-shelf border border-line rounded text-xs">
                <span className="text-body font-medium">
                  Requesting Patron:
                </span>
                <span className="font-medium text-body">
                  {currentUser.full_name} ({currentUser.enrollment_no || 'Student'})
                </span>
              </div>
            )}

            {/* Title */}
            <div>
              <label className="block text-xs text-muted mb-1">
                Book Title <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Clean Code: A Handbook of Agile Software Craftsmanship"
                className="w-full px-3.5 py-2.5 bg-white border border-field rounded text-sm text-ink placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-ink focus:border-ink"
                required
              />
            </div>

            {/* Author */}
            <div>
              <label className="block text-xs text-muted mb-1">
                Author(s)
              </label>
              <input
                type="text"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="e.g. Robert C. Martin"
                className="w-full px-3.5 py-2.5 bg-white border border-field rounded text-sm text-ink placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-ink focus:border-ink"
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-xs text-muted mb-1">
                Academic Domain
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-field rounded text-sm text-ink focus:outline-none focus:ring-1 focus:ring-ink focus:border-ink"
              >
                {REQUEST_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Purpose / Notes */}
            <div>
              <label className="block text-xs text-muted mb-1">
                Course Requirement / Reason for Request
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Recommended reference for Semester 5 Distributed Systems & Microservices project..."
                rows={3}
                className="w-full px-3.5 py-2 bg-white border border-field rounded text-sm text-ink placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-ink focus:border-ink"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 text-xs font-medium text-body hover:text-ink rounded hover:bg-shelf transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex items-center gap-2 px-3 py-1.5 bg-accent hover:bg-accent-hover text-white text-sm font-medium rounded transition-colors disabled:opacity-50"
              >
                {submitting ? 'Submitting Request...' : 'Submit Request to Library'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
