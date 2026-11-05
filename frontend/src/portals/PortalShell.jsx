import { useCallback, useState } from 'react';
import Footer from '../components/layout/Footer';
import Navbar from '../components/layout/navbar/Navbar';
import Toast from '../components/ui/Toast';
import AuthModal from '../features/auth/AuthModal';
import BookDetailModal from '../features/catalog/book-detail/BookDetailModal';
import BookRequestModal from '../features/requests/BookRequestModal';
import { useCatalog } from '../hooks/useCatalog';
import { useCirculationActions } from '../hooks/useCirculationActions';
import { useLendingPolicy } from '../hooks/useLendingPolicy';
import { useSession } from '../hooks/useSession';
import { useToast } from '../hooks/useToast';

/**
 * Everything the three portal sites have in common: session, catalog data, navigation, footer
 * and shared modals. `children` is a function that receives this state and renders the portal's
 * own views, so each site's build only contains the screens that site offers.
 */
export default function PortalShell({ portal, children }) {
  const { toast, showToast, dismissToast } = useToast();
  const lendingPolicy = useLendingPolicy();

  // Bumped after every change on the server, so anything showing that data refetches
  const [lastEventTimestamp, setLastEventTimestamp] = useState(Date.now());
  const notifyDataChanged = useCallback(() => setLastEventTimestamp(Date.now()), []);

  const {
    currentUser,
    isRestoringSession,
    demoUsers,
    currentView,
    setCurrentView,
    pendingRequestsCount,
    handleLoginSuccess,
    handleLogout,
  } = useSession({ portal, showToast, lastEventTimestamp, notifyDataChanged });

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
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [requestPrefillBook, setRequestPrefillBook] = useState(null);

  const openAuthModal = () => setIsAuthModalOpen(true);

  const { loadingActionId, handleBorrow, handleJoinWaitlist, handleReturn, handleCancelWaitlist } = useCirculationActions({
    activePortal: portal,
    currentUser,
    showToast,
    notifyDataChanged,
    openAuthModal,
  });

  const handleOpenBookRequest = (prefillBook = null) => {
    setRequestPrefillBook(prefillBook);
    setIsRequestModalOpen(true);
  };

  const selectBook = (book) => setSelectedBookId(book.book_id);

  const catalogProps = {
    books,
    loading: booksLoading,
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    availabilityFilter,
    setAvailabilityFilter,
    currentUser,
    portal,
    onSelectBook: selectBook,
    onBorrow: handleBorrow,
    onJoinWaitlist: handleJoinWaitlist,
    onReturn: handleReturn,
    onRequestBook: handleOpenBookRequest,
    loadingActionId,
    onOpenBookRequest: () => handleOpenBookRequest(),
  };

  const shelfProps = {
    currentUser,
    portal,
    onReturnBook: handleReturn,
    onCancelWaitlist: handleCancelWaitlist,
    onSelectBook: selectBook,
    onOpenBookRequest: () => handleOpenBookRequest(),
    loadingActionId,
    showToast,
    policy: lendingPolicy,
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans pb-12 selection:bg-indigo-100 selection:text-indigo-900">
      <Toast toast={toast} onDismiss={dismissToast} />

      <Navbar
        activePortal={portal}
        currentView={currentView}
        setCurrentView={setCurrentView}
        currentUser={currentUser}
        onOpenAuth={openAuthModal}
        onLogout={handleLogout}
        onOpenBookRequest={() => handleOpenBookRequest()}
        pendingRequestsCount={pendingRequestsCount}
      />

      <main className="flex-1 px-4 sm:px-6 lg:px-8 py-7 max-w-7xl mx-auto w-full">
        {children({
          currentUser,
          isRestoringSession,
          currentView,
          catalogProps,
          shelfProps,
          loadingActionId,
          handleReturn,
          showToast,
          notifyDataChanged,
          lastEventTimestamp,
          lendingPolicy,
          openAuthModal,
        })}
      </main>

      <Footer policy={lendingPolicy} />

      {selectedBookId && (
        <BookDetailModal
          bookId={selectedBookId}
          currentUser={currentUser}
          portal={portal}
          onClose={() => setSelectedBookId(null)}
          onBorrow={handleBorrow}
          onJoinWaitlist={handleJoinWaitlist}
          onReturn={handleReturn}
          onCancelWaitlist={handleCancelWaitlist}
          onRequestBook={handleOpenBookRequest}
          loadingActionId={loadingActionId}
        />
      )}

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

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        role={portal === 'admin' ? 'admin' : 'member'}
        demoUsers={demoUsers}
        onLoginSuccess={handleLoginSuccess}
        showToast={showToast}
      />
    </div>
  );
}
