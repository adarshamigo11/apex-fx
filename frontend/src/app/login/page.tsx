'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { appApi } from '../../lib/appApi';

export default function LoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('apexfx_remember_id');
      if (saved) { setIdentifier(saved); setRemember(true); }
    }
  }, []);

  const [noAccount, setNoAccount] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setNoAccount(false);
    setLoading(true);
    try {
      const res = await appApi.login(identifier, password);
      appApi.setTokens(res.accessToken, res.refreshToken);

      if (typeof window !== 'undefined') {
        if (remember) {
          localStorage.setItem('apexfx_remember_id', identifier);
        } else {
          localStorage.removeItem('apexfx_remember_id');
        }
      }

      router.push('/dashboard');
    } catch (e: any) {
      const msg = e.message || 'Login failed';
      setError(msg);
      // Detect if account doesn't exist (invalid credentials)
      if (msg.toLowerCase().includes('invalid credentials') || msg.toLowerCase().includes('not found')) {
        setNoAccount(true);
      }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#39ff8b]/5 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#ffd166]/5 rounded-full blur-3xl" />

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-[#39ff8b] to-[#ffd166] mb-4">
            <span className="text-3xl font-bold text-[#0a0e1a]">A</span>
          </div>
          <h1 className="text-2xl font-bold"><span className="text-[#ffd166]">Apex</span><span className="text-[#39ff8b]">FX</span></h1>
          <p className="text-muted text-sm mt-1">Trade smarter, profit faster</p>
        </div>

        <form onSubmit={submit} className="glass rounded-2xl p-8 space-y-5">
          <div className="text-center mb-2">
            <h2 className="text-lg font-semibold">Welcome Back</h2>
            <p className="text-xs text-muted mt-1">Enter your credentials to access your account</p>
          </div>

          <div>
            <label className="text-xs text-muted uppercase tracking-wide block mb-1.5">Email or Mobile Number</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </span>
              <input type="text" value={identifier} onChange={(e) => setIdentifier(e.target.value)}
                placeholder="Email address or phone number" required
                className="w-full pl-11 pr-4 py-3 rounded-xl bg-[var(--bg)] border border-[var(--border)] focus:outline-none focus:border-[#39ff8b] transition-colors text-sm" />
            </div>
          </div>

          <div>
            <label className="text-xs text-muted uppercase tracking-wide block mb-1.5">Password</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </span>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password" required
                className="w-full pl-11 pr-4 py-3 rounded-xl bg-[var(--bg)] border border-[var(--border)] focus:outline-none focus:border-[#39ff8b] transition-colors text-sm" />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} className="accent-[#39ff8b]" />
              <span className="text-xs text-muted">Remember me</span>
            </label>
            <a href="/forgot-password" className="text-xs text-[#39ff8b] hover:underline transition-colors">Forgot Password?</a>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-[#ff5d6c]/10 text-[#ff5d6c] text-sm">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
          )}

          {/* Show account creation prompt when no account exists */}
          {noAccount && (
            <div className="glass rounded-xl p-4 border border-[#ffd166]/30 bg-[#ffd166]/5">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-[#ffd166]/20 grid place-items-center flex-shrink-0">
                  <svg className="w-5 h-5 text-[#ffd166]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-[#ffd166]">No account found</p>
                  <p className="text-xs text-muted mt-0.5">Create an account to start trading</p>
                  <div className="flex gap-2 mt-3">
                    <a href="/register/demo" className="flex-1 text-center py-2 px-3 rounded-lg bg-[#66b2ff]/15 text-[#66b2ff] text-xs font-medium hover:bg-[#66b2ff]/25 transition-colors">
                      Try Free Demo
                    </a>
                    <a href="/register/live" className="flex-1 text-center py-2 px-3 rounded-lg bg-[#39ff8b]/15 text-[#39ff8b] text-xs font-medium hover:bg-[#39ff8b]/25 transition-colors">
                      Create Live Account
                    </a>
                  </div>
                </div>
              </div>
            </div>
          )}

          <button type="submit" disabled={loading}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-[#39ff8b] to-[#ffd166] text-[#0a0e1a] font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity">
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="animate-spin w-4 h-4 border-2 border-[#0a0e1a] border-t-transparent rounded-full" />
                Signing in...
              </span>
            ) : 'Sign In'}
          </button>

          {/* Registration links */}
          <div className="pt-3 border-t border-[var(--border)]">
            <p className="text-center text-xs text-muted mb-3">Don't have an account?</p>
            <div className="grid grid-cols-2 gap-2">
              <a href="/register/demo" className="text-center py-2.5 px-3 rounded-xl glass border border-[#66b2ff]/30 hover:bg-[#66b2ff]/10 transition-colors">
                <span className="text-xs font-medium text-[#66b2ff]">Try Free Demo</span>
                <p className="text-[10px] text-muted mt-0.5">$10,000 virtual balance</p>
              </a>
              <a href="/register/live" className="text-center py-2.5 px-3 rounded-xl glass border border-[#39ff8b]/30 hover:bg-[#39ff8b]/10 transition-colors">
                <span className="text-xs font-medium text-[#39ff8b]">Create Live Account</span>
                <p className="text-[10px] text-muted mt-0.5">Start real trading</p>
              </a>
            </div>
          </div>
        </form>

        <p className="text-center text-xs text-muted mt-6">ApexFX Trading Platform</p>
      </div>
    </div>
  );
}
