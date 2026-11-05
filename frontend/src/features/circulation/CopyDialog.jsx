import { X } from 'lucide-react';

export const FIELD_CLASSES =
  'w-full px-3 py-2 text-sm rounded border border-field bg-white text-ink focus:outline-none focus:ring-1 focus:ring-ink focus:border-ink';

/** The frame shared by the borrow and return dialogs: a heading, a form and two buttons. */
export default function CopyDialog({ title, subtitle, submitLabel, busyLabel, busy, onSubmit, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white w-full max-w-md rounded-lg border border-line shadow-soft overflow-hidden">
        <div className="px-6 py-4 border-b border-line flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-base font-medium text-ink">{title}</h2>
            <p className="mt-0.5 text-xs text-muted line-clamp-2">{subtitle}</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-1.5 -mr-1.5 text-muted hover:text-ink rounded hover:bg-shelf transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="p-6 space-y-4">
          {children}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded border border-field text-sm text-body hover:bg-shelf transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className="px-3 py-1.5 rounded bg-accent hover:bg-accent-hover text-white text-sm font-medium transition-colors disabled:opacity-50"
            >
              {busy ? busyLabel : submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
