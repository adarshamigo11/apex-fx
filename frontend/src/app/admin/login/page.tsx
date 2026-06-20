'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { appApi } from '@/lib/appApi';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await appApi.login(email, password);
      // Check if user is admin
      const userRole = res.user?.role;
      if (userRole === 'USER') {
        setError('Access denied. Admin credentials required.');
        setLoading(false);
        return;
      }
      appApi.setTokens(res.accessToken, res.refreshToken);
      router.push('/admin');
    } catch (e: any) {
      setError(e.message || 'Login failed');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background gradient orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#39ff8b]/5 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#ffd166]/5 rounded-full blur-3xl" />

      <div className="w-full max-w-md relative z-10">
        {/* Logo & Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-[#39ff8b] to-[#ffd166] mb-4">
            <span className="text-3xl font-bold text-[#0a0e1a]">A</span>
          </div>
          <h1 className="text-2xl font-bold">ApexFX Admin</h1>
          <p className="text-muted text-sm mt-1">Back Office Control Panel</p>
        </div>

        {/* Login Card */}
        <form onSubmit={submit} className="glass rounded-2xl p-8 space-y-5">
          <div className="text-center mb-2">
            <h2 className="text-lg font-semibold">Admin Sign In</h2>
            <p className="text-xs text-muted mt-1">Enter your admin credentials to continue</p>
          </div>

          {/* Email */}
          <div>
            <label className="text-xs text-muted uppercase tracking-wide block mb-1.5">Email Address</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@apexfx.com"
                required
                className="w-full pl-11 pr-4 py-3 rounded-xl bg-[var(--bg)] border border-[var(--border)] focus:outline-none focus:border-[#39ff8b] transition-colors text-sm"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="text-xs text-muted uppercase tracking-wide block mb-1.5">Password</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                className="w-full pl-11 pr-4 py-3 rounded-xl bg-[var(--bg)] border border-[var(--border)] focus:outline-none focus:border-[#39ff8b] transition-colors text-sm"
              />
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-[#ff5d6c]/10 text-[#ff5d6c] text-sm">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-[#39ff8b] to-[#ffd166] text-[#0a0e1a] font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="animate-spin w-4 h-4 border-2 border-[#0a0e1a] border-t-transparent rounded-full" />
                Signing in...
              </span>
            ) : 'Sign In to Admin Panel'}
          </button>

          {/* Back link */}
          <div className="text-center pt-2">
            <a href="/login" className="text-xs text-muted hover:text-[var(--text)] transition-colors">
              Not an admin? Go to regular login
            </a>
          </div>
        </form>

        {/* Footer */}
        <p className="text-center text-xs text-muted mt-6">
          ApexFX Back Office — Restricted Access
        </p>
      </div>
    </div>
  );
}
