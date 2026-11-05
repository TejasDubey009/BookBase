import { useEffect, useState } from 'react';
import { api } from '../api/bookbase';

/** The daily overdue fine from the backend, formatted for labels. Shows a dash until it loads. */
export function useFineRate() {
  const [rate, setRate] = useState(null);

  useEffect(() => {
    api.getLendingPolicy()
      .then((policy) => setRate(policy.overdue_fine_rate_per_day))
      .catch((err) => console.error('Failed to load lending policy:', err));
  }, []);

  return rate === null ? '—' : `₹${rate.toFixed(2)}`;
}
