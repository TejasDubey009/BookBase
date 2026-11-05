const PORTAL_META = {
  kiosk: { label: 'Library Kiosk', signInLabel: 'Login with Roll No' },
  student: { label: 'Student Portal', signInLabel: 'Login with Roll No' },
  admin: { label: 'Admin Portal', signInLabel: 'Staff Sign In' },
};

export const getPortalMeta = (portal) => PORTAL_META[portal] || PORTAL_META.admin;
