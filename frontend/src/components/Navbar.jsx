import React, { useState } from 'react';
import { 
  BookOpen, 
  Layers, 
  User, 
  ShieldCheck, 
  LogOut, 
  LogIn, 
  ChevronDown, 
  GraduationCap,
  Library,
  ArrowRightLeft,
  PhoneCall,
  MapPin,
  Monitor,
  Smartphone,
  BookPlus,
  HelpCircle,
  Clock,
  DollarSign,
  Table
} from 'lucide-react';

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
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  // Derive user initials
  const getInitials = (name) => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  const isAdmin = currentUser?.role === 'admin';
  const isMember = currentUser?.role === 'member';

  const scrollToFooter = () => {
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
  };

  const handlePortalSwitch = (portal) => {
    setActivePortal(portal);
    if (portal === 'admin') {
      if (!isAdmin) {
        onOpenAuth();
        return;
      }
      setCurrentView('admin-console');
    } else if (portal === 'student') {
      if (currentView === 'admin-console') {
        setCurrentView('catalog');
      }
    } else if (portal === 'kiosk') {
      if (currentView === 'admin-console') {
        setCurrentView('catalog');
      }
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-2xs transition-all">
      {/* Top Banner: 3 Master Portals Selector */}
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
              onClick={() => handlePortalSwitch('kiosk')}
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
              onClick={() => handlePortalSwitch('student')}
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
              onClick={() => handlePortalSwitch('admin')}
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
            <span>Terminal: {activePortal === 'kiosk' ? 'DESK-KIOSK-01' : activePortal === 'student' ? 'REMOTE-CLIENT' : 'STAFF-CONSOLE'}</span>
          </div>
        </div>
      </div>

      {/* Main Navigation Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex items-center justify-between gap-4">
        
        {/* Brand Logo & Current Portal Badge */}
        <div 
          onClick={() => {
            if (activePortal === 'admin') setCurrentView('admin-console');
            else setCurrentView('catalog');
          }}
          className="flex items-center gap-3 cursor-pointer select-none group"
        >
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-900 via-indigo-800 to-slate-900 text-white flex items-center justify-center shadow-xs group-hover:scale-105 group-hover:shadow-md transition-all">
            <Library className="w-5 h-5 text-indigo-100" />
          </div>
          <div>
            <div className="font-extrabold text-base tracking-tight text-slate-900 flex items-center gap-2">
              <span>BookBase</span>
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border font-mono ${
                activePortal === 'kiosk'
                  ? 'bg-indigo-50 text-indigo-800 border-indigo-200'
                  : activePortal === 'student'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-amber-50 text-amber-800 border-amber-200'
              }`}>
                {activePortal === 'kiosk' ? 'Kiosk Terminal' : activePortal === 'student' ? 'Student Portal' : 'Admin Console'}
              </span>
            </div>
            <div className="text-[11px] text-slate-500 font-medium truncate max-w-[260px]">
              {activePortal === 'kiosk' 
                ? 'On-Premise Physical Borrow & Return Station'
                : activePortal === 'student'
                ? 'Personal Due Dates, Requests & Discovery'
                : 'Central Catalog, Borrowers Matrix & Fines'}
            </div>
          </div>
        </div>

        {/* Center Contextual Navigation Tabs */}
        <nav className="hidden md:flex items-center gap-1.5 bg-slate-100/90 p-1.5 rounded-2xl border border-slate-200/70 text-xs font-semibold">
          
          {/* KIOSK PORTAL NAVIGATION */}
          {activePortal === 'kiosk' && (
            <>
              <button
                onClick={() => setCurrentView('catalog')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl transition-all ${
                  currentView === 'catalog'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                }`}
              >
                <BookOpen className="w-4 h-4 text-indigo-600" />
                <span>Kiosk Catalog (Borrow)</span>
              </button>

              {currentUser && (
                <button
                  onClick={() => setCurrentView('my-shelf')}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl transition-all relative ${
                    currentView === 'my-shelf'
                      ? 'bg-white text-indigo-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                  }`}
                >
                  <ArrowRightLeft className="w-4 h-4 text-emerald-600" />
                  <span>Return Books</span>
                  {currentUser.active_loans_count > 0 && (
                    <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-indigo-100 text-indigo-700 font-mono font-bold">
                      {currentUser.active_loans_count}
                    </span>
                  )}
                </button>
              )}

              <button
                onClick={onOpenBookRequest}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-slate-600 hover:text-indigo-600 hover:bg-white/50 transition-all"
              >
                <BookPlus className="w-3.5 h-3.5 text-indigo-500" />
                <span>Request Title</span>
              </button>
            </>
          )}

          {/* STUDENT PERSONAL PORTAL NAVIGATION */}
          {activePortal === 'student' && (
            <>
              <button
                onClick={() => setCurrentView('catalog')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl transition-all ${
                  currentView === 'catalog'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                }`}
              >
                <BookOpen className="w-4 h-4 text-indigo-600" />
                <span>Catalog (Browse Only)</span>
              </button>

              {currentUser && (
                <button
                  onClick={() => setCurrentView('my-shelf')}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl transition-all relative ${
                    currentView === 'my-shelf'
                      ? 'bg-white text-indigo-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                  }`}
                >
                  <Clock className="w-4 h-4 text-indigo-600" />
                  <span>Due Dates &amp; Shelf</span>
                  {currentUser.active_loans_count > 0 && (
                    <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-indigo-100 text-indigo-700 font-mono font-bold">
                      {currentUser.active_loans_count}
                    </span>
                  )}
                </button>
              )}

              <button
                onClick={onOpenBookRequest}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-slate-600 hover:text-indigo-600 hover:bg-white/50 transition-all"
              >
                <BookPlus className="w-3.5 h-3.5 text-indigo-500" />
                <span>Book Request</span>
              </button>

              <button
                onClick={() => {
                  if (currentView !== 'my-shelf') setCurrentView('my-shelf');
                  setTimeout(() => {
                    document.getElementById('helpdesk-section')?.scrollIntoView({ behavior: 'smooth' });
                  }, 100);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-slate-600 hover:text-indigo-600 hover:bg-white/50 transition-all"
              >
                <HelpCircle className="w-3.5 h-3.5 text-indigo-500" />
                <span>Help Desk</span>
              </button>
            </>
          )}

          {/* ADMIN PORTAL NAVIGATION */}
          {activePortal === 'admin' && (
            <>
              <button
                onClick={() => setCurrentView('admin-console')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl transition-all ${
                  currentView === 'admin-console'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                }`}
              >
                <ShieldCheck className="w-4 h-4 text-indigo-600" />
                <span>Circulation Desk</span>
              </button>

              <button
                onClick={() => setCurrentView('catalog')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl transition-all ${
                  currentView === 'catalog'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                }`}
              >
                <BookOpen className="w-4 h-4 text-indigo-600" />
                <span>Public Catalog</span>
              </button>
            </>
          )}

        </nav>

        {/* Right Section: Authentic User Profile Capsule with Enrollment No */}
        <div className="flex items-center gap-3">
          {currentUser ? (
            <div className="relative">
              <button
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                className="flex items-center gap-2.5 p-1.5 pr-3 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:border-slate-300 hover:bg-slate-50/80 transition-all text-left"
              >
                {/* Avatar with Role Border */}
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs font-mono shadow-xs ${
                  isAdmin 
                    ? 'bg-slate-900 text-amber-300 border border-slate-800' 
                    : 'bg-indigo-600 text-white border border-indigo-700'
                }`}>
                  {getInitials(currentUser.full_name)}
                </div>

                {/* Name, Role & Enrollment Number */}
                <div className="hidden sm:block">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-xs text-slate-900 leading-tight">
                      {currentUser.full_name}
                    </span>
                    <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded-md font-mono ${
                      isAdmin 
                        ? 'bg-amber-100 text-amber-800 border border-amber-300' 
                        : 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                    }`}>
                      {isAdmin ? 'Staff' : 'Student'}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono truncate max-w-[150px] flex items-center gap-1">
                    {currentUser.enrollment_no ? (
                      <span className="font-bold text-slate-700">Roll: {currentUser.enrollment_no}</span>
                    ) : (
                      <span>{currentUser.email}</span>
                    )}
                  </div>
                </div>

                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${profileDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Profile Dropdown Menu */}
              {profileDropdownOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setProfileDropdownOpen(false)} 
                  />
                  <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-white border border-slate-200 shadow-xl z-50 p-2.5 space-y-1.5 animate-in fade-in zoom-in-95 duration-100">
                    <div className="px-3 py-2.5 border-b border-slate-100">
                      <div className="text-xs font-bold text-slate-900 flex items-center justify-between">
                        <span>{currentUser.full_name}</span>
                        <span className="text-[10px] font-mono text-slate-500">
                          ID #{currentUser.user_id}
                        </span>
                      </div>
                      
                      {currentUser.enrollment_no && (
                        <div className="mt-1 flex items-center justify-between text-[11px] font-mono bg-indigo-50/70 text-indigo-900 px-2 py-1 rounded-lg border border-indigo-100">
                          <span className="text-slate-500">Enrollment No:</span>
                          <span className="font-bold">{currentUser.enrollment_no}</span>
                        </div>
                      )}

                      <div className="text-[11px] text-slate-500 font-mono mt-1 truncate">
                        {currentUser.email}
                      </div>

                      <div className="mt-2 flex items-center justify-between text-[11px] text-slate-600 bg-slate-50 p-2 rounded-xl">
                        <span>Active Quota:</span>
                        <span className="font-mono font-bold text-slate-900">
                          {currentUser.active_loans_count || 0} / {currentUser.max_books_quota} Books
                        </span>
                      </div>
                    </div>

                    {isMember && (
                      <button
                        onClick={() => {
                          setCurrentView('my-shelf');
                          setProfileDropdownOpen(false);
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 hover:text-indigo-600 hover:bg-indigo-50/60 rounded-xl transition-colors"
                      >
                        <User className="w-4 h-4 text-indigo-500" />
                        <span>My Shelf &amp; Borrowings</span>
                      </button>
                    )}

                    {isAdmin && (
                      <button
                        onClick={() => {
                          setActivePortal('admin');
                          setCurrentView('admin-console');
                          setProfileDropdownOpen(false);
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 hover:text-indigo-600 hover:bg-indigo-50/60 rounded-xl transition-colors"
                      >
                        <ShieldCheck className="w-4 h-4 text-indigo-500" />
                        <span>Circulation Desk Console</span>
                      </button>
                    )}

                    <button
                      onClick={() => {
                        onLogout();
                        setProfileDropdownOpen(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                    >
                      <LogOut className="w-4 h-4 text-rose-500" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="px-4 py-2 rounded-xl bg-indigo-900 hover:bg-indigo-800 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors"
            >
              <LogIn className="w-4 h-4" />
              <span>Login with Roll No</span>
            </button>
          )}
        </div>

      </div>
    </header>
  );
}