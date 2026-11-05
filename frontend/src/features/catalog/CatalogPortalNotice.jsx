/** One line on what the current portal allows. The admin portal shows no notice. */
export default function CatalogPortalNotice({ portal }) {
  if (portal === 'kiosk') {
    return (
      <p className="mt-1 text-sm text-muted max-w-2xl">
        Physical borrowing and return station. Click "Borrow Book at Kiosk" below to instantly check out an available copy.
      </p>
    );
  }

  if (portal === 'student') {
    return (
      <p className="mt-1 text-sm text-muted max-w-2xl">
        Remote catalogue inquiry. Checkout and returns are restricted to the Central Library Kiosk. You may submit book procurement requests below.
      </p>
    );
  }

  return null;
}
