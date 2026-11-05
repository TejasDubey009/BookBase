import { CheckCircle2, AlertTriangle, XCircle, Zap, X } from 'lucide-react';

function toastIcon(toast) {
  if (toast.type === 'waitlist_promo' || toast.status === 'AUTO_ASSIGNED_TO_WAITLIST') return <Zap className="w-4 h-4 text-body" />;
  if (toast.type === 'error') return <XCircle className="w-4 h-4 text-danger" />;
  if (toast.type === 'warning') return <AlertTriangle className="w-4 h-4 text-body" />;
  return <CheckCircle2 className="w-4 h-4 text-accent" />;
}

export default function Toast({ toast, onDismiss }) {
  if (!toast) return null;

  return (
    <div className="fixed top-5 right-5 z-50 w-[calc(100%-2.5rem)] max-w-sm">
      <div className="p-3.5 rounded-lg bg-white border border-line shadow-soft flex items-start gap-3 text-sm text-body">
        <div className="flex-shrink-0 mt-0.5">{toastIcon(toast)}</div>
        <p className="flex-1 leading-snug">{toast.message}</p>
        <button
          onClick={onDismiss}
          aria-label="Dismiss"
          className="p-0.5 rounded text-muted hover:text-ink transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
