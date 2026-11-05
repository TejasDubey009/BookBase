const TAB_CLASSES = 'flex items-center gap-1.5 h-14 border-b-2 whitespace-nowrap transition-colors';
const IDLE_CLASSES = 'border-transparent text-muted hover:text-ink';

function NavTab({ active, onClick, children }) {
  return (
    <button onClick={onClick} className={`${TAB_CLASSES} ${active ? 'border-ink text-ink' : IDLE_CLASSES}`}>
      {children}
    </button>
  );
}

function NavAction({ onClick, children }) {
  return (
    <button onClick={onClick} className={`${TAB_CLASSES} ${IDLE_CLASSES}`}>
      {children}
    </button>
  );
}

function Count({ value }) {
  if (!value) return null;
  return <span className="text-xs text-muted tabular-nums">{value}</span>;
}

function ShelfTab({ currentView, setCurrentView, currentUser, children }) {
  return (
    <NavTab active={currentView === 'my-shelf'} onClick={() => setCurrentView('my-shelf')}>
      {children}
      <Count value={currentUser.active_loans_count} />
    </NavTab>
  );
}

function KioskNav({ currentView, setCurrentView, currentUser, onOpenBookRequest }) {
  return (
    <>
      <NavTab active={currentView === 'catalog'} onClick={() => setCurrentView('catalog')}>
        Kiosk Catalog (Borrow)
      </NavTab>

      {currentUser && (
        <ShelfTab currentView={currentView} setCurrentView={setCurrentView} currentUser={currentUser}>
          Return Books
        </ShelfTab>
      )}

      <NavAction onClick={onOpenBookRequest}>Request Title</NavAction>
    </>
  );
}

function StudentNav({ currentView, setCurrentView, currentUser, onOpenBookRequest }) {
  const openHelpDesk = () => {
    if (currentView !== 'my-shelf') setCurrentView('my-shelf');
    setTimeout(() => {
      document.getElementById('helpdesk-section')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  return (
    <>
      <NavTab active={currentView === 'catalog'} onClick={() => setCurrentView('catalog')}>
        Catalog (Browse Only)
      </NavTab>

      {currentUser && (
        <ShelfTab currentView={currentView} setCurrentView={setCurrentView} currentUser={currentUser}>
          Due Dates &amp; Shelf
        </ShelfTab>
      )}

      <NavAction onClick={onOpenBookRequest}>Book Request</NavAction>
      <NavAction onClick={openHelpDesk}>Help Desk</NavAction>
    </>
  );
}

function AdminNav({ currentView, setCurrentView, pendingRequestsCount }) {
  return (
    <>
      <NavTab active={currentView === 'admin-console'} onClick={() => setCurrentView('admin-console')}>
        Circulation Desk
        <Count value={pendingRequestsCount} />
      </NavTab>

      <NavTab active={currentView === 'catalog'} onClick={() => setCurrentView('catalog')}>
        Public Catalog
      </NavTab>
    </>
  );
}

/** The centre tabs, which change with the active portal. */
export default function PortalNav({ activePortal, currentView, setCurrentView, currentUser, onOpenBookRequest, pendingRequestsCount }) {
  // Every admin screen needs a librarian account, so signed-out visitors get no tabs at all
  if (activePortal === 'admin' && currentUser?.role !== 'admin') return null;

  return (
    <nav className="hidden md:flex items-center gap-5 mr-auto text-sm relative top-px">
      {activePortal === 'kiosk' && (
        <KioskNav currentView={currentView} setCurrentView={setCurrentView} currentUser={currentUser} onOpenBookRequest={onOpenBookRequest} />
      )}
      {activePortal === 'student' && (
        <StudentNav currentView={currentView} setCurrentView={setCurrentView} currentUser={currentUser} onOpenBookRequest={onOpenBookRequest} />
      )}
      {activePortal === 'admin' && (
        <AdminNav currentView={currentView} setCurrentView={setCurrentView} pendingRequestsCount={pendingRequestsCount} />
      )}
    </nav>
  );
}
