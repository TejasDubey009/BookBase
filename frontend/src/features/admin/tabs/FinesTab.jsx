export default function FinesTab({ kpis, students, policy, onSettleFine }) {
  const totalFines = kpis.total_fines || 0;
  const owing = students.filter((student) => student.outstanding_fines > 0);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-medium text-ink">Student Fines</h2>
          <p className="mt-0.5 text-sm text-muted max-w-2xl">
            A late book costs {policy.fineRule}. The charge is added when its return is confirmed.
          </p>
        </div>
        <div className="text-right shrink-0">
          <div className="text-xs text-muted">Total owed</div>
          <div className={`text-lg font-medium tabular-nums ${totalFines > 0 ? 'text-danger' : 'text-ink'}`}>
            ₹{totalFines.toFixed(2)}
          </div>
        </div>
      </div>

      <div className="overflow-x-auto border border-line rounded-lg">
        <table className="w-full text-left text-sm">
          <thead className="text-xs text-muted border-b border-line [&_th]:font-normal">
            <tr>
              <th className="py-3 px-4">Student</th>
              <th className="py-3 px-4">Enrollment Number</th>
              <th className="py-3 px-4">Email</th>
              <th className="py-3 px-4">Fine</th>
              <th className="py-3 px-4 text-right"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line text-body">
            {owing.length === 0 && (
              <tr>
                <td colSpan="5" className="py-10 text-center text-muted">
                  No student owes a fine.
                </td>
              </tr>
            )}
            {owing.map((stu) => (
              <tr key={stu.user_id}>
                <td className="py-3 px-4 text-ink">{stu.full_name}</td>
                <td className="py-3 px-4">{stu.enrollment_no}</td>
                <td className="py-3 px-4 text-xs text-muted">{stu.email}</td>
                <td className="py-3 px-4 tabular-nums font-medium text-danger">₹{stu.outstanding_fines.toFixed(2)}</td>
                <td className="py-3 px-4 text-right">
                  <button
                    onClick={() => onSettleFine(stu.user_id, stu.full_name)}
                    className="px-2.5 py-1 rounded border border-field text-xs text-body hover:bg-shelf whitespace-nowrap transition-colors"
                  >
                    Mark as Paid
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
