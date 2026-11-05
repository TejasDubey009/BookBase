import { useCallback, useState } from 'react';
import { api } from './api/bookbase';
import Footer from './components/layout/Footer';
import Navbar from './components/layout/navbar/Navbar';
import Toast from './components/ui/Toast';
import AdminConsoleView from './features/admin/AdminConsoleView';
import AuthModal from './features/auth/AuthModal';
import AddBookModal from './features/catalog/AddBookModal';
import BookDetailModal from './features/catalog/book-detail/BookDetailModal';
import CatalogView from './features/catalog/CatalogView';
import BookRequestModal from './features/requests/BookRequestModal';
import MemberShelfView from './features/shelf/MemberShelfView';
import { useCatalog } from './hooks/useCatalog';
import { useCirculationActions } from './hooks/useCirculationActions';
import { useSession } from './hooks/useSession';
import { useToast } from './hooks/useToast';

export default function App() {
  const { toast, showToast, dismissToast } = useToast();

  // Bumped after every change on the server, so anything showing that data refetches
  const [lastEventTimestamp, setLastEventTimestamp] = useState(Date.now());
  const notifyDataChanged = useCallback(() => setLastEventTimestamp(Date.now()), []);

  const {
    activePortal,
    setActivePortal,
    currentUser,
    demoUsers,
    currentView,
    setCurrentView,
    pendingRequestsCount,
    handleLoginSuccess,
    handleLogout,
  } = useSession({ showToast, lastEventTimestamp, notifyDataChanged });

  const {
    books,
    booksLoading,
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    availabilityFilter,
    setAvailabilityFilter,
  } = useCatalog({ currentUser, lastEventTimestamp });

  // Modals
  const [selectedBookId, setSelectedBookId] = useState(null);
  const [isAddBookOpen, setIsAddBookOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [requestPrefillBook, setRequestPrefillBook] = useState(null);

  const { loadingActionId, handleBorrow, handleJoinWaitlist, handleReturn, handleCancelWaitlist } = useCirculationActions({
    activePortal,
    currentUser,
    showToast,
    notifyDataChanged,
    openAuthModal: () => setIsAuthModalOpen(true),
  });

  const handleOpenBookRequest = (prefillBook = null) => {
    setRequestPrefillBook(prefillBook);
    setIsRequestModalOpen(true);
  };

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
      notifyDataChanged();
    } catch (err) {
      showToast({ type: 'error', message: err.message });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans pb-12 selection:bg-indigo-100 selection:text-indigo-900">

      {/* Toast Notification */}
      <Toast toast={toast} onDismiss={dismissToast} />

      {/* Modern Multi-Portal Navigation Bar */}
      <Navbar
        activePortal={activePortal}
        setActivePortal={setActivePortal}
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
      <Footer />

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
        onSuccess={notifyDataChanged}
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
          notifyDataChanged();
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
