import { LogIn, ShieldCheck } from 'lucide-react';

/** Shown in place of the librarian console to anyone who isn't signed in as a librarian. */
export default function AdminSignInPrompt({ currentUser, onOpenAuth }) {
  return (
    <div className="max-w-md mx-auto mt-16 p-8 text-center bg-white rounded-3xl border border-slate-200/90 shadow-2xs">
      <div className="w-12 h-12 mx-auto rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center">
        <ShieldCheck className="w-6 h-6 text-amber-600" />
      </div>
      <h2 className="mt-4 text-base font-bold text-slate-900">Librarian sign-in required</h2>
      <p className="mt-1.5 text-xs text-slate-500">
        {currentUser
          ? `${currentUser.full_name} is signed in with a student account, which can't open the circulation desk.`
          : 'Sign in with a Library Staff account to open the circulation desk.'}
      </p>
      <button
        onClick={onOpenAuth}
        className="mt-5 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all"
      >
        <LogIn className="w-3.5 h-3.5" />
        <span>Sign In</span>
      </button>
    </div>
  );
}
