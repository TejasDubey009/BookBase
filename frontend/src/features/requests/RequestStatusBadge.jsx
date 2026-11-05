const STATUS_CLASSES = {
  Procured: 'bg-ink text-white',
  Approved: 'bg-shelf text-ink',
  Rejected: 'border border-field text-danger',
};
const PENDING_CLASSES = 'border border-field text-body';

export default function RequestStatusBadge({ status }) {
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs ${STATUS_CLASSES[status] || PENDING_CLASSES}`}>
      {status}
    </span>
  );
}
