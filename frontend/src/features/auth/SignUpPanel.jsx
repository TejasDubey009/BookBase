import { Eye, EyeOff } from 'lucide-react';

export default function SignUpPanel({
  isStaff,
  handleRegister,
  regFullName,
  setRegFullName,
  regEnrollmentNo,
  setRegEnrollmentNo,
  regEmail,
  setRegEmail,
  regPassword,
  setRegPassword,
  regConfirmPassword,
  setRegConfirmPassword,
  regStaffCode,
  setRegStaffCode,
  showPassword,
  setShowPassword,
  loading
}) {
  return (
    <div className="p-6 pt-3 space-y-4">
      {isStaff && (
        <div className="p-3 bg-shelf border border-line rounded text-xs text-body">
          Staff accounts need the staff code from the library administrator.
        </div>
      )}

      <form onSubmit={handleRegister} className="space-y-3">
        <div>
          <label className="block text-xs text-muted mb-1">
            Full Name <span className="text-danger">*</span>
          </label>
          <div className="relative">
            <input
              type="text"
              required
              value={regFullName}
              onChange={(e) => setRegFullName(e.target.value)}
              placeholder="e.g. Riya Sharma"
              className="w-full px-3 py-2 text-xs rounded border border-field bg-white text-ink focus:outline-none focus:ring-1 focus:ring-ink focus:border-ink"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs text-muted mb-1">
            Enrollment Number <span className="text-danger">*</span>
          </label>
          <div className="relative">
            <input
              type="text"
              required
              value={regEnrollmentNo}
              onChange={(e) => setRegEnrollmentNo(e.target.value)}
              placeholder="e.g. CSBS2023019"
              className="w-full px-3 py-2 text-xs rounded border border-field bg-white text-ink focus:outline-none focus:ring-1 focus:ring-ink focus:border-ink"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs text-muted mb-1">
            Email <span className="text-danger">*</span>
          </label>
          <div className="relative">
            <input
              type="email"
              required
              value={regEmail}
              onChange={(e) => setRegEmail(e.target.value)}
              placeholder="e.g. riya@bookbase.in"
              className="w-full px-3 py-2 text-xs rounded border border-field bg-white text-ink focus:outline-none focus:ring-1 focus:ring-ink focus:border-ink"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs text-muted mb-1">
            Password <span className="text-danger">*</span>
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              required
              value={regPassword}
              onChange={(e) => setRegPassword(e.target.value)}
              placeholder="At least 8 characters"
              minLength={8}
              className="w-full pl-3 pr-9 py-2 text-xs rounded border border-field bg-white text-ink focus:outline-none focus:ring-1 focus:ring-ink focus:border-ink"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-2.5 text-muted hover:text-ink"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-xs text-muted mb-1">
            Confirm Password <span className="text-danger">*</span>
          </label>
          <input
            type={showPassword ? 'text' : 'password'}
            required
            value={regConfirmPassword}
            onChange={(e) => setRegConfirmPassword(e.target.value)}
            placeholder="Type the password again"
            className="w-full px-3 py-2 text-xs rounded border border-field bg-white text-ink focus:outline-none focus:ring-1 focus:ring-ink focus:border-ink"
          />
        </div>

        {isStaff && (
          <div>
            <label className="block text-xs text-muted mb-1">
              Staff Code <span className="text-danger">*</span>
            </label>
            <input
              type="password"
              required
              autoComplete="off"
              value={regStaffCode}
              onChange={(e) => setRegStaffCode(e.target.value)}
              placeholder="From the library administrator"
              className="w-full px-3 py-2 text-xs rounded border border-field bg-white text-ink focus:outline-none focus:ring-1 focus:ring-ink focus:border-ink"
            />
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-1.5 rounded bg-accent hover:bg-accent-hover text-white text-sm font-medium transition-colors disabled:opacity-50 mt-2 flex items-center justify-center gap-1.5"
        >
          <span>{loading ? 'Creating account...' : 'Create Account'}</span>
        </button>
      </form>
    </div>
  );
}
