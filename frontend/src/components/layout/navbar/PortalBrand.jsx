import { Library } from 'lucide-react';
import { getPortalMeta } from '../../../constants/portals';

export default function PortalBrand({ activePortal, onClick }) {
  const meta = getPortalMeta(activePortal);

  return (
    <div
      onClick={onClick}
      className="flex items-center gap-3 cursor-pointer select-none group"
    >
      <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-900 via-indigo-800 to-slate-900 text-white flex items-center justify-center shadow-xs group-hover:scale-105 group-hover:shadow-md transition-all">
        <Library className="w-5 h-5 text-indigo-100" />
      </div>
      <div>
        <div className="font-extrabold text-base tracking-tight text-slate-900 flex items-center gap-2">
          <span>BookBase</span>
          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border font-mono ${meta.badgeClassName}`}>
            {meta.badge}
          </span>
        </div>
        <div className="text-[11px] text-slate-500 font-medium truncate max-w-[260px]">
          {meta.tagline}
        </div>
      </div>
    </div>
  );
}
