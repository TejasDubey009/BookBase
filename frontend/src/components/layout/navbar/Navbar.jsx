import PortalBrand from './PortalBrand';
import PortalNav from './PortalNav';
import PortalSwitcher from './PortalSwitcher';
import ProfileMenu from './ProfileMenu';

export default function Navbar({
  activePortal,
  setActivePortal,
  currentView,
  setCurrentView,
  currentUser,
  onOpenAuth,
  onLogout,
  onOpenBookRequest,
  pendingRequestsCount = 0
}) {
  const handlePortalSwitch = (portal) => {
    setActivePortal(portal);
    if (portal === 'admin') {
      if (currentUser?.role !== 'admin') {
        onOpenAuth();
        return;
      }
      setCurrentView('admin-console');
    } else if (currentView === 'admin-console') {
      setCurrentView('catalog');
    }
  };

  const goHome = () => {
    if (activePortal === 'admin') setCurrentView('admin-console');
    else setCurrentView('catalog');
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-2xs transition-all">
      <PortalSwitcher activePortal={activePortal} onSwitch={handlePortalSwitch} pendingRequestsCount={pendingRequestsCount} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex items-center justify-between gap-4">
        <PortalBrand activePortal={activePortal} onClick={goHome} />
        <PortalNav
          activePortal={activePortal}
          currentView={currentView}
          setCurrentView={setCurrentView}
          currentUser={currentUser}
          onOpenBookRequest={onOpenBookRequest}
        />
        <ProfileMenu
          currentUser={currentUser}
          setActivePortal={setActivePortal}
          setCurrentView={setCurrentView}
          onOpenAuth={onOpenAuth}
          onLogout={onLogout}
        />
      </div>
    </header>
  );
}
