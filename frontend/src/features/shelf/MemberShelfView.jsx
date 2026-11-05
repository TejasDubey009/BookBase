import { useEffect, useState } from 'react';
import { BookOpen, BookPlus, Clock, HelpCircle, History } from 'lucide-react';
import { api } from '../../api/bookbase';
import LoadingState from '../../components/ui/LoadingState';
import TabButton from '../../components/ui/TabButton';
import PatronSummaryCard from './PatronSummaryCard';
import ShelfPortalBanner from './ShelfPortalBanner';
import ActiveLoansTab from './tabs/ActiveLoansTab';
import HelpDeskTab from './tabs/HelpDeskTab';
import HistoryTab from './tabs/HistoryTab';
import MyRequestsTab from './tabs/MyRequestsTab';
import ReservationsTab from './tabs/ReservationsTab';

export default function MemberShelfView({
  currentUser,
  portal = 'kiosk', // 'kiosk' | 'student'
  onReturnBook,
  onCancelWaitlist,
  onSelectBook,
  onOpenBookRequest,
  loadingActionId,
  showToast
}) {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('loans'); // 'loans' | 'waitlists' | 'requests' | 'helpdesk' | 'history'

  const fetchDashboard = () => {
    if (!currentUser) return;
    setLoading(true);
    api.getUserDashboard(currentUser.user_id)
      .then((data) => {
        setDashboard(data);
        setLoading(false);
      })
      .catch((err) => {
        showToast({ type: 'error', message: err.message });
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchDashboard();
  }, [currentUser]);

  if (loading && !dashboard) {
    return <LoadingState message="Loading student shelf, due dates, and circulation records..." />;
  }

  const activeLoans = dashboard?.active_loans || [];
  const waitlists = dashboard?.active_waitlists || [];
  const history = dashboard?.loan_history || [];
  const bookRequests = dashboard?.book_requests || [];
  const user = dashboard?.user || currentUser;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <ShelfPortalBanner portal={portal} />

      <PatronSummaryCard user={user} activeLoansCount={activeLoans.length} onOpenBookRequest={onOpenBookRequest} />

      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
        <TabButton active={activeTab === 'loans'} onClick={() => setActiveTab('loans')} icon={BookOpen}>
          <span>Active Borrowings &amp; Due Dates ({activeLoans.length})</span>
        </TabButton>
        <TabButton active={activeTab === 'waitlists'} onClick={() => setActiveTab('waitlists')} icon={Clock}>
          <span>Course Reservations ({waitlists.length})</span>
        </TabButton>
        <TabButton active={activeTab === 'requests'} onClick={() => setActiveTab('requests')} icon={BookPlus}>
          <span>My Acquisition Requests ({bookRequests.length})</span>
        </TabButton>
        <TabButton id="helpdesk-tab" active={activeTab === 'helpdesk'} onClick={() => setActiveTab('helpdesk')} icon={HelpCircle}>
          <span>Library Help Desk</span>
        </TabButton>
        {history.length > 0 && (
          <TabButton active={activeTab === 'history'} onClick={() => setActiveTab('history')} icon={History}>
            <span>Circulation History</span>
          </TabButton>
        )}
      </div>

      {activeTab === 'loans' && (
        <ActiveLoansTab
          activeLoans={activeLoans}
          portal={portal}
          onSelectBook={onSelectBook}
          onReturnBook={onReturnBook}
          fetchDashboard={fetchDashboard}
          loadingActionId={loadingActionId}
        />
      )}
      {activeTab === 'waitlists' && (
        <ReservationsTab
          waitlists={waitlists}
          onSelectBook={onSelectBook}
          onCancelWaitlist={onCancelWaitlist}
          fetchDashboard={fetchDashboard}
        />
      )}
      {activeTab === 'requests' && (
        <MyRequestsTab bookRequests={bookRequests} onOpenBookRequest={onOpenBookRequest} />
      )}
      {activeTab === 'helpdesk' && <HelpDeskTab />}
      {activeTab === 'history' && history.length > 0 && <HistoryTab history={history} />}
    </div>
  );
}
