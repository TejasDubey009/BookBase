/** One line on what the current portal allows. The admin portal shows no notice. */
export default function CatalogPortalNotice({ portal }) {
  if (portal === 'kiosk') {
    return (
      <p className="mt-1 text-sm text-muted max-w-2xl">
        Find a book, then enter the code on its label to borrow it.
      </p>
    );
  }

  if (portal === 'student') {
    return (
      <p className="mt-1 text-sm text-muted max-w-2xl">
        See what's available and join a waitlist. Borrowing and returns happen at the Library Kiosk.
      </p>
    );
  }

  return null;
}
