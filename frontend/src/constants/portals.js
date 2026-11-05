export const PORTALS = ['kiosk', 'student', 'admin'];

const PORTAL_META = {
  kiosk: {
    terminal: 'DESK-KIOSK-01',
    badge: 'Kiosk Terminal',
    badgeClassName: 'bg-indigo-50 text-indigo-800 border-indigo-200',
    tagline: 'On-Premise Physical Borrow & Return Station',
  },
  student: {
    terminal: 'REMOTE-CLIENT',
    badge: 'Student Portal',
    badgeClassName: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    tagline: 'Personal Due Dates, Requests & Discovery',
  },
  admin: {
    terminal: 'STAFF-CONSOLE',
    badge: 'Admin Console',
    badgeClassName: 'bg-amber-50 text-amber-800 border-amber-200',
    tagline: 'Central Catalog, Borrowers Matrix & Fines',
  },
};

export const getPortalMeta = (portal) => PORTAL_META[portal] || PORTAL_META.admin;
