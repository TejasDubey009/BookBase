import { Eye, EyeOff } from 'lucide-react';

export default function SignInPanel({
  roleTab,
  filteredUsers,
  handleQuickSelect,
  handleManualLogin,
  identifier,
  setIdentifier,
  password,
  setPassword,
  showPassword,
  setShowPassword,
  loading
}) {
  return (
    <div className="p-6 pt-3 space-y-4">
      {/* Quick Demo Account Selector (only when the server has demo mode on) */}
      {filteredUsers.length > 0 && (
        <div>
          <label className="block text-xs text-muted mb-1">
            Quick Select {roleTab === 'admin' ? 'Staff' : 'Student'} Demo Account:
          </label>
          <div className="grid grid-cols-2 gap-2">
            {filteredUsers.map((u) => {
              const isSelected = identifier.toLowerCase() === u.enrollment_no.toLowerCase();
              return (
                <button
                  key={u.enrollment_no}
                  type="button"
                  onClick={() => handleQuickSelect(u)}
                  className={`p-2 rounded border text-left transition-colors flex items-center gap-2 ${
                    isSelected
                      ? 'border-ink text-ink'
                      : 'border-field text-body hover:bg-shelf'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-medium leading-tight truncate">{u.full_name}</div>
                    <div className="text-xs text-muted font-medium truncate">
                      {u.enrollment_no}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="relative flex py-1 items-center">
        <div className="grow border-t border-line"></div>
        <span className="shrink mx-3 text-xs font-medium text-muted">Sign In Credentials</span>
        <div className="grow border-t border-line"></div>
      </div>

      {/* Manual Sign In Form */}
      <form onSubmit={handleManualLogin} className="space-y-3">
        <div>
          <label className="block text-xs text-muted mb-1">
            Enrollment Number or Email
          </label>
          <div className="relative">
            <input
              type="text"
              required
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder={roleTab === 'admin' ? 'ADMIN001 or admin@bookbase.in' : 'CSBS2022001 or tejas@bookbase.in'}
              className="w-full px-3 py-2 text-xs rounded border border-field bg-white text-ink focus:outline-none focus:ring-1 focus:ring-ink focus:border-ink"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs text-muted mb-1">
            Password
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
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
          {filteredUsers.length > 0 && (
            <p className="text-xs text-muted mt-1">
              Demo Password: <code className="text-body">{filteredUsers[0].sample_password}</code>
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-1.5 rounded bg-accent hover:bg-accent-hover text-white text-sm font-medium transition-colors disabled:opacity-50 mt-2 flex items-center justify-center gap-1.5"
        >
          <span>{loading ? 'Authenticating...' : `Sign In as ${roleTab === 'admin' ? 'Admin' : 'Student'}`}</span>
        </button>
      </form>
    </div>
  );
}
