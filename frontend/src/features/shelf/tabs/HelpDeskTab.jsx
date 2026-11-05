
export default function HelpDeskTab({ policy }) {
  return (
    <div id="helpdesk-section" className="space-y-6">
      <div className="space-y-4">
        <div>
          <h2 className="text-base text-ink">
            Central Library Help Desk &amp; Operating Policies
          </h2>
          <p className="mt-0.5 text-sm text-muted">
            Essential circulation rules, operating schedules, fine assessment schedules, and librarian contact.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-line border border-line rounded-lg overflow-hidden">
          {/* Card 1: Operating Hours */}
          <div className="p-5 bg-white space-y-3">
            <div className="text-sm font-medium text-ink">
              <span>Library Working Hours</span>
            </div>
            <div className="space-y-1.5 text-sm text-body">
              <div className="flex justify-between">
                <span>Monday – Friday:</span>
                <span className="text-ink">8:00 AM – 8:00 PM</span>
              </div>
              <div className="flex justify-between">
                <span>Saturday – Sunday:</span>
                <span className="text-ink">9:00 AM – 5:30 PM</span>
              </div>
            </div>
            <div className="pt-2 border-t border-line text-xs text-muted">
              Drop box accessible 24/7 at East Entrance.
            </div>
          </div>

          {/* Card 2: Circulation Rules */}
          <div className="p-5 bg-white space-y-3">
            <div className="text-sm font-medium text-ink">
              <span>Borrowing Policies</span>
            </div>
            <div className="space-y-1.5 text-sm text-body">
              <div className="flex justify-between">
                <span>Borrowing Quota:</span>
                <span className="text-ink">{policy.maxLoans} Books per Student</span>
              </div>
              <div className="flex justify-between">
                <span>Loan Duration:</span>
                <span className="text-ink">{policy.loanDays} Calendar Days</span>
              </div>
              <div className="flex justify-between">
                <span>Late Return Penalty:</span>
                <span className="text-ink">{policy.fineRate} / day / book</span>
              </div>
            </div>
            <div className="pt-2 border-t border-line text-xs text-muted">
              Fines must be cleared before exam hall tickets.
            </div>
          </div>

          {/* Card 3: Contact Desk */}
          <div className="p-5 bg-white space-y-3">
            <div className="text-sm font-medium text-ink">
              <span>Contact Information</span>
            </div>
            <div className="space-y-1.5 text-sm text-body">
              <div>
                <span>library.desk@bookbase.in</span>
              </div>
              <div>
                <span>+91 80 2345 6789</span>
              </div>
              <div>
                <span>Central Library Wing</span>
              </div>
            </div>
            <div className="pt-2 border-t border-line text-xs text-muted">
              For missing books, submit an Acquisition Request.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
