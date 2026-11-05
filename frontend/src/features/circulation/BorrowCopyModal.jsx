import { useState } from 'react';
import { api } from '../../api/bookbase';
import CopyDialog, { FIELD_CLASSES } from './CopyDialog';

/**
 * Borrowing links one physical copy to the student's profile, so the student gives the unique code
 * on that copy's label. The copies on the shelf are listed too, and clicking one fills in its code.
 */
export default function BorrowCopyModal({ book, onClose, onBorrowed, showToast }) {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);

  const availableCopies = (book.copies || []).filter((copy) => copy.status === 'Available');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const resp = await api.checkoutBook(book.book_id, code.trim());
      showToast({ type: 'success', message: resp.message });
      onBorrowed();
      onClose();
    } catch (err) {
      showToast({ type: 'error', message: err.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <CopyDialog
      title="Borrow this book"
      subtitle={book.title}
      submitLabel="Borrow"
      busyLabel="Borrowing..."
      busy={busy}
      onSubmit={handleSubmit}
      onClose={onClose}
    >
      <div>
        <label htmlFor="borrow-code" className="block text-xs text-muted mb-1">Copy code</label>
        <input
          id="borrow-code"
          type="text"
          required
          autoFocus
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Printed on the book's label"
          className={FIELD_CLASSES}
        />
      </div>

      {availableCopies.length > 0 && (
        <div>
          <div className="text-xs text-muted mb-1">On the shelf now</div>
          <div className="flex flex-wrap gap-1.5">
            {availableCopies.map((copy) => (
              <button
                key={copy.copy_id}
                type="button"
                onClick={() => setCode(copy.barcode)}
                className={`px-2 py-1 rounded border text-xs transition-colors ${
                  code.trim().toUpperCase() === copy.barcode.toUpperCase()
                    ? 'border-ink text-ink'
                    : 'border-field text-body hover:bg-shelf'
                }`}
              >
                {copy.barcode} <span className="text-muted">· {copy.condition}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </CopyDialog>
  );
}
