import React from 'react';
import { 
  Building2, 
  MapPin, 
  Phone, 
  Mail, 
  Clock, 
  BookMarked, 
  GraduationCap, 
  ShieldCheck,
  Library
} from 'lucide-react';

export default function Footer({ onOpenAuth }) {
  return (
    <footer className="mt-20 border-t border-slate-200/90 bg-white/80 backdrop-blur-md text-slate-600 text-xs">
      {/* Top Banner: Circulation Desk Status */}
      <div className="bg-indigo-950 text-indigo-200 py-3 px-4 sm:px-6 lg:px-8 border-b border-indigo-900/50">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="font-semibold text-white tracking-wide">
              Central Library Circulation Desk — Open Today until 8:00 PM
            </span>
          </div>
          <div className="flex items-center gap-4 text-xs font-medium">
            <span className="flex items-center gap-1 text-indigo-300">
              <Clock className="w-3.5 h-3.5 text-indigo-400" />
              <span>Standard 14-Day Loan Policy</span>
            </span>
            <span className="opacity-40">•</span>
            <a href="mailto:library.desk@bookbase.in" className="hover:text-white transition-colors flex items-center gap-1">
              <Mail className="w-3.5 h-3.5 text-indigo-400" />
              <span>library.desk@bookbase.in</span>
            </a>
          </div>
        </div>
      </div>

      {/* Main Footer Directory */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          
          {/* Column 1: Institutional Identity */}
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-indigo-900 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                <Library className="w-4 h-4 text-white" />
              </div>
              <div>
                <div className="font-bold text-slate-900 text-sm tracking-tight leading-tight">
                  BookBase
                </div>
                <div className="text-[11px] text-indigo-700 font-semibold">
                  Curriculum Library &amp; Book Bank
                </div>
              </div>
            </div>
            <p className="text-slate-500 text-xs leading-relaxed pt-1">
              Catalog and physical textbook bank portal dedicated to students and faculty for Computer Science and Business Systems (CSBS).
            </p>
          </div>

          {/* Column 2: Hours & Borrowing Guidelines */}
          <div className="space-y-3">
            <h4 className="font-bold uppercase tracking-wider text-slate-900 text-[11px] flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-indigo-600" />
              Circulation Hours &amp; Policy
            </h4>
            <ul className="space-y-2 text-xs text-slate-600">
              <li className="flex justify-between border-b border-slate-100 pb-1.5">
                <span className="text-slate-500">Monday – Friday</span>
                <span className="font-medium text-slate-800">8:00 AM – 8:00 PM</span>
              </li>
              <li className="flex justify-between border-b border-slate-100 pb-1.5">
                <span className="text-slate-500">Saturday – Sunday</span>
                <span className="font-medium text-slate-800">9:00 AM – 5:30 PM</span>
              </li>
              <li className="flex justify-between border-b border-slate-100 pb-1.5">
                <span className="text-slate-500">Loan Duration</span>
                <span className="font-medium text-slate-800">14 Days (Renewable)</span>
              </li>
              <li className="flex justify-between">
                <span className="text-slate-500">Overdue Retention Fee</span>
                <span className="font-medium text-rose-600 font-mono">₹2.00 / day</span>
              </li>
            </ul>
          </div>

          {/* Column 3: Academic Resources */}
          <div className="space-y-3">
            <h4 className="font-bold uppercase tracking-wider text-slate-900 text-[11px] flex items-center gap-1.5">
              <BookMarked className="w-3.5 h-3.5 text-indigo-600" />
              Academic Sections
            </h4>
            <ul className="space-y-1.5 text-xs">
              <li className="text-slate-600 flex items-center gap-1.5">
                <GraduationCap className="w-3 h-3 text-slate-400" />
                <span>CSBS Prescribed Course Textbooks</span>
              </li>
              <li className="text-slate-600 flex items-center gap-1.5">
                <BookMarked className="w-3 h-3 text-slate-400" />
                <span>O'Reilly Professional Technical Editions</span>
              </li>
              <li className="text-slate-600 flex items-center gap-1.5">
                <ShieldCheck className="w-3 h-3 text-slate-400" />
                <span>Automated Reservation &amp; Queue Management</span>
              </li>
            </ul>
          </div>

          {/* Column 4: Helpdesk */}
          <div className="space-y-3">
            <h4 className="font-bold uppercase tracking-wider text-slate-900 text-[11px] flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-indigo-600" />
              Circulation Desk
            </h4>
            <address className="not-italic text-xs text-slate-600 space-y-1.5">
              <p className="font-medium text-slate-800">Central Library Wing</p>
              <p>Stack Floors 1 – 4 • Circulation Counter</p>
              <div className="pt-2 space-y-1 text-[11px]">
                <p className="text-slate-500">
                  Helpdesk Email: <a href="mailto:library.desk@bookbase.in" className="text-indigo-600 hover:underline">library.desk@bookbase.in</a>
                </p>
                <p className="text-slate-500">
                  Resource Cell: <span className="font-mono text-slate-700">LIB-CSBS-DESK</span>
                </p>
              </div>
            </address>
          </div>

        </div>

        {/* Bottom Copyright Bar */}
        <div className="mt-10 pt-6 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-500">
          <div>
            © {new Date().getFullYear()} BookBase. All Rights Reserved. Central Library Resource System.
          </div>
          <div className="flex items-center gap-4">
            <span>Computer Science and Business Systems (CSBS) Book Bank</span>
            <span>•</span>
            <span>Academic Library Management System</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
