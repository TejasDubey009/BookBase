import { Monitor, Smartphone } from 'lucide-react';

export default function ShelfPortalBanner({ portal }) {
  if (portal === 'kiosk') {
    return (
      <div className="bg-indigo-900 text-indigo-100 p-4 rounded-2xl flex items-center justify-between border border-indigo-800 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-800 flex items-center justify-center text-white shrink-0">
            <Monitor className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-indigo-200">
              Library Kiosk Desk Mode (On-Premise Terminal)
            </div>
            <div className="text-xs text-indigo-100 font-medium">
              Self-service return station enabled. You can return physical copies directly below.
            </div>
          </div>
        </div>
        <span className="hidden sm:inline-block text-[11px] font-mono bg-indigo-800/80 px-2.5 py-1 rounded-lg border border-indigo-700">
          KIOSK-CIRCULATION-ACTIVE
        </span>
      </div>
    );
  }

  return (
    <div className="bg-emerald-900 text-emerald-100 p-4 rounded-2xl flex items-center justify-between border border-emerald-800 shadow-xs">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-emerald-800 flex items-center justify-center text-white shrink-0">
          <Smartphone className="w-5 h-5" />
        </div>
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-emerald-200">
            Student Personal Portal (Remote Access)
          </div>
          <div className="text-xs text-emerald-100 font-medium">
            Remote inquiry portal. Due dates are shown below. Physical returns must be processed at the Central Library Kiosk.
          </div>
        </div>
      </div>
      <span className="hidden sm:inline-block text-[11px] font-mono bg-emerald-800/80 px-2.5 py-1 rounded-lg border border-emerald-700">
        REMOTE-STUDENT-VIEW
      </span>
    </div>
  );
}
