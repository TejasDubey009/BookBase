import { useEffect, useRef, useState } from 'react';
import { api, onAuthChange } from '../api/bookbase';

// Left behind in browsers by versions that kept their own session tokens
const LEGACY_STORAGE_KEYS = ['bb_user_id', 'bb_token', 'bb_active_portal', 'bb_token_kiosk', 'bb_token_student', 'bb_token_admin'];

/**
 * Who is signed in on this portal's site, which screen they are on, and the librarian's
 * pending-request count. Each site has one fixed portal and its own sign-in, kept by Supabase Auth.
 */
export function useSession({ portal, showToast, lastEventTimestamp, notifyDataChanged }) {
  const homeView = portal === 'admin' ? 'admin-console' : 'catalog';

  const [currentUser, setCurrentUser] = useState(null);
  const [isRestoringSession, setIsRestoringSession] = useState(true);
  const [demoUsers, setDemoUsers] = useState([]);
  const [currentView, setCurrentView] = useState(homeView);
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);

  // Supabase also reports a sign-out the person chose, or a refused sign-in, which aren't news to them
  const currentUserRef = useRef(null);
  const signingOutRef = useRef(false);
  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  const endSession = () => {
    setCurrentUser(null);
    setPendingRequestsCount(0);
    setCurrentView(homeView);
    notifyDataChanged();
  };

  // Initial load: the quick-select accounts (empty unless demo mode is on), then the saved session
  useEffect(() => {
    LEGACY_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));

    api.getDemoUsers()
      .then(setDemoUsers)
      .catch((err) => console.error('Failed to load demo accounts:', err));

    api.getCurrentUser()
      .then(setCurrentUser)
      .catch((err) => console.error('Failed to restore session:', err))
      .finally(() => setIsRestoringSession(false));

    // The session ended without the person asking: it expired, or they signed out in another tab
    let subscription;
    try {
      subscription = onAuthChange((event) => {
        if (event !== 'SIGNED_OUT' || !currentUserRef.current) return;
        endSession();
        if (!signingOutRef.current) {
          showToast({ type: 'warning', message: 'Your session has ended. Please sign in again.' });
        }
        signingOutRef.current = false;
      }).data.subscription;
    } catch (err) {
      console.error(err.message);
    }
    return () => subscription?.unsubscribe();
  }, []);

  // Refresh the user's quota and fines, and the admin's pending-request count, after every change
  useEffect(() => {
    if (!currentUser) return;
    const userId = currentUser.user_id;
    api.getCurrentUser()
      .then((freshUser) => {
        // Ignore a late reply if the user has signed out or switched account since asking
        if (freshUser && currentUserRef.current?.user_id === userId) setCurrentUser(freshUser);
      })
      .catch(() => {});

    if (currentUser.role === 'admin') {
      api.getBookRequests()
        .then((reqs) => setPendingRequestsCount(reqs.filter((r) => r.status === 'Pending').length))
        .catch(() => {});
    }
  }, [lastEventTimestamp, currentUser?.user_id]);

  const handleLoginSuccess = ({ user }) => {
    setCurrentUser(user);
    setCurrentView(homeView);
    notifyDataChanged();
  };

  const handleLogout = async () => {
    signingOutRef.current = true;
    try {
      await api.logout();
    } finally {
      endSession();
      showToast({ type: 'success', message: 'You have been signed out.' });
    }
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
