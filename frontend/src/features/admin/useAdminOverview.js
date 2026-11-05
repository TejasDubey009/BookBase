import { useEffect, useState } from 'react';
import { api } from '../../api/bookbase';

/**
 * Data and actions for the librarian console. The matrix search lives here rather than in
 * its tab so that it survives switching between tabs.
 */
export function useAdminOverview({ showToast, lastEventTimestamp }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [groupedBooks, setGroupedBooks] = useState([]);
  const [matrixSearch, setMatrixSearch] = useState('');

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
    if (!window.confirm(`Settle and clear all outstanding fines for ${studentName}?`)) return;
    try {
      const resp = await api.settleFine(userId);
      showToast({ type: 'success', message: resp.message });
      fetchOverview();
    } catch (err) {
      showToast({ type: 'error', message: err.message });
    }
  };

  return { data, loading, groupedBooks, matrixSearch, searchMatrix, fetchOverview, updateRequestStatus, settleFine };
}
