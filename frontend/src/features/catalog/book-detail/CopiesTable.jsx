
export default function CopiesTable({ book }) {
  return (
    <div className="border border-line rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-line flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium text-ink">
            Shelf Copies &amp; Accession Details
          </h3>
        </div>
        <span className="text-xs text-muted">
          Accession Records
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="text-xs text-muted border-b border-line [&_th]:font-normal">
            <tr>
              <th className="py-2.5 px-4">Copy ID</th>
              <th className="py-2.5 px-4">Barcode</th>
              <th className="py-2.5 px-4">Shelf Location</th>
              <th className="py-2.5 px-4">Condition</th>
              <th className="py-2.5 px-4">Status</th>
              <th className="py-2.5 px-4">Borrower / Due Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {book.copies && book.copies.length > 0 ? (
              book.copies.map((copy) => {
                const isIssued = copy.status === 'Issued';
                const isAvailable = copy.status === 'Available';
                return (
                  <tr key={copy.copy_id}>
                    <td className="py-2.5 px-4 text-muted">#{copy.copy_id}</td>
                    <td className="py-2.5 px-4 text-ink">{copy.barcode}</td>
                    <td className="py-2.5 px-4 text-body">{copy.shelf_location}</td>
                    <td className="py-2.5 px-4">
                      <span className="text-body">
                        {copy.condition}
                      </span>
                    </td>
                    <td className="py-2.5 px-4">
                      {isAvailable ? (
                        <span className="text-body">
                          Available
                        </span>
                      ) : (
                        <span className="text-body">
                          Issued
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-body">
                      {isIssued && copy.current_due_date ? (
                        <span className="text-xs">
                          {copy.current_borrower_name && `${copy.current_borrower_name} • `}Due: {copy.current_due_date.slice(0, 10)}
                        </span>
                      ) : (
                        <span className="text-muted text-xs">Ready on shelf</span>
                      )}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="6" className="py-4 text-center text-muted">
                  No physical copies registered for this title.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
