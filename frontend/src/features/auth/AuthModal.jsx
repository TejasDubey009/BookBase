import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { api } from '../../api/bookbase';
import TabButton from '../../components/ui/TabButton';
import SignInPanel from './SignInPanel';
import SignUpPanel from './SignUpPanel';

export default function AuthModal({ isOpen, onClose, demoUsers, onLoginSuccess, showToast, role: roleTab = 'member' }) {
  const [authMode, setAuthMode] = useState('signin'); // 'signin' or 'signup'
  
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
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regStaffCode, setRegStaffCode] = useState('');

  const isStaff = roleTab === 'admin';

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
      showToast({ type: 'error', message: 'Please fill in every field.' });
      return;
    }
    if (regPassword !== regConfirmPassword) {
      showToast({ type: 'error', message: 'The two passwords do not match.' });
      return;
    }
    setLoading(true);
    try {
      const resp = await api.register({
        full_name: regFullName.trim(),
        enrollment_no: regEnrollmentNo.trim().toUpperCase(),
        email: regEmail.trim().toLowerCase(),
        password: regPassword,
        ...(isStaff ? { staff_code: regStaffCode } : {}),
      });
      onLoginSuccess(resp);
      setRegPassword('');
      setRegConfirmPassword('');
      setRegStaffCode('');
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div 
        className="bg-white w-full max-w-md rounded-lg border border-line shadow-soft overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-6 pb-4 border-b border-line flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div>
              <h2 className="text-base font-medium text-ink">
                {authMode === 'signup'
                  ? (isStaff ? 'Create a Staff Account' : 'Create a Student Account')
                  : (isStaff ? 'Library Staff Sign In' : 'Sign In')}
              </h2>
              <p className="text-xs text-muted">
                {authMode === 'signup'
                  ? 'One account works on the Library Kiosk and the Student Portal'
                  : 'Use your Enrollment Number and password'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-line text-muted hover:text-ink transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 pt-4">
          <div className="flex items-center gap-6 border-b border-line">
            <TabButton active={authMode === 'signin'} onClick={() => setAuthMode('signin')}>Sign In</TabButton>
            <TabButton active={authMode === 'signup'} onClick={() => setAuthMode('signup')}>Sign Up</TabButton>
          </div>
        </div>

        {authMode === 'signin' ? (
          <SignInPanel
            roleTab={roleTab}
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
            isStaff={isStaff}
            handleRegister={handleRegister}
            regFullName={regFullName}
            setRegFullName={setRegFullName}
            regEnrollmentNo={regEnrollmentNo}
            setRegEnrollmentNo={setRegEnrollmentNo}
            regEmail={regEmail}
            setRegEmail={setRegEmail}
            regPassword={regPassword}
            setRegPassword={setRegPassword}
            regConfirmPassword={regConfirmPassword}
            setRegConfirmPassword={setRegConfirmPassword}
            regStaffCode={regStaffCode}
            setRegStaffCode={setRegStaffCode}
            showPassword={showPassword}
            setShowPassword={setShowPassword}
            loading={loading}
          />
        )}
      </div>
    </div>
  );
}
