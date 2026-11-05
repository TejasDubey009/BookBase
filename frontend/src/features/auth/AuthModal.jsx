import { useEffect, useState } from 'react';
import { Library, LogIn, UserPlus, X } from 'lucide-react';
import { api } from '../../api/bookbase';
import SignInPanel from './SignInPanel';
import SignUpPanel from './SignUpPanel';

export default function AuthModal({ isOpen, onClose, demoUsers, onLoginSuccess, showToast, initialRole = 'member' }) {
  const [authMode, setAuthMode] = useState('signin'); // 'signin' or 'signup'
  const [roleTab, setRoleTab] = useState(initialRole); // 'member' or 'admin'
  
  // Sign In fields
  const [identifier, setIdentifier] = useState(''); // Enrollment Number or Email
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Sign Up fields
  const [regFullName, setRegFullName] = useState('');
  const [regEnrollmentNo, setRegEnrollmentNo] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');

  // With demo mode on, start from the first seeded account for the role. Otherwise start blank.
  const resetSignInFields = (role) => {
    const demoAccount = demoUsers.find((u) => u.role === role);
    setIdentifier(demoAccount?.enrollment_no ?? '');
    setPassword(demoAccount?.sample_password ?? '');
  };

  useEffect(() => {
    resetSignInFields(roleTab);
  }, [demoUsers]);

  if (!isOpen) return null;

  const handleRoleTabChange = (role) => {
    setRoleTab(role);
    resetSignInFields(role);
  };

  const handleQuickSelect = (u) => {
    setIdentifier(u.enrollment_no);
    setPassword(u.sample_password);
  };

  const handleManualLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const resp = await api.login(identifier.trim(), password, roleTab);
      onLoginSuccess(resp);
      // The modal stays mounted, and the next person at a shared kiosk must not inherit these
      resetSignInFields(roleTab);
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
      onLoginSuccess(resp);
      setRegPassword('');
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
          <SignInPanel
            roleTab={roleTab}
            handleRoleTabChange={handleRoleTabChange}
            filteredUsers={filteredUsers}
            handleQuickSelect={handleQuickSelect}
            handleManualLogin={handleManualLogin}
            identifier={identifier}
            setIdentifier={setIdentifier}
            password={password}
            setPassword={setPassword}
            showPassword={showPassword}
            setShowPassword={setShowPassword}
            loading={loading}
          />
        ) : (
          <SignUpPanel
            handleRegister={handleRegister}
            regFullName={regFullName}
            setRegFullName={setRegFullName}
            regEnrollmentNo={regEnrollmentNo}
            setRegEnrollmentNo={setRegEnrollmentNo}
            regEmail={regEmail}
            setRegEmail={setRegEmail}
            regPassword={regPassword}
            setRegPassword={setRegPassword}
            showPassword={showPassword}
            setShowPassword={setShowPassword}
            loading={loading}
          />
        )}
      </div>
    </div>
  );
}
