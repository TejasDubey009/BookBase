import { Monitor, ShieldCheck, Smartphone } from 'lucide-react';
import { getPortalMeta } from '../../../constants/portals';

/** The dark top strip for switching between the three terminals. */
export default function PortalSwitcher({ activePortal, onSwitch, pendingRequestsCount }) {
  return (
    <div className="bg-slate-900 text-slate-300 text-xs px-4 sm:px-6 lg:px-8 py-2 border-b border-slate-800">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-[11px] font-medium text-slate-400">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>Select System Terminal:</span>
        </div>

        {/* 3 Portal Tabs */}
        <div className="flex items-center gap-1 bg-slate-800/90 p-0.5 rounded-xl border border-slate-700/80 font-medium">
          {/* Portal 1: Library Kiosk */}
          <button
            onClick={() => onSwitch('kiosk')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs transition-all ${
              activePortal === 'kiosk'
                ? 'bg-indigo-600 text-white font-bold shadow-xs'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
            }`}
          >
            <Monitor className="w-3.5 h-3.5" />
            <span>1. Library Kiosk (On-Premise)</span>
          </button>

          {/* Portal 2: Student Personal Portal */}
          <button
            onClick={() => onSwitch('student')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs transition-all ${
              activePortal === 'student'
                ? 'bg-indigo-600 text-white font-bold shadow-xs'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>2. Student Portal (Personal)</span>
          </button>

          {/* Portal 3: Admin Desk */}
          <button
            onClick={() => onSwitch('admin')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs transition-all ${
              activePortal === 'admin'
                ? 'bg-amber-600 text-white font-bold shadow-xs'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>3. Admin Portal (Librarian)</span>
            {pendingRequestsCount > 0 && (
              <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[9px] bg-amber-400 text-amber-950 font-bold">
                {pendingRequestsCount}
              </span>
            )}
          </button>
        </div>

        <div className="hidden lg:flex items-center gap-3 text-[11px] text-slate-400 font-mono">
          <span>Terminal: {getPortalMeta(activePortal).terminal}</span>
        </div>
      </div>
    </div>
  );
}
