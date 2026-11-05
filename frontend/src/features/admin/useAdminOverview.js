import { useEffect, useState } from 'react';
import { api } from '../../api/bookbase';

/**
 * Data and actions for the librarian console. The matrix search lives here rather than in
 * its tab so that it survives switching between tabs.
 */
export function useAdminOverview({ showToast, lastEventTimestamp, notifyDataChanged }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [groupedBooks, setGroupedBooks] = useState([]);
  const [matrixSearch, setMatrixSearch] = useState('');
  const [busyReturnId, setBusyReturnId] = useState(null);

  const fetchOverview = () => {
    setLoading(true);
    api.getAdminOverview()
      .then((res) => {
        setData(res);
        setGroupedBooks(res.grouped_books || []);
        setLoading(false);
      })
      .catch((err) => {
        showToast({ type: 'error', message: err.message });
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchOverview();
  }, [lastEventTimestamp]);

  const searchMatrix = (search) => {
    setMatrixSearch(search);
    api.getGroupedBooks(search)
      .then(setGroupedBooks)
      .catch((err) => {
        console.error('Error fetching grouped books:', err);
      });
  };

  const updateRequestStatus = async (requestId, newStatus) => {
    try {
      await api.updateBookRequestStatus(requestId, newStatus);
      showToast({ type: 'success', message: `Request status updated to ${newStatus}.` });
      fetchOverview();
    } catch (err) {
      showToast({ type: 'error', message: err.message });
    }
  };

  const settleFine = async (userId, studentName) => {
    if (!window.confirm(`Mark all of ${studentName}'s fines as paid?`)) return;
    try {
      const resp = await api.settleFine(userId);
      showToast({ type: 'success', message: resp.message });
      fetchOverview();
    } catch (err) {
      showToast({ type: 'error', message: err.message });
    }
  };

  // Confirming may hand the copy straight to the next patron in the FIFO waitlist
  const confirmReturn = async (returnRequestId, condition) => {
    setBusyReturnId(returnRequestId);
    try {
      const resp = await api.confirmReturnRequest(returnRequestId, condition);
      if (resp.status === 'AUTO_ASSIGNED_TO_WAITLIST') {
        showToast({ type: 'waitlist_promo', status: 'AUTO_ASSIGNED_TO_WAITLIST', message: resp.message });
      } else {
        showToast({ type: 'success', message: resp.message });
      }
      notifyDataChanged();
    } catch (err) {
      showToast({ type: 'error', message: err.message });
      fetchOverview();
    } finally {
      setBusyReturnId(null);
    }
  };

  const rejectReturn = async (returnRequestId, title) => {
    if (!window.confirm(`Reject the return request for "${title}"? The book stays on the student's loan.`)) return;
    setBusyReturnId(returnRequestId);
    try {
      const resp = await api.rejectReturnRequest(returnRequestId);
      showToast({ type: 'success', message: resp.message });
      notifyDataChanged();
    } catch (err) {
      showToast({ type: 'error', message: err.message });
      fetchOverview();
    } finally {
      setBusyReturnId(null);
    }
  };

  return {
    data,
    loading,
    groupedBooks,
    matrixSearch,
    searchMatrix,
    fetchOverview,
    updateRequestStatus,
    settleFine,
    busyReturnId,
    confirmReturn,
    rejectReturn,
  };
}
