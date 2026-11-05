import { Barcode, BookOpen, BookPlus, Layers } from 'lucide-react';

const CARD_CLASSES = 'bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-2xs';

function KpiCard({ label, icon, value, note, noteClassName = 'text-slate-500', className }) {
  return (
    <div className={className ? `${className} ${CARD_CLASSES}` : CARD_CLASSES}>
      <div className="flex items-center justify-between text-slate-500 mb-1.5">
        <span className="text-[11px] font-semibold uppercase tracking-wider">{label}</span>
        {icon}
      </div>
      <div className="text-2xl font-bold font-mono text-slate-900">{value}</div>
      <p className={`text-[10px] ${noteClassName} mt-0.5`}>{note}</p>
    </div>
  );
}

export default function AdminKpiGrid({ kpis, requestsCount, pendingRequestsCount }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
      <KpiCard
        label="Curriculum Titles"
        icon={<BookOpen className="w-4 h-4 text-indigo-500" />}
        value={kpis.total_titles || 0}
        note="3NF Normalized IP"
      />
      <KpiCard
        label="Physical Copies"
        icon={<Layers className="w-4 h-4 text-emerald-500" />}
        value={kpis.physical_copies || 0}
        note={`${kpis.available_copies || 0} Available on shelf`}
        noteClassName="text-emerald-600 font-medium"
      />
      <KpiCard
        label="Active Loans"
        icon={<Barcode className="w-4 h-4 text-indigo-500" />}
        value={kpis.active_loans || 0}
        note="Checked out to students"
      />
      <KpiCard
        label="Acquisition Requests"
        icon={<BookPlus className="w-4 h-4 text-purple-500" />}
        value={requestsCount}
        note={`${pendingRequestsCount} Pending review`}
        noteClassName="text-purple-600 font-medium"
      />
      <KpiCard
        className="col-span-2 sm:col-span-1"
        label="Assessed Fines"
        icon={<span className="font-bold text-rose-500 font-mono">₹</span>}
        value={`₹${(kpis.total_fines || 0).toFixed(2)}`}
        note="₹2.00/day retention rate"
      />
    </div>
  );
}
