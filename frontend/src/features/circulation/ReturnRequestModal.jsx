import { useState } from 'react';
import { api } from '../../api/bookbase';
import CopyDialog, { FIELD_CLASSES } from './CopyDialog';
import { useKioskKey } from './useKioskKey';

/**
 * A student asks to return a loan. The code proves which physical copy is being handed in, which
 * matters when two identical books come back on the same day. A librarian then confirms the return.
 */
export default function ReturnRequestModal({ loan, conditions, onClose, onRaised, showToast }) {
  const [code, setCode] = useState('');
  const [condition, setCondition] = useState('Good');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const kiosk = useKioskKey();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const resp = await api.raiseReturnRequest(
        { loan_id: loan.loan_id, barcode: code.trim(), condition, notes: notes.trim() },
        kiosk.keyToSend,
      );
      kiosk.remember();
      showToast({ type: 'success', message: resp.message });
      onRaised();
      onClose();
    } catch (err) {
      kiosk.noteError(err);
      showToast({ type: 'error', message: err.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <CopyDialog
      title="Request a return"
      subtitle={loan.title}
      submitLabel="Send to Librarian"
      busyLabel="Sending..."
      busy={busy}
      onSubmit={handleSubmit}
      onClose={onClose}
    >
      <div>
        <label htmlFor="return-code" className="block text-xs text-muted mb-1">Copy code</label>
        <input
          id="return-code"
          type="text"
          required
          autoFocus
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Printed on the book's label"
          className={FIELD_CLASSES}
        />
        <p className="mt-1 text-xs text-muted">You borrowed copy {loan.barcode}.</p>
      </div>

      <div>
        <label htmlFor="return-condition" className="block text-xs text-muted mb-1">Condition of the book</label>
        <select
          id="return-condition"
          value={condition}
          onChange={(e) => setCondition(e.target.value)}
          className={FIELD_CLASSES}
        >
          {conditions.map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
      </div>

      <div>
        <label htmlFor="return-notes" className="block text-xs text-muted mb-1">Notes (optional)</label>
        <input
          id="return-notes"
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="For example, a torn page"
          className={FIELD_CLASSES}
        />
      </div>

      {kiosk.field}
    </CopyDialog>
  );
}
