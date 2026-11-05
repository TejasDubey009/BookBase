const STATUS_CLASSES = {
  Procured: 'bg-emerald-100 text-emerald-800 border border-emerald-300',
  Approved: 'bg-blue-100 text-blue-800 border border-blue-300',
  Rejected: 'bg-rose-100 text-rose-800 border border-rose-300',
};
const PENDING_CLASSES = 'bg-amber-100 text-amber-800 border border-amber-300';

export default function RequestStatusBadge({ status }) {
  return (
    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider font-mono ${STATUS_CLASSES[status] || PENDING_CLASSES}`}>
      {status}
    </span>
  );
}
