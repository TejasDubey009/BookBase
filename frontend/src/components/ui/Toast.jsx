import { CheckCircle2, AlertTriangle, XCircle, Zap, X } from 'lucide-react';

export default function Toast({ toast, onDismiss }) {
  if (!toast) return null;

  const isWaitlistPromo = toast.type === 'waitlist_promo' || toast.status === 'AUTO_ASSIGNED_TO_WAITLIST';
  const isError = toast.type === 'error';
  const isWarning = toast.type === 'warning';

  return (
    <div className="fixed top-5 right-5 z-50 max-w-md w-full animate-in fade-in slide-in-from-top-4 duration-300">
      <div
        className={`p-4 rounded-xl border shadow-lg backdrop-blur-md flex items-start gap-3 transition-all ${
          isWaitlistPromo
            ? 'bg-amber-50/95 border-amber-300 text-amber-950 shadow-amber-100'
            : isError
            ? 'bg-rose-50/95 border-rose-300 text-rose-950 shadow-rose-100'
            : isWarning
            ? 'bg-amber-50/95 border-amber-300 text-amber-950 shadow-amber-100'
            : 'bg-emerald-50/95 border-emerald-300 text-emerald-950 shadow-emerald-100'
        }`}
      >
        <div className="flex-shrink-0 mt-0.5">
          {isWaitlistPromo ? (
            <div className="p-1.5 rounded-lg bg-amber-200 text-amber-800">
              <Zap className="w-5 h-5" />
            </div>
          ) : isError ? (
            <div className="p-1.5 rounded-lg bg-rose-200 text-rose-800">
              <XCircle className="w-5 h-5" />
            </div>
          ) : isWarning ? (
            <div className="p-1.5 rounded-lg bg-amber-200 text-amber-800">
              <AlertTriangle className="w-5 h-5" />
            </div>
          ) : (
            <div className="p-1.5 rounded-lg bg-emerald-200 text-emerald-800">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          )}
        </div>

        <div className="flex-1 text-sm">
          <div className="font-semibold text-xs tracking-wide uppercase mb-0.5 opacity-80">
            {isWaitlistPromo
              ? '⚡ FIFO Auto-Assignment Trigger Fired'
              : isError
              ? 'Database Constraint Alert'
              : isWarning
              ? 'System Notice'
              : 'ACID Transaction Committed'}
          </div>
          <div className="leading-snug">{toast.message}</div>
        </div>

        <button
          onClick={onDismiss}
          className="p-1 rounded-md hover:bg-black/5 text-slate-500 hover:text-slate-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
