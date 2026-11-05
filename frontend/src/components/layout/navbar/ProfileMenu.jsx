import { useState } from 'react';
import { ChevronDown, LogIn, LogOut, ShieldCheck, User } from 'lucide-react';

function getInitials(name) {
  if (!name) return 'U';
  const parts = name.trim().split(' ');
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

/** The signed-in user's capsule and dropdown, or the login button when signed out. */
export default function ProfileMenu({ currentUser, setActivePortal, setCurrentView, onOpenAuth, onLogout }) {
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  const isAdmin = currentUser?.role === 'admin';
  const isMember = currentUser?.role === 'member';

  return (
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
  );
}
