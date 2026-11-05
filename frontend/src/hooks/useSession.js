import { useEffect, useState } from 'react';
import { api, clearAuthToken, getAuthToken, setAuthToken, setSessionExpiredHandler } from '../api/bookbase';
import { PORTALS } from '../constants/portals';

const STORAGE_PORTAL = 'bb_active_portal';
const LEGACY_STORAGE_USER_ID = 'bb_user_id';

function readInitialPortal() {
  const hash = window.location.hash.replace('#', '');
  if (PORTALS.includes(hash)) return hash;
  return localStorage.getItem(STORAGE_PORTAL) || 'kiosk';
}

/**
 * Who is signed in and where they are: the active portal ('kiosk' | 'student' | 'admin'),
 * the current view, the signed-in user, and the librarian's pending-request count.
 */
export function useSession({ showToast, lastEventTimestamp, notifyDataChanged }) {
  const [activePortal, setActivePortalState] = useState(readInitialPortal);
  const [currentUser, setCurrentUser] = useState(null);
  const [demoUsers, setDemoUsers] = useState([]);
  const [currentView, setCurrentView] = useState('catalog');
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);

  // Keeps the portal in sync with localStorage and the URL hash
  const setActivePortal = (portal) => {
    setActivePortalState(portal);
    localStorage.setItem(STORAGE_PORTAL, portal);
    window.location.hash = portal;
  };

  // The admin portal is only for librarians; anyone else lands back on the kiosk
  const enterPortalAs = (user) => {
    if (activePortal !== 'admin') return;
    if (user?.role === 'admin') {
      setCurrentView('admin-console');
    } else {
      setActivePortal('kiosk');
      setCurrentView('catalog');
    }
  };

  // Initial load: the quick-select accounts (empty unless demo mode is on), then the saved session.
  // Only the server can say who a stored token belongs to, so nothing else is kept in localStorage.
  useEffect(() => {
    localStorage.removeItem(LEGACY_STORAGE_USER_ID);

    api.getDemoUsers()
      .then(setDemoUsers)
      .catch((err) => console.error('Failed to load demo accounts:', err));

    if (!getAuthToken()) {
      enterPortalAs(null);
      return;
    }
    api.getCurrentUser()
      .then((user) => {
        setCurrentUser(user);
        enterPortalAs(user);
      })
      .catch((err) => {
        console.error('Failed to restore session:', err);
        enterPortalAs(null);
      });
  }, []);

  // The server rejected the stored token: it expired, or the demo database was reset
  useEffect(() => {
    setSessionExpiredHandler(() => {
      setCurrentUser(null);
      setPendingRequestsCount(0);
      if (activePortal === 'admin') setActivePortal('kiosk');
      setCurrentView('catalog');
      showToast({ type: 'warning', message: 'Your session has ended. Please sign in again.' });
      notifyDataChanged();
    });
  }, [activePortal]);

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
    if (user.role === 'admin') {
      setActivePortal('admin');
      setCurrentView('admin-console');
    } else {
      // If student was on admin, redirect to the student portal
      if (activePortal === 'admin') {
        setActivePortal('student');
      }
      setCurrentView('catalog');
    }
    notifyDataChanged();
  };

  const handleLogout = () => {
    clearAuthToken();
    setCurrentUser(null);
    setPendingRequestsCount(0);
    if (activePortal === 'admin') {
      setActivePortal('kiosk');
    }
    setCurrentView('catalog');
    showToast({ type: 'success', message: 'You have been signed out.' });
    notifyDataChanged();
  };

  return {
    activePortal,
    setActivePortal,
    currentUser,
    demoUsers,
    currentView,
    setCurrentView,
    pendingRequestsCount,
    handleLoginSuccess,
    handleLogout,
  };
}
