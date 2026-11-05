import { useState } from 'react';
import { api } from '../api/bookbase';

/** Borrow, waitlist and return actions, with their toasts and per-item loading state. */
export function useCirculationActions({ activePortal, currentUser, showToast, notifyDataChanged, openAuthModal }) {
  const [loadingActionId, setLoadingActionId] = useState(null);

  // Physical borrowing is only possible at the kiosk
  const handleBorrow = async (bookId) => {
    if (activePortal === 'student') {
      showToast({
        type: 'warning',
        message: 'Physical borrowing is disabled in Remote Student Portal. Please visit the Central Library Kiosk to check out copies.'
      });
      return;
    }

    if (!currentUser) {
      openAuthModal();
      showToast({ type: 'warning', message: 'Please sign in with your Enrollment Number to borrow books.' });
      return;
    }
    setLoadingActionId(bookId);
    try {
      const resp = await api.checkoutBook(currentUser.user_id, bookId);
      showToast({ type: 'success', message: resp.message });
      notifyDataChanged();
    } catch (err) {
      showToast({ type: 'error', message: err.message });
    } finally {
      setLoadingActionId(null);
    }
  };

  const handleJoinWaitlist = async (bookId) => {
    if (!currentUser) {
      openAuthModal();
      showToast({ type: 'warning', message: 'Please sign in to join the course reservation waitlist.' });
      return;
    }
    setLoadingActionId(bookId);
    try {
      const resp = await api.joinWaitlist(currentUser.user_id, bookId);
      showToast({ type: 'waitlist_promo', message: resp.message });
      notifyDataChanged();
    } catch (err) {
      showToast({ type: 'error', message: err.message });
    } finally {
      setLoadingActionId(null);
    }
  };

  // A return may hand the copy straight to the next patron in the FIFO waitlist
  const handleReturn = async (loanId) => {
    setLoadingActionId(loanId);
    try {
      const resp = await api.returnBook(loanId);
      if (resp.status === 'AUTO_ASSIGNED_TO_WAITLIST') {
        showToast({ type: 'waitlist_promo', status: 'AUTO_ASSIGNED_TO_WAITLIST', message: resp.message });
      } else {
        showToast({ type: 'success', message: resp.message });
      }
      notifyDataChanged();
      return resp;
    } catch (err) {
      showToast({ type: 'error', message: err.message });
      throw err;
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

  return { loadingActionId, handleBorrow, handleJoinWaitlist, handleReturn, handleCancelWaitlist };
}
