import { useEffect, useState } from 'react';
import { api, clearAuthToken, getAuthToken, setAuthToken, setSessionExpiredHandler } from '../api/bookbase';

// Left behind in browsers by versions that served all three portals from one site
const LEGACY_STORAGE_KEYS = ['bb_user_id', 'bb_token', 'bb_active_portal'];

/**
 * Who is signed in on this portal's site, which screen they are on, and the librarian's
 * pending-request count. Each site has one fixed portal and its own sign-in.
 */
export function useSession({ portal, showToast, lastEventTimestamp, notifyDataChanged }) {
  const homeView = portal === 'admin' ? 'admin-console' : 'catalog';

  const [currentUser, setCurrentUser] = useState(null);
  const [isRestoringSession, setIsRestoringSession] = useState(() => Boolean(getAuthToken()));
  const [demoUsers, setDemoUsers] = useState([]);
  const [currentView, setCurrentView] = useState(homeView);
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);

  // Initial load: the quick-select accounts (empty unless demo mode is on), then the saved session.
  // Only the server can say who a stored token belongs to, so nothing else is kept in localStorage.
  useEffect(() => {
    LEGACY_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));

    api.getDemoUsers()
      .then(setDemoUsers)
      .catch((err) => console.error('Failed to load demo accounts:', err));

    if (!getAuthToken()) return;
    api.getCurrentUser()
      .then(setCurrentUser)
      .catch((err) => console.error('Failed to restore session:', err))
      .finally(() => setIsRestoringSession(false));
  }, []);

  // The server rejected the stored token: it expired, or the demo database was reset
  useEffect(() => {
    setSessionExpiredHandler(() => {
      setCurrentUser(null);
      setPendingRequestsCount(0);
      setCurrentView(homeView);
      showToast({ type: 'warning', message: 'Your session has ended. Please sign in again.' });
      notifyDataChanged();
    });
  }, []);

  // Refresh the user's quota and fines, and the admin's pending-request count, after every change
  useEffect(() => {
    if (!currentUser) return;
    const token = getAuthToken();
    api.getCurrentUser()
      .then((freshUser) => {
        // Ignore a late reply if the user has signed out or switched account since asking
        if (getAuthToken() === token) setCurrentUser(freshUser);
      })
      .catch(() => {});

    if (currentUser.role === 'admin') {
      api.getBookRequests()
        .then((reqs) => {
          const pending = reqs.filter(r => r.status === 'Pending').length;
          setPendingRequestsCount(pending);
        })
        .catch(() => {});
    }
  }, [lastEventTimestamp, currentUser?.user_id]);

  const handleLoginSuccess = ({ token, user }) => {
    setAuthToken(token);
    setCurrentUser(user);
    setCurrentView(homeView);
    notifyDataChanged();
  };

  const handleLogout = () => {
    clearAuthToken();
    setCurrentUser(null);
    setPendingRequestsCount(0);
    setCurrentView(homeView);
    showToast({ type: 'success', message: 'You have been signed out.' });
    notifyDataChanged();
  };

  return {
    currentUser,
    isRestoringSession,
    demoUsers,
    currentView,
    setCurrentView,
    pendingRequestsCount,
    handleLoginSuccess,
    handleLogout,
  };
}
