import { useState } from 'react';
import { X } from 'lucide-react';
import { api } from '../../api/bookbase';
import { coverUrlForIsbn, fetchBookByIsbn } from '../../api/openLibrary';
import { BOOK_CATEGORIES, DEFAULT_CATEGORY } from '../../constants/catalog';

const DEFAULT_CARD_TINT = 'indigo';

export default function AddBookModal({ isOpen, onClose, onSuccess, showToast }) {
  const [isbn, setIsbn] = useState('');
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [category, setCategory] = useState(DEFAULT_CATEGORY);
  const [publishedYear, setPublishedYear] = useState(new Date().getFullYear());
  const [description, setDescription] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [initialCopies, setInitialCopies] = useState(2);
  const [shelfLocation, setShelfLocation] = useState('Central Library • Stack Floor 2, Rack A-01');

  const [isLookingUp, setIsLookingUp] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  // Auto-fetch metadata from OpenLibrary API
  const handleOpenLibraryLookup = async () => {
    const cleanIsbn = isbn.replace(/[^0-9X]/gi, '');
    if (!cleanIsbn || cleanIsbn.length < 10) {
      showToast({ type: 'error', message: 'Please enter a valid 10 or 13 digit ISBN first.' });
      return;
    }

    setIsLookingUp(true);
    try {
      const bookData = await fetchBookByIsbn(cleanIsbn);

      if (bookData) {
        setTitle(bookData.title || title);
        if (bookData.authors && bookData.authors.length > 0) {
          setAuthor(bookData.authors.map(a => a.name).join(', '));
        }
        if (bookData.publish_date) {
          const match = bookData.publish_date.match(/\d{4}/);
          if (match) setPublishedYear(parseInt(match[0], 10));
        }
        // Set real high-res OpenLibrary cover
        const cover = bookData.cover?.large || bookData.cover?.medium || coverUrlForIsbn(cleanIsbn);
        setCoverUrl(cover);

        showToast({
          type: 'success',
          message: `Metadata auto-populated for "${bookData.title}" from OpenLibrary!`
        });
      } else {
        // Fallback default cover URL by ISBN
        setCoverUrl(coverUrlForIsbn(cleanIsbn));
        showToast({
          type: 'warning',
          message: 'Cover URL generated. Title and Author not found on OpenLibrary; please enter manually.'
        });
      }
    } catch (e) {
      setCoverUrl(coverUrlForIsbn(cleanIsbn));
    } finally {
      setIsLookingUp(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isbn || !title || !author) {
      showToast({ type: 'error', message: 'Please provide ISBN, Title, and Author.' });
      return;
    }

    const finalCover = coverUrl || coverUrlForIsbn(isbn.replace(/[^0-9X]/gi, ''));

    setIsSubmitting(true);
    try {
      await api.createBook({
        isbn: isbn.replace(/[^0-9X]/gi, ''),
        title,
        author,
        category,
        published_year: parseInt(publishedYear, 10),
        description,
        cover_url: finalCover,
        card_tint: DEFAULT_CARD_TINT,
        initial_copies_count: parseInt(initialCopies, 10),
        shelf_location: shelfLocation
      });

      showToast({
        type: 'success',
        message: `Curriculum book "${title}" and ${initialCopies} physical copies registered into Central Library catalog!`
      });
      onSuccess();
      onClose();
    } catch (err) {
      showToast({ type: 'error', message: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div 
        className="bg-white w-full max-w-2xl rounded-lg border border-line shadow-soft overflow-hidden max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-line flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-medium text-ink">
              Add New Title &amp; Physical Copies
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-line text-muted hover:text-ink transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1">
          {/* ISBN Field with OpenLibrary Lookup */}
          <div>
            <label className="block text-xs text-muted mb-1">
              ISBN-13 (Required)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                required
                placeholder="e.g. 9780131103627 (C Programming)"
                value={isbn}
                onChange={(e) => setIsbn(e.target.value)}
                className="flex-1 px-3.5 py-2 text-xs rounded border border-field bg-white focus:outline-none focus:ring-1 focus:ring-ink focus:border-ink"
              />
              <button
                type="button"
                onClick={handleOpenLibraryLookup}
                disabled={isLookingUp}
                className="px-3.5 py-2 rounded border border-field text-body hover:bg-shelf text-xs font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                <span>{isLookingUp ? 'Fetching...' : 'Lookup OpenLibrary'}</span>
              </button>
            </div>
            <p className="text-xs text-muted mt-1">
              Tip: Click "Lookup OpenLibrary" to auto-fetch Title, Author, Year, and Cover Image!
            </p>
          </div>

          {/* Title & Author */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-muted mb-1">
                Title
              </label>
              <input
                type="text"
                required
                placeholder="e.g. The C Programming Language"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded border border-field bg-white focus:outline-none focus:ring-1 focus:ring-ink focus:border-ink"
              />
            </div>

            <div>
              <label className="block text-xs text-muted mb-1">
                Author(s)
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Brian W. Kernighan, Dennis M. Ritchie"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded border border-field bg-white focus:outline-none focus:ring-1 focus:ring-ink focus:border-ink"
              />
            </div>
          </div>

          {/* Category & Year */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-muted mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded border border-field bg-white focus:outline-none focus:ring-1 focus:ring-ink focus:border-ink"
              >
                {BOOK_CATEGORIES.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs text-muted mb-1">
                Published Year
              </label>
              <input
                type="number"
                min="1800"
                max="2099"
                value={publishedYear}
                onChange={(e) => setPublishedYear(e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded border border-field bg-white focus:outline-none focus:ring-1 focus:ring-ink focus:border-ink"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs text-muted mb-1">
              Description / Synopsis
            </label>
            <textarea
              rows={2}
              placeholder="Brief summary of the book..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2 text-xs rounded border border-field bg-white focus:outline-none focus:ring-1 focus:ring-ink focus:border-ink"
            />
          </div>

          {/* Cover Image URL */}
          <div>
            <label className="block text-xs text-muted mb-1">
              Cover Image URL
            </label>
            <input
              type="url"
              placeholder="https://covers.openlibrary.org/b/isbn/..."
              value={coverUrl}
              onChange={(e) => setCoverUrl(e.target.value)}
              className="w-full px-3.5 py-2 text-xs rounded border border-field bg-white focus:outline-none focus:ring-1 focus:ring-ink focus:border-ink"
            />
          </div>

          {/* 3NF Initial Physical Inventory Instances */}
          <div className="p-4 rounded-lg bg-shelf border border-line space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-body">
                Initial Physical Copies Inventory
              </span>
              <span className="text-xs text-body bg-white px-2 py-0.5 rounded-full border border-line">
                Auto-Barcoded
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-muted mb-1">
                  Number of Physical Copies to Seed
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={initialCopies}
                  onChange={(e) => setInitialCopies(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded border border-line bg-white focus:outline-none focus:ring-1 focus:ring-ink"
                />
              </div>

              <div>
                <label className="block text-xs text-muted mb-1">
                  Shelf Location
                </label>
                <input
                  type="text"
                  value={shelfLocation}
                  onChange={(e) => setShelfLocation(e.target.value)}
                  placeholder="e.g. Floor 2 • Aisle 4A"
                  className="w-full px-3 py-1.5 text-xs rounded border border-line bg-white focus:outline-none focus:ring-1 focus:ring-ink"
                />
              </div>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded text-xs font-medium text-body hover:bg-shelf transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-3 py-1.5 rounded bg-accent hover:bg-accent-hover text-white text-sm font-medium transition-colors disabled:opacity-50"
            >
              <span>{isSubmitting ? 'Creating 3NF Records...' : 'Register Title & Copies'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
