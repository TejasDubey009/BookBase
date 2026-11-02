import React, { useState } from 'react';
import { 
  X, 
  Lock, 
  Mail, 
  ShieldCheck, 
  UserCheck, 
  ArrowRight, 
  Library, 
  Check, 
  Eye, 
  EyeOff,
  Sparkles
} from 'lucide-react';
import { api } from '../api';

export default function AuthModal({ isOpen, onClose, demoUsers, onLoginSuccess, showToast }) {
  const [roleTab, setRoleTab] = useState('member'); // 'member' or 'admin'
  const [email, setEmail] = useState('tejas@bookbase.in');
  const [password, setPassword] = useState('member123');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleRoleTabChange = (role) => {
    setRoleTab(role);
    if (role === 'admin') {
      setEmail('admin@bookbase.in');
      setPassword('admin123');
    } else {
      setEmail('tejas@bookbase.in');
      setPassword('member123');
    }
  };

  const handleQuickSelect = (u) => {
    setEmail(u.email);
    setPassword(u.sample_password || (u.role === 'admin' ? 'admin123' : 'member123'));
  };

  const handleManualLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const resp = await api.login(email.trim(), password, roleTab);
      localStorage.setItem('bb_token', resp.token);
      onLoginSuccess(resp.user);
      showToast({ type: 'success', message: `Welcome back, ${resp.user.full_name}!` });
      onClose();
    } catch (err) {
      showToast({ type: 'error', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = demoUsers.filter(u => u.role === roleTab);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white w-full max-w-md rounded-3xl border border-slate-200/90 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-6 pb-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-900 text-white flex items-center justify-center shadow-xs">
              <Library className="w-5 h-5 text-indigo-100" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight">
                Library Portal Login
              </h2>
              <p className="text-xs text-slate-500">
                Sign in to access your borrowings and reservations
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Role Tabs */}
        <div className="p-6 pb-2">
          <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            <button
              type="button"
              onClick={() => handleRoleTabChange('member')}
              className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                roleTab === 'member'
                  ? 'bg-white text-indigo-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Student Patron</span>
            </button>
            <button
              type="button"
              onClick={() => handleRoleTabChange('admin')}
              className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                roleTab === 'admin'
                  ? 'bg-white text-indigo-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Library Staff</span>
            </button>
          </div>
        </div>

        {/* Content & Account Selector */}
        <div className="p-6 pt-3 space-y-4">
          
          {/* Quick Account Picker */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-2">
              Select {roleTab === 'admin' ? 'Admin' : 'Patron'} Account:
            </label>
            <div className="grid grid-cols-2 gap-2">
              {filteredUsers.map((u) => {
                const isSelected = email.toLowerCase() === u.email.toLowerCase();
                return (
                  <button
                    key={u.user_id}
                    type="button"
                    onClick={() => handleQuickSelect(u)}
                    className={`p-2.5 rounded-xl border text-left transition-all flex items-center gap-2.5 ${
                      isSelected
                        ? 'border-indigo-500 bg-indigo-50/70 text-indigo-950 ring-1 ring-indigo-500/20'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-800'
                    }`}
                  >
                    <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center font-mono flex-shrink-0">
                      {u.full_name.charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold leading-tight truncate">{u.full_name}</div>
                      <div className="text-[10px] text-slate-500 font-mono truncate">{u.email}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-slate-200"></div>
            <span className="flex-shrink mx-3 text-[10px] uppercase font-bold text-slate-400">Account Credentials</span>
            <div className="flex-grow border-t border-slate-200"></div>
          </div>

          {/* Form */}
          <form onSubmit={handleManualLogin} className="space-y-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={roleTab === 'admin' ? 'admin@bookbase.in' : 'tejas@bookbase.in'}
                  className="w-full pl-9 pr-3 py-2 text-xs font-mono rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
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
                  className="w-full pl-9 pr-9 py-2 text-xs font-mono rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                Demo Password: <code className="font-mono text-slate-600">{roleTab === 'admin' ? 'admin123' : 'member123'}</code>
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs transition-all active:scale-[0.99] disabled:opacity-50 mt-2 flex items-center justify-center gap-1.5"
            >
              <span>{loading ? 'Authenticating...' : `Sign In as ${roleTab === 'admin' ? 'Admin' : 'Patron'}`}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>

        </div>
      </div>
    </div>
  );
}
