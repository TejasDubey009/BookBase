import MemberPortalViews from './MemberPortalViews';
import PortalShell from './PortalShell';

export default function KioskApp() {
  return (
    <PortalShell portal="kiosk">
      {(app) => <MemberPortalViews app={app} />}
    </PortalShell>
  );
}
