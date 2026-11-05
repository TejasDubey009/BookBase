import { useState } from 'react';
import { api } from '../api/bookbase';

/** Borrow and waitlist actions, with their toasts and per-item loading state. */
export function useCirculationActions({ activePortal, currentUser, showToast, notifyDataChanged, openAuthModal, openBorrowDialog }) {
  const [loadingActionId, setLoadingActionId] = useState(null);

  // Physical borrowing is only possible at the kiosk, and starts by asking for the copy's code
  const handleBorrow = (book) => {
    if (activePortal === 'student') {
      showToast({
        type: 'warning',
        message: 'Borrowing isn\'t available on the Student Portal. Please use the Library Kiosk.'
      });
      return;
    }

    if (!currentUser) {
      openAuthModal();
      showToast({ type: 'warning', message: 'Please sign in with your Enrollment Number to borrow books.' });
      return;
    }
    openBorrowDialog(book);
  };

  const handleJoinWaitlist = async (bookId) => {
    if (!currentUser) {
      openAuthModal();
      showToast({ type: 'warning', message: 'Please sign in to join the course reservation waitlist.' });
      return;
    }
    setLoadingActionId(bookId);
    try {
      const resp = await api.joinWaitlist(bookId);
      showToast({ type: 'waitlist_promo', message: resp.message });
      notifyDataChanged();
    } catch (err) {
      showToast({ type: 'error', message: err.message });
    } finally {
      setLoadingActionId(null);
    }
  };

  const handleCancelWaitlist = async (reservationId) => {
    try {
      const resp = await api.cancelWaitlist(reservationId);
      showToast({ type: 'success', message: resp.message });
      notifyDataChanged();
    } catch (err) {
      showToast({ type: 'error', message: err.message });
    }
  };

  return { loadingActionId, handleBorrow, handleJoinWaitlist, handleCancelWaitlist };
}
