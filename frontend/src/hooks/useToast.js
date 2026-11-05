import { useCallback, useState } from 'react';

const DEFAULT_TIMEOUT_MS = 4500;
const WAITLIST_HANDOFF_TIMEOUT_MS = 7000;

export function useToast() {
  const [toast, setToast] = useState(null);

  const showToast = useCallback((toastData) => {
    setToast(toastData);
    const timeout = toastData.status === 'AUTO_ASSIGNED_TO_WAITLIST' ? WAITLIST_HANDOFF_TIMEOUT_MS : DEFAULT_TIMEOUT_MS;
    setTimeout(() => {
      setToast((prev) => (prev === toastData ? null : prev));
    }, timeout);
  }, []);

  const dismissToast = useCallback(() => setToast(null), []);

  return { toast, showToast, dismissToast };
}
