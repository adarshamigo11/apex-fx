'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { appApi } from '../../../lib/appApi';

const COUNTRIES = [
  'India', 'United States', 'United Kingdom', 'Australia', 'Canada',
  'Germany', 'France', 'Japan', 'Singapore', 'UAE', 'South Africa',
  'Brazil', 'Mexico', 'Indonesia', 'Malaysia', 'Thailand', 'Other',
];

interface AccountType {
  _id: string; name: string; displayName: string; description?: string;
  defaultLeverage: number; maxLeverage: number; minDeposit: number;
  commission: number; spreadMarkup: number; spreadInfo?: string; swapInfo?: string;
  recommendedFor?: string; currency: string[]; features: string[];
}

export default function LiveRegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [types, setTypes] = useState<AccountType[]>([]);
  const [selectedType, setSelectedType] = useState<AccountType | null>(null);
  const [loading, setLoading] = useState(false);
  const [typesLoading, setTypesLoading] = useState(true);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    fullName: '', phone: '', email: '', country: '', dateOfBirth: '', address: '',
    password: '', confirmPassword: '', referralCode: '', acceptTerms: false,
  });
  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));

  useEffect(() => {
    appApi.liveAccountTypes().then((t: AccountType[]) => {
      setTypes(t);
      setTypesLoading(false);
    }).catch(() => setTypesLoading(false));
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!selectedType) return;
    if (form.password !== form.confirmPassword) { setError('Passwords do not match'); return; }
    if (!form.acceptTerms) { setError('Please accept the Terms & Conditions'); return; }

    setLoading(true);
    try {
      const res = await appApi.registerLive({
        email: form.email, password: form.password,
        fullName: form.fullName, phone: form.phone,
        country: form.country, dateOfBirth: form.dateOfBirth, address: form.address,
        accountTypeId: selectedType._id,
        referredByCode: form.referralCode || undefined,
      });
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

      <div className="w-full max-w-3xl relative z-10">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-[#39ff8b] to-[#ffd166] mb-3">
            <span className="text-2xl font-bold text-[#0a0e1a]">A</span>
          </div>
          <h1 className="text-xl font-bold"><span className="text-[#ffd166]">Apex</span><span className="text-[#39ff8b]">FX</span></h1>
          <div className="inline-flex items-center gap-1.5 mt-2 px-3 py-1 rounded-full bg-[#39ff8b]/15 text-[#39ff8b] text-[10px] font-bold uppercase tracking-wider">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <rect x="4" y="7" width="16" height="14" rx="2.5" strokeWidth={2} />
              <path d="M4 11h16M12 15h.01" strokeLinecap="round" strokeWidth={2} />
            </svg>
            Live Account
          </div>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-3 mb-6">
          <div className={`flex items-center gap-2 text-xs ${step === 1 ? 'text-[#39ff8b]' : 'text-muted'}`}>
            <span className={`w-6 h-6 rounded-full grid place-items-center text-[10px] font-bold ${step === 1 ? 'bg-[#39ff8b] text-[#0a0e1a]' : 'bg-white/10'}`}>1</span>
            Select Account Type
          </div>
          <div className="w-8 h-px bg-white/10" />
          <div className={`flex items-center gap-2 text-xs ${step === 2 ? 'text-[#39ff8b]' : 'text-muted'}`}>
            <span className={`w-6 h-6 rounded-full grid place-items-center text-[10px] font-bold ${step === 2 ? 'bg-[#39ff8b] text-[#0a0e1a]' : 'bg-white/10'}`}>2</span>
            Registration
          </div>
        </div>

        {/* STEP 1: Account Type Selection */}
        {step === 1 && (
          <div className="glass rounded-2xl p-6">
            <h2 className="text-base font-semibold text-center mb-1">Choose Your Live Account</h2>
            <p className="text-xs text-muted text-center mb-5">Select the account type that best fits your trading style</p>

            {typesLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="rounded-xl border border-[var(--border)] p-5 animate-pulse">
                    <div className="h-5 bg-white/5 rounded w-1/3 mb-3" />
                    <div className="h-3 bg-white/5 rounded w-2/3 mb-2" />
                    <div className="h-3 bg-white/5 rounded w-1/2" />
                  </div>
                ))}
              </div>
            ) : types.length === 0 ? (
              <p className="text-sm text-muted text-center py-8">No live account types available. Please contact support.</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {types.map(t => (
                  <button key={t._id} onClick={() => setSelectedType(t)}
                    className={`text-left p-5 rounded-xl border transition-all ${
                      selectedType?._id === t._id ? 'border-[#39ff8b] bg-[#39ff8b]/5' : 'border-[var(--border)] hover:border-white/20 hover:bg-white/[.02]'
                    }`}>
                    <h3 className="font-semibold text-sm">{t.displayName}</h3>
                    {t.description && <p className="text-[11px] text-muted mt-1">{t.description}</p>}
                    <div className="mt-3 space-y-1.5 text-[11px]">
                      <div className="flex justify-between"><span className="text-muted">Min Deposit</span><span className="font-mono">${t.minDeposit}</span></div>
                      <div className="flex justify-between"><span className="text-muted">Spread</span><span className="font-mono">{t.spreadInfo || `+${t.spreadMarkup} pts`}</span></div>
                      <div className="flex justify-between"><span className="text-muted">Commission</span><span className="font-mono">{t.commission > 0 ? `$${t.commission}/lot` : 'None'}</span></div>
                      <div className="flex justify-between"><span className="text-muted">Leverage</span><span className="font-mono">Up to 1:{t.maxLeverage}</span></div>
                      {t.swapInfo && <div className="flex justify-between"><span className="text-muted">Swap</span><span className="font-mono">{t.swapInfo}</span></div>}
                      {t.recommendedFor && <div className="flex justify-between"><span className="text-muted">Best For</span><span className="text-[10px]">{t.recommendedFor}</span></div>}
                    </div>
                    {t.features.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-3">
                        {t.features.slice(0, 4).map(f => (
                          <span key={f} className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-muted">{f.replace(/_/g, ' ')}</span>
                        ))}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}

            <div className="flex justify-end mt-5">
              <button disabled={!selectedType} onClick={() => setStep(2)}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#39ff8b] to-[#ffd166] text-[#0a0e1a] font-semibold text-sm hover:opacity-90 disabled:opacity-40 transition-opacity">
                Continue →
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Registration Form */}
        {step === 2 && selectedType && (
          <form onSubmit={submit} className="glass rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between mb-1">
              <button type="button" onClick={() => setStep(1)} className="text-xs text-muted hover:text-[#39ff8b] flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back
              </button>
              <span className="text-[10px] px-2 py-0.5 rounded bg-[#39ff8b]/15 text-[#39ff8b] font-bold">{selectedType.displayName}</span>
            </div>
            <h2 className="text-base font-semibold text-center">Complete Your Registration</h2>

            <div className="grid sm:grid-cols-2 gap-4">
              {/* Full Name */}
              <div className="sm:col-span-2">
                <label className={labelCls}>Full Name <span className="text-[#ff5d6c]">*</span></label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </span>
                  <input type="text" value={form.fullName} onChange={e => set('fullName', e.target.value)} placeholder="Enter your full name" required className={inputCls} />
                </div>
              </div>

              {/* Phone */}
              <div>
                <label className={labelCls}>Mobile Number <span className="text-[#ff5d6c]">*</span></label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                  </span>
                  <input type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+1 234 567 8900" required className={inputCls} />
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
                  <input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="you@email.com" required className={inputCls} />
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
                  <select value={form.country} onChange={e => set('country', e.target.value)} required className={`${inputCls} cursor-pointer`}>
                    <option value="">Select country</option>
                    {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              {/* Date of Birth */}
              <div>
                <label className={labelCls}>Date of Birth <span className="text-[#ff5d6c]">*</span></label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </span>
                  <input type="date" value={form.dateOfBirth} onChange={e => set('dateOfBirth', e.target.value)} required className={inputCls} />
                </div>
              </div>

              {/* Address */}
              <div className="sm:col-span-2">
                <label className={labelCls}>Address</label>
                <div className="relative">
                  <span className="absolute left-3 top-3 text-muted">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </span>
                  <textarea value={form.address} onChange={e => set('address', e.target.value)} placeholder="Your full address" rows={2}
                    className="w-full pl-11 pr-4 py-3 rounded-xl bg-[var(--bg)] border border-[var(--border)] focus:outline-none focus:border-[#39ff8b] transition-colors text-sm resize-none" />
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
                  <input type="password" value={form.password} onChange={e => set('password', e.target.value)} placeholder="Min 8 characters" required minLength={8} className={inputCls} />
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
                  <input type="password" value={form.confirmPassword} onChange={e => set('confirmPassword', e.target.value)} placeholder="Re-enter password" required minLength={8} className={inputCls} />
                </div>
              </div>

              {/* Referral Code */}
              <div className="sm:col-span-2">
                <label className={labelCls}>Referral Code <span className="text-muted">(optional)</span></label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                    </svg>
                  </span>
                  <input type="text" value={form.referralCode} onChange={e => set('referralCode', e.target.value)} placeholder="Enter referral code if any" className={inputCls} />
                </div>
              </div>
            </div>

            {/* Terms */}
            <label className="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" checked={form.acceptTerms} onChange={e => set('acceptTerms', e.target.checked)} className="mt-0.5 accent-[#39ff8b]" />
              <span className="text-xs text-muted leading-relaxed">
                I accept the <span className="text-[#39ff8b] cursor-pointer hover:underline">Terms & Conditions</span> and{' '}
                <span className="text-[#39ff8b] cursor-pointer hover:underline">Privacy Policy</span>. I confirm I am at least 18 years old.
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
                  Creating Live Account...
                </span>
              ) : `Open ${selectedType.displayName}`}
            </button>

            <div className="text-center">
              <a href="/login" className="text-xs text-muted hover:text-[#39ff8b] transition-colors">Already have an account? Sign in</a>
            </div>
          </form>
        )}

        <p className="text-center text-xs text-muted mt-4">ApexFX Trading Platform</p>
      </div>
    </div>
  );
}
