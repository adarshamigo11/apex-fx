'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { appApi } from '../../../lib/appApi';

const COUNTRIES = [
  'India', 'United States', 'United Kingdom', 'Australia', 'Canada',
  'Germany', 'France', 'Japan', 'Singapore', 'UAE', 'South Africa',
  'Brazil', 'Mexico', 'Indonesia', 'Malaysia', 'Thailand', 'Other',
];

export default function DemoRegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    fullName: '', phone: '', email: '', country: '', password: '', confirmPassword: '', acceptTerms: false,
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (!form.acceptTerms) {
      setError('Please accept the Terms & Conditions');
      return;
    }

    setLoading(true);
    try {
      const res = await appApi.registerDemo({
        email: form.email,
        password: form.password,
        fullName: form.fullName,
        phone: form.phone,
        country: form.country,
      });
      // Auto-login: store tokens and redirect
      appApi.setTokens(res.accessToken, res.refreshToken);
      router.push('/dashboard');
    } catch (e: any) {
      setError(e.message || 'Registration failed');
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
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-[#39ff8b] to-[#ffd166] mb-3">
            <span className="text-2xl font-bold text-[#0a0e1a]">A</span>
          </div>
          <h1 className="text-xl font-bold"><span className="text-[#ffd166]">Apex</span><span className="text-[#39ff8b]">FX</span></h1>
          <div className="inline-flex items-center gap-1.5 mt-2 px-3 py-1 rounded-full bg-[#66b2ff]/15 text-[#66b2ff] text-[10px] font-bold uppercase tracking-wider">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15a3 3 0 100-6 3 3 0 000 6z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2 12a10 10 0 1120 0 10 10 0 01-20 0" />
            </svg>
            Demo Account
          </div>
          <p className="text-muted text-xs mt-2">Practice with virtual funds — no risk, real market data</p>
        </div>

        {/* Form */}
        <form onSubmit={submit} className="glass rounded-2xl p-6 space-y-4">
          <h2 className="text-base font-semibold text-center">Create Your Demo Account</h2>

          {/* Full Name */}
          <div>
            <label className={labelCls}>Full Name <span className="text-[#ff5d6c]">*</span></label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </span>
              <input type="text" value={form.fullName} onChange={e => set('fullName', e.target.value)}
                placeholder="Enter your full name" required className={inputCls} />
            </div>
          </div>

          {/* Phone */}
          <div>
            <label className={labelCls}>Mobile Number</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              </span>
              <input type="tel" value={form.phone} onChange={e => set('phone', e.target.value)}
                placeholder="+1 234 567 8900" className={inputCls} />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className={labelCls}>Email Address <span className="text-[#ff5d6c]">*</span></label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </span>
              <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
                placeholder="you@email.com" required className={inputCls} />
            </div>
          </div>

          {/* Country */}
          <div>
            <label className={labelCls}>Country <span className="text-[#ff5d6c]">*</span></label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </span>
              <select value={form.country} onChange={e => set('country', e.target.value)}
                required className={`${inputCls} cursor-pointer`}>
                <option value="">Select country</option>
                {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {/* Password */}
          <div>
            <label className={labelCls}>Password <span className="text-[#ff5d6c]">*</span></label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </span>
              <input type="password" value={form.password} onChange={e => set('password', e.target.value)}
                placeholder="Minimum 8 characters" required minLength={8} className={inputCls} />
            </div>
          </div>

          {/* Confirm Password */}
          <div>
            <label className={labelCls}>Confirm Password <span className="text-[#ff5d6c]">*</span></label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </span>
              <input type="password" value={form.confirmPassword} onChange={e => set('confirmPassword', e.target.value)}
                placeholder="Re-enter your password" required minLength={8} className={inputCls} />
            </div>
          </div>

          {/* Terms */}
          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" checked={form.acceptTerms} onChange={e => set('acceptTerms', e.target.checked)}
              className="mt-0.5 accent-[#39ff8b]" />
            <span className="text-xs text-muted leading-relaxed">
              I accept the <span className="text-[#39ff8b] cursor-pointer hover:underline">Terms & Conditions</span> and{' '}
              <span className="text-[#39ff8b] cursor-pointer hover:underline">Privacy Policy</span>
            </span>
          </label>

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
          <button type="submit" disabled={loading}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-[#39ff8b] to-[#ffd166] text-[#0a0e1a] font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity">
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="animate-spin w-4 h-4 border-2 border-[#0a0e1a] border-t-transparent rounded-full" />
                Creating Demo Account...
              </span>
            ) : 'Start Demo Trading'}
          </button>

          <div className="text-center pt-1">
            <a href="/login" className="text-xs text-muted hover:text-[#39ff8b] transition-colors">
              Already have an account? Sign in
            </a>
          </div>
        </form>

        <p className="text-center text-xs text-muted mt-4">ApexFX Trading Platform</p>
      </div>
    </div>
  );
}
