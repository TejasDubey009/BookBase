import React, { useState, useEffect, useCallback } from 'react';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Toast from './components/Toast';
import BookDetailModal from './components/BookDetailModal';
import AddBookModal from './components/AddBookModal';
import AuthModal from './components/AuthModal';
import CatalogView from './views/CatalogView';
import MemberShelfView from './views/MemberShelfView';
import AdminConsoleView from './views/AdminConsoleView';
import { api } from './api';

export default function App() {
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

  // 1. Initial Load: Fetch Demo Users & Set Default Persona (Tejas)
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
          // Default to Tejas (has pre-seeded active loans)
          initialUser = users.find((u) => u.email === 'tejas@bookbase.in') || users[1] || users[0];
        }
        setCurrentUser(initialUser);
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

  // Refresh User state (loans count, fines)
  useEffect(() => {
    if (!currentUser) return;
    api.getCurrentUser(currentUser.user_id)
      .then((freshUser) => {
        setCurrentUser(freshUser);
      })
      .catch(() => {});
  }, [lastEventTimestamp]);

  // Action: Borrow Book
  const handleBorrow = async (bookId) => {
    if (!currentUser) {
      setIsAuthModalOpen(true);
      showToast({ type: 'warning', message: 'Please sign in to borrow books.' });
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
      showToast({ type: 'warning', message: 'Please sign in to join the waitlist.' });
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

  // Action: Log In Success
  const handleLoginSuccess = (user) => {
    setCurrentUser(user);
    localStorage.setItem('bb_user_id', user.user_id.toString());
    if (user.role === 'admin') {
      setCurrentView('admin-console');
    } else {
      setCurrentView('catalog');
    }
    setLastEventTimestamp(Date.now());
  };

  // Action: Log Out
  const handleLogout = () => {
    localStorage.removeItem('bb_token');
    localStorage.removeItem('bb_user_id');
    setCurrentUser(null);
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

      {/* Modern Top Navigation Bar */}
      <Navbar
        currentView={currentView}
        setCurrentView={setCurrentView}
        currentUser={currentUser}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onLogout={handleLogout}
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
            onSelectBook={(book) => setSelectedBookId(book.book_id)}
            onBorrow={handleBorrow}
            onJoinWaitlist={handleJoinWaitlist}
            onReturn={handleReturn}
            loadingActionId={loadingActionId}
            onOpenAddBook={() => setIsAddBookOpen(true)}
          />
        )}

        {currentView === 'my-shelf' && currentUser && (
          <MemberShelfView
            currentUser={currentUser}
            onReturnBook={handleReturn}
            onCancelWaitlist={handleCancelWaitlist}
            onSelectBook={(book) => setSelectedBookId(book.book_id)}
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
          onClose={() => setSelectedBookId(null)}
          onBorrow={handleBorrow}
          onJoinWaitlist={handleJoinWaitlist}
          onReturn={handleReturn}
          onCancelWaitlist={handleCancelWaitlist}
          loadingActionId={loadingActionId}
        />
      )}

      {/* Add Book & Physical Copies Modal */}
      <AddBookModal
        isOpen={isAddBookOpen}
        onClose={() => setIsAddBookOpen(false)}
        onSuccess={() => setLastEventTimestamp(Date.now())}
        showToast={showToast}
      />

      {/* Real Auth / Sign In Modal */}
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
