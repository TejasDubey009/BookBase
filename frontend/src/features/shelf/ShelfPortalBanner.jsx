/** One line on what this portal's shelf allows. */
export default function ShelfPortalBanner({ portal }) {
  return (
    <p className="mt-1 text-sm text-muted max-w-2xl">
      {portal === 'kiosk'
        ? 'Returning a book? Request the return below, then hand the book to a librarian.'
        : 'Your due dates, reservations and book requests. To return a book, use the Library Kiosk.'}
    </p>
  );
}
