import { useEffect, useState } from 'react';
import { api } from '../api/bookbase';

const NOT_LOADED = { fineRate: '—', fineRule: '—', loanDays: '—', maxLoans: '—', copyConditions: [] };

/** The lending rules from the backend, formatted for labels. Each shows a dash until it loads. */
export function useLendingPolicy() {
  const [policy, setPolicy] = useState(NOT_LOADED);

  useEffect(() => {
    api.getLendingPolicy()
      .then((rules) => {
        const fineRate = `₹${rules.overdue_fine_rate_per_day.toFixed(2)}`;
        setPolicy({
          fineRate,
          fineRule: `${fineRate} per day, for up to ${rules.max_fine_days} days`,
          loanDays: rules.loan_duration_days,
          maxLoans: rules.max_loans_per_user,
          copyConditions: rules.copy_conditions,
        });
      })
      .catch((err) => console.error('Failed to load lending policy:', err));
  }, []);

  return policy;
}
