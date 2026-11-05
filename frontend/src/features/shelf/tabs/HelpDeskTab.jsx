import { Clock, HelpCircle, Mail, MapPin, PhoneCall, ShieldCheck } from 'lucide-react';

export default function HelpDeskTab({ policy }) {
  return (
    <div id="helpdesk-section" className="space-y-6">
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-indigo-600" />
            Central Library Help Desk &amp; Operating Policies
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Essential circulation rules, operating schedules, fine assessment schedules, and librarian contact.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Card 1: Operating Hours */}
          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
            <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs uppercase tracking-wider">
              <Clock className="w-4 h-4" />
              <span>Library Working Hours</span>
            </div>
            <div className="space-y-1.5 text-xs text-slate-600">
              <div className="flex justify-between">
                <span className="font-medium">Monday – Friday:</span>
                <span className="font-mono font-bold text-slate-800">8:00 AM – 8:00 PM</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Saturday – Sunday:</span>
                <span className="font-mono font-bold text-slate-800">9:00 AM – 5:30 PM</span>
              </div>
            </div>
            <div className="pt-2 border-t border-slate-200 text-[11px] text-slate-500">
              Drop box accessible 24/7 at East Entrance.
            </div>
          </div>

          {/* Card 2: Circulation Rules */}
          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
            <div className="flex items-center gap-2 text-emerald-600 font-bold text-xs uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4" />
              <span>Borrowing Policies</span>
            </div>
            <div className="space-y-1.5 text-xs text-slate-600">
              <div className="flex justify-between">
                <span>Borrowing Quota:</span>
                <span className="font-bold text-slate-800">{policy.maxLoans} Books per Student</span>
              </div>
              <div className="flex justify-between">
                <span>Loan Duration:</span>
                <span className="font-bold text-slate-800">{policy.loanDays} Calendar Days</span>
              </div>
              <div className="flex justify-between">
                <span>Late Return Penalty:</span>
                <span className="font-mono font-bold text-rose-600">{policy.fineRate} / day / book</span>
              </div>
            </div>
            <div className="pt-2 border-t border-slate-200 text-[11px] text-slate-500">
              Fines must be cleared before exam hall tickets.
            </div>
          </div>

          {/* Card 3: Contact Desk */}
          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
            <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs uppercase tracking-wider">
              <PhoneCall className="w-4 h-4" />
              <span>Contact Information</span>
            </div>
            <div className="space-y-2 text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                <span className="font-mono">library.desk@bookbase.in</span>
              </div>
              <div className="flex items-center gap-2">
                <PhoneCall className="w-3.5 h-3.5 text-slate-400" />
                <span className="font-mono">+91 80 2345 6789</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                <span>Central Library Wing</span>
              </div>
            </div>
            <div className="pt-2 border-t border-slate-200 text-[11px] text-slate-500">
              For missing books, submit an Acquisition Request.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
