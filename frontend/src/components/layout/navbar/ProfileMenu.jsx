import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

function getInitials(name) {
  if (!name) return 'U';
  const parts = name.trim().split(' ');
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

const MENU_ITEM_CLASSES = 'w-full px-4 py-2 text-left text-sm hover:bg-shelf transition-colors';

/** The signed-in user's menu, or the login button when signed out. */
export default function ProfileMenu({ currentUser, setCurrentView, onOpenAuth, onLogout, signInLabel }) {
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  const isAdmin = currentUser?.role === 'admin';
  const isMember = currentUser?.role === 'member';

  if (!currentUser) {
    return (
      <button
        onClick={onOpenAuth}
        className="px-3 py-1.5 rounded bg-accent hover:bg-accent-hover text-white text-sm font-medium whitespace-nowrap transition-colors"
      >
        {signInLabel}
      </button>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
        aria-label="Account menu"
        className="flex items-center gap-2 text-sm text-body hover:text-ink transition-colors"
      >
        <span className="w-8 h-8 rounded-full bg-shelf border border-line flex items-center justify-center text-xs font-medium text-ink">
          {getInitials(currentUser.full_name)}
        </span>
        <span className="hidden lg:inline whitespace-nowrap">{currentUser.full_name}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-muted transition-transform ${profileDropdownOpen ? 'rotate-180' : ''}`} />
      </button>

      {profileDropdownOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setProfileDropdownOpen(false)} />
          <div className="absolute right-0 mt-2 w-72 rounded-lg bg-white border border-line shadow-soft z-50 py-2">
            <div className="px-4 pt-1 pb-3 mb-1 border-b border-line text-sm">
              <div className="flex items-center justify-between font-medium text-ink">
                <span>{currentUser.full_name}</span>
                <span className="text-xs font-normal text-muted">ID #{currentUser.user_id}</span>
              </div>
              <div className="mt-0.5 text-xs text-muted truncate">{currentUser.email}</div>

              <dl className="mt-2.5 space-y-1 text-xs">
                {currentUser.enrollment_no && (
                  <div className="flex justify-between">
                    <dt className="text-muted">Enrollment No:</dt>
                    <dd className="text-ink">{currentUser.enrollment_no}</dd>
                  </div>
                )}
                <div className="flex justify-between">
                  <dt className="text-muted">Active Quota:</dt>
                  <dd className="text-ink tabular-nums">
                    {currentUser.active_loans_count || 0} / {currentUser.max_books_quota} Books
                  </dd>
                </div>
              </dl>
            </div>

            {isMember && (
              <button
                onClick={() => {
                  setCurrentView('my-shelf');
                  setProfileDropdownOpen(false);
                }}
                className={`${MENU_ITEM_CLASSES} text-body`}
              >
                My Shelf &amp; Borrowings
              </button>
            )}

            {isAdmin && (
              <button
                onClick={() => {
                  setCurrentView('admin-console');
                  setProfileDropdownOpen(false);
                }}
                className={`${MENU_ITEM_CLASSES} text-body`}
              >
                Circulation Desk Console
              </button>
            )}

            <button
              onClick={() => {
                onLogout();
                setProfileDropdownOpen(false);
              }}
              className={`${MENU_ITEM_CLASSES} text-danger`}
            >
              Sign Out
            </button>
          </div>
        </>
      )}
    </div>
  );
}
