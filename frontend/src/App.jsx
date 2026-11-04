import React, { useState, useEffect, useCallback } from 'react';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Toast from './components/Toast';
import BookDetailModal from './components/BookDetailModal';
import AddBookModal from './components/AddBookModal';
import BookRequestModal from './components/BookRequestModal';
import AuthModal from './components/AuthModal';
import CatalogView from './views/CatalogView';
import MemberShelfView from './views/MemberShelfView';
import AdminConsoleView from './views/AdminConsoleView';
import { api } from './api';

export default function App() {
  // 3 Portals State: 'kiosk' | 'student' | 'admin'
  const [activePortal, setActivePortal] = useState(() => {
    const hash = window.location.hash.replace('#', '');
    if (['kiosk', 'student', 'admin'].includes(hash)) return hash;
    return localStorage.getItem('bb_active_portal') || 'kiosk';
  });

  // Global Session State
  const [currentUser, setCurrentUser] = useState(null);
  const [demoUsers, setDemoUsers] = useState([]);
  const [currentView, setCurrentView] = useState('catalog');

  // Catalog State
  const [books, setBooks] = useState([]);
  const [booksLoading, setBooksLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [availabilityFilter, setAvailabilityFilter] = useState('all');

  // Modals
  const [selectedBookId, setSelectedBookId] = useState(null);
  const [isAddBookOpen, setIsAddBookOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [requestPrefillBook, setRequestPrefillBook] = useState(null);

  // Administrative Counts
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);

  // Notifications & Concurrency Lock UI
  const [toast, setToast] = useState(null);
  const [loadingActionId, setLoadingActionId] = useState(null);
  const [lastEventTimestamp, setLastEventTimestamp] = useState(Date.now());

  // Show toast helper with auto-dismiss
  const showToast = useCallback((toastData) => {
    setToast(toastData);
    const timeout = toastData.status === 'AUTO_ASSIGNED_TO_WAITLIST' ? 7000 : 4500;
    setTimeout(() => {
      setToast((prev) => (prev === toastData ? null : prev));
    }, timeout);
  }, []);

  // Sync activePortal with localStorage and URL hash
  const handleSetPortal = (portal) => {
    setActivePortal(portal);
    localStorage.setItem('bb_active_portal', portal);
    window.location.hash = portal;
  };

  // 1. Initial Load: Fetch Demo Users & Set Default Persona (Tejas - CSBS2022001)
  useEffect(() => {
    api.getDemoUsers()
      .then((users) => {
        setDemoUsers(users);
        const savedUserId = localStorage.getItem('bb_user_id');
        let initialUser = null;
        if (savedUserId) {
          initialUser = users.find((u) => u.user_id === parseInt(savedUserId, 10));
        }
        if (!initialUser) {
          // Default to Tejas (CSBS2022001)
          initialUser = users.find((u) => u.email === 'tejas@bookbase.in') || users[1] || users[0];
        }
        setCurrentUser(initialUser);

        // If saved portal is admin but user is not admin, reset to kiosk
        if (activePortal === 'admin' && initialUser?.role !== 'admin') {
          handleSetPortal('kiosk');
          setCurrentView('catalog');
        } else if (activePortal === 'admin' && initialUser?.role === 'admin') {
          setCurrentView('admin-console');
        }
      })
      .catch((err) => console.error('Failed to load users:', err));
  }, []);

  // 2. Fetch Books whenever search/filters, user, or events change
  const fetchBooks = useCallback(() => {
    setBooksLoading(true);
    api.getBooks({
      search: searchQuery,
      category: selectedCategory,
      availability: availabilityFilter,
      userId: currentUser?.user_id,
    })
      .then((data) => {
        setBooks(data);
        setBooksLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching books:', err);
        setBooksLoading(false);
      });
  }, [searchQuery, selectedCategory, availabilityFilter, currentUser, lastEventTimestamp]);

  useEffect(() => {
    fetchBooks();
  }, [fetchBooks]);

  // Refresh User state & pending requests count
  useEffect(() => {
    if (!currentUser) return;
    api.getCurrentUser(currentUser.user_id)
      .then((freshUser) => {
        setCurrentUser(freshUser);
      })
      .catch(() => {});

    // If admin, check pending book requests
    if (currentUser.role === 'admin') {
      api.getBookRequests()
        .then((reqs) => {
          const pending = reqs.filter(r => r.status === 'Pending').length;
          setPendingRequestsCount(pending);
        })
        .catch(() => {});
    }
  }, [lastEventTimestamp, currentUser?.user_id]);

  // Action: Borrow Book (Kiosk Only)
  const handleBorrow = async (bookId) => {
    if (activePortal === 'student') {
      showToast({
        type: 'warning',
        message: 'Physical borrowing is disabled in Remote Student Portal. Please visit the Central Library Kiosk to check out copies.'
      });
      return;
    }

    if (!currentUser) {
      setIsAuthModalOpen(true);
      showToast({ type: 'warning', message: 'Please sign in with your Enrollment Number to borrow books.' });
      return;
    }
    setLoadingActionId(bookId);
    try {
      const resp = await api.checkoutBook(currentUser.user_id, bookId);
      showToast({
        type: 'success',
        message: resp.message,
      });
      setLastEventTimestamp(Date.now());
    } catch (err) {
      showToast({
        type: 'error',
        message: err.message,
      });
    } finally {
      setLoadingActionId(null);
    }
  };

  // Action: Join FIFO Waitlist
  const handleJoinWaitlist = async (bookId) => {
    if (!currentUser) {
      setIsAuthModalOpen(true);
      showToast({ type: 'warning', message: 'Please sign in to join the course reservation waitlist.' });
      return;
    }
    setLoadingActionId(bookId);
    try {
      const resp = await api.joinWaitlist(currentUser.user_id, bookId);
      showToast({
        type: 'waitlist_promo',
        message: resp.message,
      });
      setLastEventTimestamp(Date.now());
    } catch (err) {
      showToast({
        type: 'error',
        message: err.message,
      });
    } finally {
      setLoadingActionId(null);
    }
  };

  // Action: Return Book (FIFO WAITLIST HANDOFF)
  const handleReturn = async (loanId) => {
    setLoadingActionId(loanId);
    try {
      const resp = await api.returnBook(loanId);
      if (resp.status === 'AUTO_ASSIGNED_TO_WAITLIST') {
        showToast({
          type: 'waitlist_promo',
          status: 'AUTO_ASSIGNED_TO_WAITLIST',
          message: resp.message,
        });
      } else {
        showToast({
          type: 'success',
          message: resp.message,
        });
      }
      setLastEventTimestamp(Date.now());
      return resp;
    } catch (err) {
      showToast({
        type: 'error',
        message: err.message,
      });
      throw err;
    } finally {
      setLoadingActionId(null);
    }
  };

  // Action: Cancel Waitlist Reservation
  const handleCancelWaitlist = async (reservationId) => {
    try {
      const resp = await api.cancelWaitlist(reservationId);
      showToast({
        type: 'success',
        message: resp.message,
      });
      setLastEventTimestamp(Date.now());
    } catch (err) {
      showToast({
        type: 'error',
        message: err.message,
      });
    }
  };

  // Open Book Request Modal
  const handleOpenBookRequest = (prefillBook = null) => {
    setRequestPrefillBook(prefillBook);
    setIsRequestModalOpen(true);
  };

  // Action: Log In Success
  const handleLoginSuccess = (user) => {
    setCurrentUser(user);
    localStorage.setItem('bb_user_id', user.user_id.toString());
    if (user.role === 'admin') {
      handleSetPortal('admin');
      setCurrentView('admin-console');
    } else {
      // If student was on admin, redirect to kiosk or student portal
      if (activePortal === 'admin') {
        handleSetPortal('student');
      }
      setCurrentView('catalog');
    }
    setLastEventTimestamp(Date.now());
  };

  // Action: Log Out
  const handleLogout = () => {
    localStorage.removeItem('bb_token');
    localStorage.removeItem('bb_user_id');
    setCurrentUser(null);
    if (activePortal === 'admin') {
      handleSetPortal('kiosk');
    }
    setCurrentView('catalog');
    showToast({ type: 'success', message: 'You have been signed out.' });
    setLastEventTimestamp(Date.now());
  };

  // Reset demo database to initial state
  const handleResetDemo = async () => {
    if (!window.confirm('Reset BookBase database back to the clean initial state?')) {
      return;
    }
    try {
      await api.resetDemoDb();
      showToast({
        type: 'success',
        message: '⚡ Database cleanly reset to pristine demo state!',
      });
      setLastEventTimestamp(Date.now());
    } catch (err) {
      showToast({ type: 'error', message: err.message });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans pb-12 selection:bg-indigo-100 selection:text-indigo-900">
      
      {/* Toast Notification */}
      <Toast toast={toast} onDismiss={() => setToast(null)} />

      {/* Modern Multi-Portal Navigation Bar */}
      <Navbar
        activePortal={activePortal}
        setActivePortal={handleSetPortal}
        currentView={currentView}
        setCurrentView={setCurrentView}
        currentUser={currentUser}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onLogout={handleLogout}
        onOpenBookRequest={() => handleOpenBookRequest()}
        pendingRequestsCount={pendingRequestsCount}
      />

      {/* Main Content Area */}
      <main className="flex-1 px-4 sm:px-6 lg:px-8 py-7 max-w-7xl mx-auto w-full">
        {currentView === 'catalog' && (
          <CatalogView
            books={books}
            loading={booksLoading}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            selectedCategory={selectedCategory}
            setSelectedCategory={setSelectedCategory}
            availabilityFilter={availabilityFilter}
            setAvailabilityFilter={setAvailabilityFilter}
            currentUser={currentUser}
            portal={activePortal}
            onSelectBook={(book) => setSelectedBookId(book.book_id)}
            onBorrow={handleBorrow}
            onJoinWaitlist={handleJoinWaitlist}
            onReturn={handleReturn}
            onRequestBook={handleOpenBookRequest}
            loadingActionId={loadingActionId}
            onOpenAddBook={() => setIsAddBookOpen(true)}
            onOpenBookRequest={() => handleOpenBookRequest()}
          />
        )}

        {currentView === 'my-shelf' && currentUser && (
          <MemberShelfView
            currentUser={currentUser}
            portal={activePortal}
            onReturnBook={handleReturn}
            onCancelWaitlist={handleCancelWaitlist}
            onSelectBook={(book) => setSelectedBookId(book.book_id)}
            onOpenBookRequest={() => handleOpenBookRequest()}
            loadingActionId={loadingActionId}
            showToast={showToast}
          />
        )}

        {currentView === 'admin-console' && (
          <AdminConsoleView
            onReturnBook={handleReturn}
            onOpenAddBook={() => setIsAddBookOpen(true)}
            onResetDemo={handleResetDemo}
            loadingActionId={loadingActionId}
            showToast={showToast}
            lastEventTimestamp={lastEventTimestamp}
          />
        )}
      </main>

      {/* Institutional Central Library Footer */}
      <Footer onOpenAuth={() => setIsAuthModalOpen(true)} />

      {/* Book Detail & 3NF Inventory Modal */}
      {selectedBookId && (
        <BookDetailModal
          bookId={selectedBookId}
          currentUser={currentUser}
          portal={activePortal}
          onClose={() => setSelectedBookId(null)}
          onBorrow={handleBorrow}
          onJoinWaitlist={handleJoinWaitlist}
          onReturn={handleReturn}
          onCancelWaitlist={handleCancelWaitlist}
          onRequestBook={handleOpenBookRequest}
          loadingActionId={loadingActionId}
        />
      )}

      {/* Add Book & Physical Copies Modal (Admin) */}
      <AddBookModal
        isOpen={isAddBookOpen}
        onClose={() => setIsAddBookOpen(false)}
        onSuccess={() => setLastEventTimestamp(Date.now())}
        showToast={showToast}
      />

      {/* Student Book Acquisition Request Modal */}
      <BookRequestModal
        isOpen={isRequestModalOpen}
        onClose={() => setIsRequestModalOpen(false)}
        currentUser={currentUser}
        prefillBook={requestPrefillBook}
        onSuccess={() => {
          showToast({
            type: 'success',
            message: 'Book acquisition request submitted to library administration!'
          });
          setLastEventTimestamp(Date.now());
        }}
        showToast={showToast}
      />

      {/* Student & Admin Auth / Sign In / Sign Up Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        demoUsers={demoUsers}
        onLoginSuccess={handleLoginSuccess}
        showToast={showToast}
      />

    </div>
  );
}
