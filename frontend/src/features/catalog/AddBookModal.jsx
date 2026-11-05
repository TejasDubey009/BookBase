import { useState } from 'react';
import { X, Plus, BookOpen, Sparkles } from 'lucide-react';
import { api } from '../../api/bookbase';
import { coverUrlForIsbn, fetchBookByIsbn } from '../../api/openLibrary';
import { BOOK_CATEGORIES, DEFAULT_CATEGORY } from '../../constants/catalog';

const TINTS = [
  { id: 'indigo', name: 'Indigo Pastel' },
  { id: 'emerald', name: 'Emerald Pastel' },
  { id: 'amber', name: 'Amber Pastel' },
  { id: 'rose', name: 'Rose Pastel' },
  { id: 'cyan', name: 'Cyan Pastel' },
  { id: 'purple', name: 'Purple Pastel' },
];

export default function AddBookModal({ isOpen, onClose, onSuccess, showToast }) {
  const [isbn, setIsbn] = useState('');
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [category, setCategory] = useState(DEFAULT_CATEGORY);
  const [publishedYear, setPublishedYear] = useState(new Date().getFullYear());
  const [description, setDescription] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [cardTint, setCardTint] = useState('indigo');
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
        card_tint: cardTint,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white w-full max-w-2xl rounded-3xl border border-slate-200/90 shadow-2xl overflow-hidden max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-indigo-600" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">
              Add New Title &amp; Physical Copies
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1">
          {/* ISBN Field with OpenLibrary Lookup */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              ISBN-13 (Required)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                required
                placeholder="e.g. 9780131103627 (C Programming)"
                value={isbn}
                onChange={(e) => setIsbn(e.target.value)}
                className="flex-1 px-3.5 py-2 text-xs font-mono rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
              <button
                type="button"
                onClick={handleOpenLibraryLookup}
                disabled={isLookingUp}
                className="px-3.5 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/80 text-xs font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                <span>{isLookingUp ? 'Fetching...' : 'Lookup OpenLibrary'}</span>
              </button>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Tip: Click "Lookup OpenLibrary" to auto-fetch Title, Author, Year, and Cover Image!
            </p>
          </div>

          {/* Title & Author */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Title
              </label>
              <input
                type="text"
                required
                placeholder="e.g. The C Programming Language"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Author(s)
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Brian W. Kernighan, Dennis M. Ritchie"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Category, Year & Card Tint */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              >
                {BOOK_CATEGORIES.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Published Year
              </label>
              <input
                type="number"
                min="1800"
                max="2099"
                value={publishedYear}
                onChange={(e) => setPublishedYear(e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Bento Accent Tint
              </label>
              <select
                value={cardTint}
                onChange={(e) => setCardTint(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              >
                {TINTS.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Description / Synopsis
            </label>
            <textarea
              rows={2}
              placeholder="Brief summary of the book..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          {/* Cover Image URL */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Cover Image URL
            </label>
            <input
              type="url"
              placeholder="https://covers.openlibrary.org/b/isbn/..."
              value={coverUrl}
              onChange={(e) => setCoverUrl(e.target.value)}
              className="w-full px-3.5 py-2 text-xs font-mono rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          {/* 3NF Initial Physical Inventory Instances */}
          <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-950">
                Initial Physical Copies Inventory
              </span>
              <span className="text-[10px] font-mono text-indigo-700 bg-white px-2 py-0.5 rounded-full border border-indigo-200">
                Auto-Barcoded
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-indigo-900 mb-1">
                  Number of Physical Copies to Seed
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={initialCopies}
                  onChange={(e) => setInitialCopies(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-indigo-200 bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-indigo-900 mb-1">
                  Shelf Location
                </label>
                <input
                  type="text"
                  value={shelfLocation}
                  onChange={(e) => setShelfLocation(e.target.value)}
                  placeholder="e.g. Floor 2 • Aisle 4A"
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-indigo-200 bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Creating 3NF Records...' : 'Register Title & Copies'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
