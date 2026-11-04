import React, { useState } from 'react';
import { 
  X, 
  Lock, 
  Mail, 
  ShieldCheck, 
  UserCheck, 
  ArrowRight, 
  Library, 
  Eye, 
  EyeOff,
  UserPlus,
  LogIn,
  IdCard,
  User,
  Sparkles
} from 'lucide-react';
import { api } from '../api';

export default function AuthModal({ isOpen, onClose, demoUsers, onLoginSuccess, showToast, initialRole = 'member' }) {
  const [authMode, setAuthMode] = useState('signin'); // 'signin' or 'signup'
  const [roleTab, setRoleTab] = useState(initialRole); // 'member' or 'admin'
  
  // Sign In fields
  const [identifier, setIdentifier] = useState('CSBS2022001'); // Enrollment Number or Email
  const [password, setPassword] = useState('member123');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Sign Up fields
  const [regFullName, setRegFullName] = useState('');
  const [regEnrollmentNo, setRegEnrollmentNo] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');

  if (!isOpen) return null;

  const handleRoleTabChange = (role) => {
    setRoleTab(role);
    if (role === 'admin') {
      setIdentifier('ADMIN001');
      setPassword('admin123');
    } else {
      setIdentifier('CSBS2022001');
      setPassword('member123');
    }
  };

  const handleQuickSelect = (u) => {
    setIdentifier(u.enrollment_no || u.email);
    setPassword(u.sample_password || (u.role === 'admin' ? 'admin123' : 'member123'));
  };

  const handleManualLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const resp = await api.login(identifier.trim(), password, roleTab);
      localStorage.setItem('bb_token', resp.token);
      localStorage.setItem('bb_user_id', resp.user.user_id);
      onLoginSuccess(resp.user);
      showToast({ type: 'success', message: `Welcome back, ${resp.user.full_name} (${resp.user.enrollment_no})!` });
      onClose();
    } catch (err) {
      showToast({ type: 'error', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!regFullName.trim() || !regEnrollmentNo.trim() || !regEmail.trim() || !regPassword) {
      showToast({ type: 'error', message: 'All fields are required for student registration.' });
      return;
    }
    setLoading(true);
    try {
      const resp = await api.register({
        full_name: regFullName.trim(),
        enrollment_no: regEnrollmentNo.trim().toUpperCase(),
        email: regEmail.trim().toLowerCase(),
        password: regPassword.trim(),
      });
      localStorage.setItem('bb_token', resp.token);
      localStorage.setItem('bb_user_id', resp.user.user_id);
      onLoginSuccess(resp.user);
      showToast({ 
        type: 'success', 
        message: `Account created! Welcome to BookBase, ${resp.user.full_name} (${resp.user.enrollment_no})!` 
      });
      onClose();
    } catch (err) {
      showToast({ type: 'error', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = demoUsers.filter(u => u.role === roleTab);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-6 pb-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/60 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-900 text-white flex items-center justify-center shadow-md shadow-indigo-900/20">
              <Library className="w-5 h-5 text-indigo-100" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                {authMode === 'signup' ? 'Student Sign Up & Registration' : 'Library Portal Sign In'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {authMode === 'signup' 
                  ? 'Get your enrollment credentials for on-premise & remote access' 
                  : 'Log in with your Enrollment Number and password'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Auth Mode Tabs: Sign In vs Sign Up */}
        <div className="px-6 pt-4">
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-semibold">
            <button
              type="button"
              onClick={() => setAuthMode('signin')}
              className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                authMode === 'signin'
                  ? 'bg-white dark:bg-slate-900 text-indigo-950 dark:text-indigo-200 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>
            <button
              type="button"
              onClick={() => setAuthMode('signup')}
              className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                authMode === 'signup'
                  ? 'bg-white dark:bg-slate-900 text-indigo-950 dark:text-indigo-200 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Sign Up (New Student)</span>
            </button>
          </div>
        </div>

        {authMode === 'signin' ? (
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
        ) : (
          /* Sign Up Form for Students */
          <div className="p-6 pt-3 space-y-4">
            <div className="p-3 bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 rounded-xl text-xs text-indigo-900 dark:text-indigo-300">
              <span className="font-bold">Student Library Pass:</span> Sign up with your university enrollment number to borrow textbooks at the kiosk and monitor deadlines remotely.
            </div>

            <form onSubmit={handleRegister} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    value={regFullName}
                    onChange={(e) => setRegFullName(e.target.value)}
                    placeholder="e.g. Riya Sharma"
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Enrollment Number <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <IdCard className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    value={regEnrollmentNo}
                    onChange={(e) => setRegEnrollmentNo(e.target.value)}
                    placeholder="e.g. CSBS2023019"
                    className="w-full pl-9 pr-3 py-2 text-xs font-mono uppercase rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1">
                  University / Student Email <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="email"
                    required
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="e.g. riya@bookbase.in"
                    className="w-full pl-9 pr-3 py-2 text-xs font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Choose Portal Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="Choose a password (min 6 chars)"
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
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all disabled:opacity-50 mt-2 flex items-center justify-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{loading ? 'Creating Account...' : 'Complete Sign Up & Enter Portal'}</span>
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
