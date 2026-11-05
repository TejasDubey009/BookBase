const WEEKDAY_HOURS = '8:00 AM – 8:00 PM';
const WEEKEND_HOURS = '9:00 AM – 5:30 PM';

function hoursToday() {
  const day = new Date().getDay(); // 0 is Sunday, 6 is Saturday
  return day === 0 || day === 6 ? WEEKEND_HOURS : WEEKDAY_HOURS;
}

export default function Footer({ policy }) {
  return (
    <footer className="mt-16 border-t border-line text-sm text-muted">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col md:flex-row md:items-center justify-between gap-2">
        <p>Central Library Circulation Desk · Open Today {hoursToday()}</p>
        <p>
          {policy.loanDays}-day loans · {policy.fineRule} if overdue ·{' '}
          <a href="mailto:library.desk@bookbase.in" className="text-body hover:text-ink underline underline-offset-2 transition-colors">
            library.desk@bookbase.in
          </a>
        </p>
      </div>
    </footer>
  );
}
