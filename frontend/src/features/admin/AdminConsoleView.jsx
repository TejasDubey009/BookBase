import { useState } from 'react';
import LoadingState from '../../components/ui/LoadingState';
import TabButton from '../../components/ui/TabButton';
import AdminHeader from './AdminHeader';
import AdminKpiGrid from './AdminKpiGrid';
import BorrowersMatrixTab from './tabs/BorrowersMatrixTab';
import CirculationTab from './tabs/CirculationTab';
import FinesTab from './tabs/FinesTab';
import RequestsTab from './tabs/RequestsTab';
import ReturnsTab from './tabs/ReturnsTab';
import WaitlistTab from './tabs/WaitlistTab';
import { useAdminOverview } from './useAdminOverview';

export default function AdminConsoleView({
  onOpenAddBook,
  onResetDemo,
  showToast,
  lastEventTimestamp,
  notifyDataChanged,
  policy
}) {
  const [activeTab, setActiveTab] = useState('returns'); // 'returns' | 'matrix' | 'circulation' | 'requests' | 'fines' | 'waitlist'
  const [filterOverdue, setFilterOverdue] = useState(false);
  const {
    data,
    loading,
    groupedBooks,
    matrixSearch,
    searchMatrix,
    fetchOverview,
    updateRequestStatus,
    settleFine,
    busyReturnId,
    confirmReturn,
    rejectReturn
  } = useAdminOverview({ showToast, lastEventTimestamp, notifyDataChanged });

  if (loading && !data) {
    return <LoadingState message="Aggregating library circulation metrics and active loans..." />;
  }

  const kpis = data?.kpis || {};
  const allLoans = data?.active_loans || [];
  const waitlistQueue = data?.waitlist_queue || [];
  const returnRequests = data?.return_requests || [];
  const bookRequests = data?.book_requests || [];
  const pendingRequestsCount = bookRequests.filter(r => r.status === 'Pending').length;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <AdminHeader onRefresh={fetchOverview} onOpenAddBook={onOpenAddBook} onResetDemo={onResetDemo} />

      <AdminKpiGrid kpis={kpis} requestsCount={bookRequests.length} pendingRequestsCount={pendingRequestsCount} fineRule={policy.fineRule} />

      <div className="flex items-center gap-6 border-b border-line overflow-x-auto no-scrollbar">
        <TabButton active={activeTab === 'returns'} onClick={() => setActiveTab('returns')}>
          <span>Return Requests ({returnRequests.length})</span>
        </TabButton>
        <TabButton active={activeTab === 'matrix'} onClick={() => setActiveTab('matrix')}>
          <span>Books &amp; Borrowers</span>
        </TabButton>
        <TabButton active={activeTab === 'circulation'} onClick={() => setActiveTab('circulation')}>
          <span>Active Loans ({allLoans.length})</span>
        </TabButton>
        <TabButton active={activeTab === 'requests'} onClick={() => setActiveTab('requests')}>
          <span>Book Requests ({bookRequests.length})</span>
          {pendingRequestsCount > 0 && (
            <span className="text-xs text-muted tabular-nums">{pendingRequestsCount}</span>
          )}
        </TabButton>
        <TabButton active={activeTab === 'fines'} onClick={() => setActiveTab('fines')}>
          <span>Fines</span>
        </TabButton>
        <TabButton active={activeTab === 'waitlist'} onClick={() => setActiveTab('waitlist')}>
          <span>Reservations ({waitlistQueue.length})</span>
        </TabButton>
      </div>

      {activeTab === 'returns' && (
        <ReturnsTab
          returnRequests={returnRequests}
          policy={policy}
          busyRequestId={busyReturnId}
          onConfirm={confirmReturn}
          onReject={rejectReturn}
        />
      )}
      {activeTab === 'matrix' && (
        <BorrowersMatrixTab
          groupedBooks={groupedBooks}
          matrixSearch={matrixSearch}
          onSearchMatrix={searchMatrix}
        />
      )}
      {activeTab === 'circulation' && (
        <CirculationTab
          allLoans={allLoans}
          filterOverdue={filterOverdue}
          setFilterOverdue={setFilterOverdue}
        />
      )}
      {activeTab === 'requests' && <RequestsTab bookRequests={bookRequests} onUpdateStatus={updateRequestStatus} />}
      {activeTab === 'fines' && <FinesTab kpis={kpis} students={data?.student_fines || []} policy={policy} onSettleFine={settleFine} />}
      {activeTab === 'waitlist' && <WaitlistTab waitlistQueue={waitlistQueue} />}
    </div>
  );
}
