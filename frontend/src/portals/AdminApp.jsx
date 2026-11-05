import { useState } from 'react';
import { api } from '../api/bookbase';
import LoadingState from '../components/ui/LoadingState';
import AdminConsoleView from '../features/admin/AdminConsoleView';
import AdminSignInPrompt from '../features/admin/AdminSignInPrompt';
import AddBookModal from '../features/catalog/AddBookModal';
import CatalogView from '../features/catalog/CatalogView';
import PortalShell from './PortalShell';

function AdminViews({ app }) {
  const [isAddBookOpen, setIsAddBookOpen] = useState(false);
  const openAddBook = () => setIsAddBookOpen(true);

  if (app.isRestoringSession) {
    return <LoadingState message="Restoring your session..." />;
  }

  // Nothing on this site is available without a librarian account
  if (app.currentUser?.role !== 'admin') {
    return <AdminSignInPrompt currentUser={app.currentUser} onOpenAuth={app.openAuthModal} />;
  }

  const handleResetDemo = async () => {
    if (!window.confirm('Reset BookBase database back to the clean initial state?')) {
      return;
    }
    try {
      await api.resetDemoDb();
      app.showToast({
        type: 'success',
        message: '⚡ Database cleanly reset to pristine demo state!',
      });
      app.notifyDataChanged();
    } catch (err) {
      app.showToast({ type: 'error', message: err.message });
    }
  };

  return (
    <>
      {app.currentView === 'catalog' && <CatalogView {...app.catalogProps} onOpenAddBook={openAddBook} />}

      {app.currentView === 'admin-console' && (
        <AdminConsoleView
          onOpenAddBook={openAddBook}
          onResetDemo={handleResetDemo}
          showToast={app.showToast}
          lastEventTimestamp={app.lastEventTimestamp}
          notifyDataChanged={app.notifyDataChanged}
          policy={app.lendingPolicy}
        />
      )}

      <AddBookModal
        isOpen={isAddBookOpen}
        onClose={() => setIsAddBookOpen(false)}
        onSuccess={app.notifyDataChanged}
        showToast={app.showToast}
      />
    </>
  );
}

export default function AdminApp() {
  return (
    <PortalShell portal="admin">
      {(app) => <AdminViews app={app} />}
    </PortalShell>
  );
}
