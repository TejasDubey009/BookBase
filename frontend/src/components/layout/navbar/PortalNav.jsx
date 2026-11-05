import { ArrowRightLeft, BookOpen, BookPlus, Clock, HelpCircle, ShieldCheck } from 'lucide-react';

function NavTab({ active, onClick, relative = false, children }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl transition-all${relative ? ' relative' : ''} ${
        active
          ? 'bg-white text-indigo-700 shadow-xs'
          : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
      }`}
    >
      {children}
    </button>
  );
}

function NavAction({ onClick, icon: Icon, children }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-slate-600 hover:text-indigo-600 hover:bg-white/50 transition-all"
    >
      <Icon className="w-3.5 h-3.5 text-indigo-500" />
      <span>{children}</span>
    </button>
  );
}

function ShelfTab({ currentView, setCurrentView, currentUser, children }) {
  return (
    <NavTab active={currentView === 'my-shelf'} onClick={() => setCurrentView('my-shelf')} relative>
      {children}
      {currentUser.active_loans_count > 0 && (
        <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-indigo-100 text-indigo-700 font-mono font-bold">
          {currentUser.active_loans_count}
        </span>
      )}
    </NavTab>
  );
}

function KioskNav({ currentView, setCurrentView, currentUser, onOpenBookRequest }) {
  return (
    <>
      <NavTab active={currentView === 'catalog'} onClick={() => setCurrentView('catalog')}>
        <BookOpen className="w-4 h-4 text-indigo-600" />
        <span>Kiosk Catalog (Borrow)</span>
      </NavTab>

      {currentUser && (
        <ShelfTab currentView={currentView} setCurrentView={setCurrentView} currentUser={currentUser}>
          <ArrowRightLeft className="w-4 h-4 text-emerald-600" />
          <span>Return Books</span>
        </ShelfTab>
      )}

      <NavAction onClick={onOpenBookRequest} icon={BookPlus}>Request Title</NavAction>
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
        <BookOpen className="w-4 h-4 text-indigo-600" />
        <span>Catalog (Browse Only)</span>
      </NavTab>

      {currentUser && (
        <ShelfTab currentView={currentView} setCurrentView={setCurrentView} currentUser={currentUser}>
          <Clock className="w-4 h-4 text-indigo-600" />
          <span>Due Dates &amp; Shelf</span>
        </ShelfTab>
      )}

      <NavAction onClick={onOpenBookRequest} icon={BookPlus}>Book Request</NavAction>
      <NavAction onClick={openHelpDesk} icon={HelpCircle}>Help Desk</NavAction>
    </>
  );
}

function AdminNav({ currentView, setCurrentView, pendingRequestsCount }) {
  return (
    <>
      <NavTab active={currentView === 'admin-console'} onClick={() => setCurrentView('admin-console')}>
        <ShieldCheck className="w-4 h-4 text-indigo-600" />
        <span>Circulation Desk</span>
        {pendingRequestsCount > 0 && (
          <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[9px] bg-amber-400 text-amber-950 font-bold">
            {pendingRequestsCount}
          </span>
        )}
      </NavTab>

      <NavTab active={currentView === 'catalog'} onClick={() => setCurrentView('catalog')}>
        <BookOpen className="w-4 h-4 text-indigo-600" />
        <span>Public Catalog</span>
      </NavTab>
    </>
  );
}

/** The centre tabs, which change with the active portal. */
export default function PortalNav({ activePortal, currentView, setCurrentView, currentUser, onOpenBookRequest, pendingRequestsCount }) {
  // Every admin screen needs a librarian account, so signed-out visitors get no tabs at all
  if (activePortal === 'admin' && currentUser?.role !== 'admin') return null;

  return (
    <nav className="hidden md:flex items-center gap-1.5 bg-slate-100/90 p-1.5 rounded-2xl border border-slate-200/70 text-xs font-semibold">
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
