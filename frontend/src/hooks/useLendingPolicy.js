import { useEffect, useState } from 'react';
import { api } from '../api/bookbase';

const NOT_LOADED = { fineRate: '—', loanDays: '—', maxLoans: '—' };

/** The lending rules from the backend, formatted for labels. Each shows a dash until it loads. */
export function useLendingPolicy() {
  const [policy, setPolicy] = useState(NOT_LOADED);

  useEffect(() => {
    api.getLendingPolicy()
      .then((rules) => setPolicy({
        fineRate: `₹${rules.overdue_fine_rate_per_day.toFixed(2)}`,
        loanDays: rules.loan_duration_days,
        maxLoans: rules.max_loans_per_user,
      }))
      .catch((err) => console.error('Failed to load lending policy:', err));
  }, []);

  return policy;
}
