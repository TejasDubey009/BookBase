import MemberPortalViews from './MemberPortalViews';
import PortalShell from './PortalShell';

export default function StudentApp() {
  return (
    <PortalShell portal="student">
      {(app) => <MemberPortalViews app={app} />}
    </PortalShell>
  );
}
