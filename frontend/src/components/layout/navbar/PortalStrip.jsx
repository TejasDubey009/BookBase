import { getPortalMeta } from '../../../constants/portals';

/** The dark top strip naming the site and terminal the user is on. */
export default function PortalStrip({ activePortal }) {
  const meta = getPortalMeta(activePortal);

  return (
    <div className="bg-slate-900 text-slate-300 text-xs px-4 sm:px-6 lg:px-8 py-2 border-b border-slate-800">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-[11px] font-medium text-slate-400">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>{meta.name}</span>
        </div>
        <span className="hidden sm:inline text-[11px] text-slate-400 font-mono">
          Terminal: {meta.terminal}
        </span>
      </div>
    </div>
  );
}
