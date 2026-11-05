import { Library } from 'lucide-react';
import { getPortalMeta } from '../../../constants/portals';

export default function PortalBrand({ activePortal, onClick }) {
  return (
    <button type="button" onClick={onClick} className="flex items-center gap-2 whitespace-nowrap">
      <Library className="w-5 h-5 text-ink" />
      <span className="text-base font-medium text-ink">BookBase</span>
      <span className="hidden lg:inline text-sm text-muted">{getPortalMeta(activePortal).label}</span>
    </button>
  );
}
