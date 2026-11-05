import { useEffect, useState } from 'react';
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
  showToast,
  policy
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

  // The kiosk's shelf is only for returning books. Everything else lives on the Student Portal.
  const showTabs = portal !== 'kiosk';

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <PatronSummaryCard user={user} activeLoansCount={activeLoans.length} onOpenBookRequest={onOpenBookRequest}>
        <ShelfPortalBanner portal={portal} />
      </PatronSummaryCard>

      {showTabs && (
        <div className="flex items-center gap-6 border-b border-line overflow-x-auto no-scrollbar">
          <TabButton active={activeTab === 'loans'} onClick={() => setActiveTab('loans')}>
            <span>My Loans ({activeLoans.length})</span>
          </TabButton>
          <TabButton active={activeTab === 'waitlists'} onClick={() => setActiveTab('waitlists')}>
            <span>Reservations ({waitlists.length})</span>
          </TabButton>
          <TabButton active={activeTab === 'requests'} onClick={() => setActiveTab('requests')}>
            <span>Book Requests ({bookRequests.length})</span>
          </TabButton>
          <TabButton id="helpdesk-tab" active={activeTab === 'helpdesk'} onClick={() => setActiveTab('helpdesk')}>
            <span>Help Desk</span>
          </TabButton>
          {history.length > 0 && (
            <TabButton active={activeTab === 'history'} onClick={() => setActiveTab('history')}>
              <span>History</span>
            </TabButton>
          )}
        </div>
      )}

      {activeTab === 'loans' && (
        <ActiveLoansTab
          activeLoans={activeLoans}
          portal={portal}
          onSelectBook={onSelectBook}
          onReturnBook={onReturnBook}
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
      {activeTab === 'helpdesk' && <HelpDeskTab policy={policy} />}
      {activeTab === 'history' && history.length > 0 && <HistoryTab history={history} />}
    </div>
  );
}
