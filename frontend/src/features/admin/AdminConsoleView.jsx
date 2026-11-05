import { useState } from 'react';
import { Barcode, BookOpen, BookPlus, Clock, CreditCard } from 'lucide-react';
import LoadingState from '../../components/ui/LoadingState';
import TabButton from '../../components/ui/TabButton';
import AdminHeader from './AdminHeader';
import AdminKpiGrid from './AdminKpiGrid';
import BorrowersMatrixTab from './tabs/BorrowersMatrixTab';
import CirculationTab from './tabs/CirculationTab';
import FinesTab from './tabs/FinesTab';
import RequestsTab from './tabs/RequestsTab';
import WaitlistTab from './tabs/WaitlistTab';
import { useAdminOverview } from './useAdminOverview';

export default function AdminConsoleView({
  onReturnBook,
  onOpenAddBook,
  onResetDemo,
  loadingActionId,
  showToast,
  lastEventTimestamp,
  fineRate
}) {
  const [activeTab, setActiveTab] = useState('matrix'); // 'matrix' | 'circulation' | 'requests' | 'fines' | 'waitlist'
  const [filterOverdue, setFilterOverdue] = useState(false);
  const {
    data,
    loading,
    groupedBooks,
    matrixSearch,
    searchMatrix,
    fetchOverview,
    updateRequestStatus,
    settleFine
  } = useAdminOverview({ showToast, lastEventTimestamp });

  if (loading && !data) {
    return <LoadingState message="Aggregating library circulation metrics and active loans..." />;
  }

  const kpis = data?.kpis || {};
  const allLoans = data?.active_loans || [];
  const waitlistQueue = data?.waitlist_queue || [];
  const bookRequests = data?.book_requests || [];
  const pendingRequestsCount = bookRequests.filter(r => r.status === 'Pending').length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <AdminHeader onRefresh={fetchOverview} onOpenAddBook={onOpenAddBook} onResetDemo={onResetDemo} />

      <AdminKpiGrid kpis={kpis} requestsCount={bookRequests.length} pendingRequestsCount={pendingRequestsCount} fineRate={fineRate} />

      <div className="flex items-center gap-2 border-b border-slate-200 pb-3 overflow-x-auto">
        <TabButton active={activeTab === 'matrix'} onClick={() => setActiveTab('matrix')} icon={BookOpen}>
          <span>Book &amp; Borrowers Matrix (Grouped View)</span>
        </TabButton>
        <TabButton active={activeTab === 'circulation'} onClick={() => setActiveTab('circulation')} icon={Barcode}>
          <span>Active Circulation Loans ({allLoans.length})</span>
        </TabButton>
        <TabButton active={activeTab === 'requests'} onClick={() => setActiveTab('requests')} icon={BookPlus}>
          <span>Student Book Requests ({bookRequests.length})</span>
          {pendingRequestsCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-amber-400 text-amber-950 font-bold">
              {pendingRequestsCount}
            </span>
          )}
        </TabButton>
        <TabButton active={activeTab === 'fines'} onClick={() => setActiveTab('fines')} icon={CreditCard}>
          <span>Fines Ledger &amp; Settlement</span>
        </TabButton>
        <TabButton active={activeTab === 'waitlist'} onClick={() => setActiveTab('waitlist')} icon={Clock}>
          <span>Course Reservations ({waitlistQueue.length})</span>
        </TabButton>
      </div>

      {activeTab === 'matrix' && (
        <BorrowersMatrixTab
          groupedBooks={groupedBooks}
          matrixSearch={matrixSearch}
          onSearchMatrix={searchMatrix}
          loadingActionId={loadingActionId}
          onReturnBook={onReturnBook}
          fetchOverview={fetchOverview}
        />
      )}
      {activeTab === 'circulation' && (
        <CirculationTab
          allLoans={allLoans}
          filterOverdue={filterOverdue}
          setFilterOverdue={setFilterOverdue}
          loadingActionId={loadingActionId}
          onReturnBook={onReturnBook}
          fetchOverview={fetchOverview}
        />
      )}
      {activeTab === 'requests' && <RequestsTab bookRequests={bookRequests} onUpdateStatus={updateRequestStatus} />}
      {activeTab === 'fines' && <FinesTab kpis={kpis} students={data?.student_fines || []} fineRate={fineRate} onSettleFine={settleFine} />}
      {activeTab === 'waitlist' && <WaitlistTab waitlistQueue={waitlistQueue} />}
    </div>
  );
}
