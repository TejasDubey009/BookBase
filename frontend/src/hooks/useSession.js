import { useEffect, useState } from 'react';
import { api } from '../api/bookbase';
import { PORTALS } from '../constants/portals';

const STORAGE_PORTAL = 'bb_active_portal';
const STORAGE_USER_ID = 'bb_user_id';
const STORAGE_TOKEN = 'bb_token';

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

  // Initial load: fetch demo users and restore the saved persona (default: Tejas - CSBS2022001)
  useEffect(() => {
    api.getDemoUsers()
      .then((users) => {
        setDemoUsers(users);
        const savedUserId = localStorage.getItem(STORAGE_USER_ID);
        let initialUser = null;
        if (savedUserId) {
          initialUser = users.find((u) => u.user_id === parseInt(savedUserId, 10));
        }
        if (!initialUser) {
          initialUser = users.find((u) => u.email === 'tejas@bookbase.in') || users[1] || users[0];
        }
        setCurrentUser(initialUser);

        // If saved portal is admin but user is not admin, reset to kiosk
        if (activePortal === 'admin' && initialUser?.role !== 'admin') {
          setActivePortal('kiosk');
          setCurrentView('catalog');
        } else if (activePortal === 'admin' && initialUser?.role === 'admin') {
          setCurrentView('admin-console');
        }
      })
      .catch((err) => console.error('Failed to load users:', err));
  }, []);

  // Refresh the user's quota and fines, and the admin's pending-request count, after every change
  useEffect(() => {
    if (!currentUser) return;
    api.getCurrentUser(currentUser.user_id)
      .then((freshUser) => {
        setCurrentUser(freshUser);
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

  const handleLoginSuccess = (user) => {
    setCurrentUser(user);
    localStorage.setItem(STORAGE_USER_ID, user.user_id.toString());
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
    localStorage.removeItem(STORAGE_TOKEN);
    localStorage.removeItem(STORAGE_USER_ID);
    setCurrentUser(null);
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
