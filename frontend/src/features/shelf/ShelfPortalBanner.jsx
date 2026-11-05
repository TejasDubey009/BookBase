/** One line on what this portal's shelf allows. */
export default function ShelfPortalBanner({ portal }) {
  return (
    <p className="mt-1 text-sm text-muted max-w-2xl">
      {portal === 'kiosk'
        ? 'Self-service return station enabled. You can return physical copies directly below.'
        : 'Remote inquiry portal. Due dates are shown below. Physical returns must be processed at the Central Library Kiosk.'}
    </p>
  );
}
