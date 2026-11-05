import { getPortalMeta } from '../../../constants/portals';
import PortalBrand from './PortalBrand';
import PortalNav from './PortalNav';
import PortalStrip from './PortalStrip';
import ProfileMenu from './ProfileMenu';

export default function Navbar({
  activePortal,
  currentView,
  setCurrentView,
  currentUser,
  onOpenAuth,
  onLogout,
  onOpenBookRequest,
  pendingRequestsCount = 0
}) {
  const goHome = () => {
    if (activePortal === 'admin') setCurrentView('admin-console');
    else setCurrentView('catalog');
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-2xs transition-all">
      <PortalStrip activePortal={activePortal} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex items-center justify-between gap-4">
        <PortalBrand activePortal={activePortal} onClick={goHome} />
        <PortalNav
          activePortal={activePortal}
          currentView={currentView}
          setCurrentView={setCurrentView}
          currentUser={currentUser}
          onOpenBookRequest={onOpenBookRequest}
          pendingRequestsCount={pendingRequestsCount}
        />
        <ProfileMenu
          currentUser={currentUser}
          setCurrentView={setCurrentView}
          onOpenAuth={onOpenAuth}
          onLogout={onLogout}
          signInLabel={getPortalMeta(activePortal).signInLabel}
        />
      </div>
    </header>
  );
}
