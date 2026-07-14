'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { appApi } from '../../lib/appApi';

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><span className="animate-spin w-8 h-8 border-2 border-[#39ff8b] border-t-transparent rounded-full" /></div>}>
      <ForgotPasswordContent />
    </Suspense>
  );
}

function ForgotPasswordContent() {
  const searchParams = useSearchParams();
  const tokenFromUrl = searchParams.get('token') || '';

  const [step, setStep] = useState<'request' | 'reset' | 'done'>(tokenFromUrl ? 'reset' : 'request');
  const [identifier, setIdentifier] = useState('');
  const [token, setToken] = useState(tokenFromUrl);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const requestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await appApi.forgotPassword(identifier);
      setMessage(res.message || 'Reset instructions sent. Check your email.');
      setStep('done');
    } catch (e: any) {
      setError(e.message || 'Request failed');
    }
    setLoading(false);
  };

  const resetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (newPassword !== confirmPassword) { setError('Passwords do not match'); return; }
    setLoading(true);
    try {
      await appApi.resetPassword(token, newPassword);
      setMessage('Password reset successfully! You can now log in.');
      setStep('done');
    } catch (e: any) {
      setError(e.message || 'Reset failed');
    }
    setLoading(false);
  };

  const inputCls = 'w-full pl-11 pr-4 py-3 rounded-xl bg-[var(--bg)] border border-[var(--border)] focus:outline-none focus:border-[#39ff8b] transition-colors text-sm';
  const labelCls = 'text-xs text-muted uppercase tracking-wide block mb-1.5';

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#39ff8b]/5 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#ffd166]/5 rounded-full blur-3xl" />

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-[#39ff8b] to-[#ffd166] mb-4">
            <span className="text-3xl font-bold text-[#0a0e1a]">A</span>
          </div>
          <h1 className="text-2xl font-bold"><span className="text-[#ffd166]">Apex</span><span className="text-[#39ff8b]">FX</span></h1>
        </div>

        {/* Request Reset Form */}
        {step === 'request' && (
          <form onSubmit={requestReset} className="glass rounded-2xl p-8 space-y-5">
            <div className="text-center mb-2">
              <h2 className="text-lg font-semibold">Forgot Password</h2>
              <p className="text-xs text-muted mt-1">Enter your email or phone to receive a reset link</p>
            </div>

            <div>
              <label className={labelCls}>Email or Mobile Number</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </span>
                <input type="text" value={identifier} onChange={e => setIdentifier(e.target.value)}
                  placeholder="Email address or phone number" required className={inputCls} />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-[#ff5d6c]/10 text-[#ff5d6c] text-sm">
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {error}
              </div>
            )}

            <button type="submit" disabled={loading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-[#39ff8b] to-[#ffd166] text-[#0a0e1a] font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity">
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin w-4 h-4 border-2 border-[#0a0e1a] border-t-transparent rounded-full" />
                  Sending...
                </span>
              ) : 'Send Reset Link'}
            </button>

            <div className="text-center pt-2">
              <a href="/login" className="text-xs text-muted hover:text-[#39ff8b] transition-colors">
                ← Back to Sign In
              </a>
            </div>
          </form>
        )}

        {/* Reset Password Form */}
        {step === 'reset' && (
          <form onSubmit={resetPassword} className="glass rounded-2xl p-8 space-y-5">
            <div className="text-center mb-2">
              <h2 className="text-lg font-semibold">Reset Password</h2>
              <p className="text-xs text-muted mt-1">Enter your new password</p>
            </div>

            <div>
              <label className={labelCls}>New Password</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </span>
                <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
                  placeholder="Minimum 8 characters" required minLength={8} className={inputCls} />
              </div>
            </div>

            <div>
              <label className={labelCls}>Confirm New Password</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </span>
                <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password" required minLength={8} className={inputCls} />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-[#ff5d6c]/10 text-[#ff5d6c] text-sm">
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {error}
              </div>
            )}

            <button type="submit" disabled={loading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-[#39ff8b] to-[#ffd166] text-[#0a0e1a] font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity">
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin w-4 h-4 border-2 border-[#0a0e1a] border-t-transparent rounded-full" />
                  Resetting...
                </span>
              ) : 'Reset Password'}
            </button>
          </form>
        )}

        {/* Done State */}
        {step === 'done' && (
          <div className="glass rounded-2xl p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-[#39ff8b]/10 grid place-items-center mx-auto">
              <svg className="w-8 h-8 text-[#39ff8b]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold">Success</h2>
            <p className="text-sm text-muted">{message}</p>
            <a href="/login"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-[#39ff8b] to-[#ffd166] text-[#0a0e1a] font-semibold text-sm hover:opacity-90 transition-opacity">
              Go to Sign In
            </a>
          </div>
        )}

        <p className="text-center text-xs text-muted mt-6">ApexFX Trading Platform</p>
      </div>
    </div>
  );
}
