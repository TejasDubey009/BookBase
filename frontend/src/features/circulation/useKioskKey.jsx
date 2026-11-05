import { useState } from 'react';
import { saveKioskKey } from '../../api/bookbase';
import { FIELD_CLASSES } from './CopyDialog';

/**
 * The server only takes a student's borrow or return through a registered kiosk. If this browser
 * isn't one, a dialog shows this field, a librarian enters the kiosk key once, and the browser then
 * remembers it.
 */
export function useKioskKey() {
  const [needed, setNeeded] = useState(false);
  const [entered, setEntered] = useState('');
  const key = entered.trim();

  return {
    keyToSend: key || undefined, // undefined sends the key this browser already has, if any
    remember: () => {
      if (key) saveKioskKey(key);
    },
    noteError: (err) => {
      if (err.hint === 'kiosk_key_required') setNeeded(true);
    },
    field: needed && (
      <div>
        <label htmlFor="kiosk-key" className="block text-xs text-muted mb-1">Kiosk key</label>
        <input
          id="kiosk-key"
          type="password"
          required
          autoFocus
          autoComplete="off"
          value={entered}
          onChange={(e) => setEntered(e.target.value)}
          className={FIELD_CLASSES}
        />
        <p className="mt-1 text-xs text-muted">
          This device isn't registered as a Library Kiosk. A librarian can enter the kiosk key once to register it.
        </p>
      </div>
    ),
  };
}
