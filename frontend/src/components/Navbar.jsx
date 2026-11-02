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
  MapPin
} from 'lucide-react';

export default function Navbar({
  currentView,
  setCurrentView,
  currentUser,
  onOpenAuth,
  onLogout,
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

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/90 px-4 sm:px-6 lg:px-8 py-3 transition-all">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        
        {/* Brand Logo & Title */}
        <div 
          onClick={() => setCurrentView('catalog')}
          className="flex items-center gap-3 cursor-pointer select-none group"
        >
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-900 via-indigo-800 to-slate-900 text-white flex items-center justify-center shadow-xs group-hover:scale-105 group-hover:shadow-md transition-all">
            <Library className="w-5 h-5 text-indigo-100" />
          </div>
          <div>
            <div className="font-extrabold text-base tracking-tight text-slate-900 flex items-center gap-2">
              <span>BookBase</span>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-800 border border-indigo-200/80 font-mono">
                CSBS
              </span>
            </div>
            <div className="text-[11px] text-slate-500 font-medium">
              Curriculum Library &amp; Resource Portal
            </div>
          </div>
        </div>

        {/* Center Navigation Tabs */}
        <nav className="hidden md:flex items-center gap-1.5 bg-slate-100/90 p-1.5 rounded-2xl border border-slate-200/70 text-xs font-semibold">
          <button
            onClick={() => setCurrentView('catalog')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
              currentView === 'catalog'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <BookOpen className="w-4 h-4 text-indigo-600" />
            <span>Curriculum Catalog</span>
          </button>

          {isMember && (
            <button
              onClick={() => setCurrentView('my-shelf')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all relative ${
                currentView === 'my-shelf'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <User className="w-4 h-4 text-indigo-600" />
              <span>My Borrowings &amp; Shelf</span>
              {currentUser.active_loans_count > 0 && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-indigo-100 text-indigo-700 font-mono font-bold">
                  {currentUser.active_loans_count}
                </span>
              )}
            </button>
          )}

          {isAdmin && (
            <button
              onClick={() => setCurrentView('admin-console')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
                currentView === 'admin-console'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
              <span>Circulation Desk</span>
            </button>
          )}

          {/* Quick Contact & Timings Anchor */}
          <button
            onClick={scrollToFooter}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-white/50 transition-all"
            title="View Library Timings & Helpdesk"
          >
            <PhoneCall className="w-3.5 h-3.5" />
            <span>Helpdesk</span>
          </button>
        </nav>

        {/* Right Section: Authentic User Profile Capsule */}
        <div className="flex items-center gap-3">
          {currentUser ? (
            <div className="relative">
              <button
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                className="flex items-center gap-3 p-1.5 pr-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:border-slate-300 hover:bg-slate-50/80 transition-all text-left"
              >
                {/* Avatar with Role Border */}
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs font-mono shadow-xs ${
                  isAdmin 
                    ? 'bg-slate-900 text-amber-300 border border-slate-800' 
                    : 'bg-indigo-600 text-white border border-indigo-700'
                }`}>
                  {getInitials(currentUser.full_name)}
                </div>

                {/* Name & Role */}
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
                  <div className="text-[10px] text-slate-500 font-mono truncate max-w-[140px]">
                    {currentUser.email}
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
                  <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-white border border-slate-200 shadow-xl z-50 p-2 space-y-1 animate-in fade-in zoom-in-95 duration-100">
                    <div className="px-3 py-2.5 border-b border-slate-100">
                      <div className="text-xs font-bold text-slate-900 flex items-center justify-between">
                        <span>{currentUser.full_name}</span>
                        <span className="text-[10px] font-mono text-slate-500">
                          ID #{currentUser.user_id}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono mt-0.5 truncate">
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
                          setCurrentView('admin-console');
                          setProfileDropdownOpen(false);
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 hover:text-indigo-600 hover:bg-indigo-50/60 rounded-xl transition-colors"
                      >
                        <ShieldCheck className="w-4 h-4 text-indigo-500" />
                        <span>Circulation Desk</span>
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
              <span>Library Sign In</span>
            </button>
          )}
        </div>

      </div>
    </header>
  );
}
