/** Shown in place of the librarian console to anyone who isn't signed in as a librarian. */
export default function AdminSignInPrompt({ currentUser, onOpenAuth }) {
  return (
    <div className="max-w-md mx-auto py-20 text-center">
      <h1 className="font-serif text-[28px] leading-snug text-ink">Library staff only</h1>
      <p className="mt-2 text-sm text-muted">
        {currentUser
          ? `${currentUser.full_name} is signed in with a student account, which can't open the circulation desk.`
          : 'Sign in with a staff account to open the circulation desk. New staff can sign up with a staff code.'}
      </p>
      <button
        onClick={onOpenAuth}
        className="mt-5 px-3 py-1.5 rounded bg-accent hover:bg-accent-hover text-white text-sm font-medium transition-colors"
      >
        Sign In
      </button>
    </div>
  );
}
