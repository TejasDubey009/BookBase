import { ArrowRight, Eye, EyeOff, IdCard, Lock, ShieldCheck, UserCheck } from 'lucide-react';

export default function SignInPanel({
  roleTab,
  handleRoleTabChange,
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
      {/* Role Tabs */}
      <div>
        <div className="flex bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 p-0.5 rounded-xl text-xs font-medium">
          <button
            type="button"
            onClick={() => handleRoleTabChange('member')}
            className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
              roleTab === 'member'
                ? 'bg-indigo-600 text-white font-bold shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Student Patron</span>
          </button>
          <button
            type="button"
            onClick={() => handleRoleTabChange('admin')}
            className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
              roleTab === 'admin'
                ? 'bg-indigo-600 text-white font-bold shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Library Staff</span>
          </button>
        </div>
      </div>

      {/* Quick Demo Account Selector */}
      <div>
        <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">
          Quick Select {roleTab === 'admin' ? 'Staff' : 'Student'} Demo Account:
        </label>
        <div className="grid grid-cols-2 gap-2">
          {filteredUsers.map((u) => {
            const isSelected =
              identifier.toLowerCase() === (u.enrollment_no || '').toLowerCase() ||
              identifier.toLowerCase() === u.email.toLowerCase();
            return (
              <button
                key={u.user_id}
                type="button"
                onClick={() => handleQuickSelect(u)}
                className={`p-2 rounded-xl border text-left transition-all flex items-center gap-2 ${
                  isSelected
                    ? 'border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-950 dark:text-indigo-200 ring-1 ring-indigo-500/20'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-slate-50/50 dark:bg-slate-800/40 text-slate-800 dark:text-slate-200'
                }`}
              >
                <div className="w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-bold text-xs flex items-center justify-center font-mono shrink-0">
                  {u.full_name.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold leading-tight truncate">{u.full_name}</div>
                  <div className="text-[10px] text-indigo-600 dark:text-indigo-400 font-mono font-semibold truncate">
                    {u.enrollment_no || 'CSBS'}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="relative flex py-1 items-center">
        <div className="grow border-t border-slate-200 dark:border-slate-700"></div>
        <span className="shrink mx-3 text-[10px] uppercase font-bold text-slate-400">Sign In Credentials</span>
        <div className="grow border-t border-slate-200 dark:border-slate-700"></div>
      </div>

      {/* Manual Sign In Form */}
      <form onSubmit={handleManualLogin} className="space-y-3">
        <div>
          <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1">
            Enrollment Number or Email
          </label>
          <div className="relative">
            <IdCard className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              required
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder={roleTab === 'admin' ? 'ADMIN001 or admin@bookbase.in' : 'CSBS2022001 or tejas@bookbase.in'}
              className="w-full pl-9 pr-3 py-2 text-xs font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1">
            Password
          </label>
          <div className="relative">
            <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type={showPassword ? 'text' : 'password'}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              className="w-full pl-9 pr-9 py-2 text-xs font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-[10px] text-slate-400 mt-1">
            Demo Password: <code className="font-mono text-slate-600 dark:text-slate-300">{roleTab === 'admin' ? 'admin123' : 'member123'}</code>
          </p>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition-all disabled:opacity-50 mt-2 flex items-center justify-center gap-1.5"
        >
          <span>{loading ? 'Authenticating...' : `Sign In as ${roleTab === 'admin' ? 'Admin' : 'Student'}`}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
}
