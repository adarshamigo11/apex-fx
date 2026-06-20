'use client';

import { useState } from 'react';

const MOCK_REFERRALS = [
  { id: '1', name: 'John D.', date: '2025-01-08', status: 'Active', commission: 45.00 },
  { id: '2', name: 'Sarah M.', date: '2025-01-05', status: 'Active', commission: 32.50 },
  { id: '3', name: 'Mike R.', date: '2024-12-28', status: 'Pending', commission: 0 },
  { id: '4', name: 'Lisa K.', date: '2024-12-20', status: 'Active', commission: 78.25 },
  { id: '5', name: 'David W.', date: '2024-12-15', status: 'Inactive', commission: 12.00 },
];

const STATS = [
  { label: 'Total Referrals', value: '12', icon: '👥' },
  { label: 'Active Traders', value: '8', icon: '📈' },
  { label: 'Total Earnings', value: '$167.75', icon: '💰' },
  { label: 'This Month', value: '$77.50', icon: '📅' },
];

export default function ReferralPage() {
  const [copied, setCopied] = useState(false);
  const referralLink = 'https://apexfx.com/ref/USR12345';
  const referralCode = 'APEX-12345';

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <main className="min-h-screen p-4 sm:p-6 max-w-4xl mx-auto">
      <header className="mb-6">
        <h1 className="text-xl font-bold">Referral Program</h1>
        <p className="text-xs text-muted">Earn commissions by inviting traders</p>
      </header>

      {/* Stats */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {STATS.map(s => (
          <div key={s.label} className="glass rounded-xl p-4 text-center">
            <p className="text-2xl mb-1">{s.icon}</p>
            <p className="text-lg font-bold">{s.value}</p>
            <p className="text-[10px] text-muted">{s.label}</p>
          </div>
        ))}
      </section>

      {/* Referral Link & Code */}
      <section className="glass rounded-xl p-5 mb-6">
        <h2 className="text-sm font-semibold mb-3">Your Referral Link</h2>
        <div className="flex gap-2 mb-3">
          <input readOnly value={referralLink} className="flex-1 glass rounded-lg px-3 py-2 text-xs outline-none" />
          <button onClick={() => handleCopy(referralLink)} className="bg-neon text-black px-4 py-2 rounded-lg text-xs font-semibold hover:opacity-90 transition">
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
        <div className="flex items-center gap-3">
          <p className="text-xs text-muted">Referral Code:</p>
          <button onClick={() => handleCopy(referralCode)} className="glass rounded-lg px-3 py-1.5 text-xs font-mono font-medium hover:bg-neon/10 transition">
            {referralCode}
          </button>
        </div>
      </section>

      {/* Commission Structure */}
      <section className="glass rounded-xl p-5 mb-6">
        <h2 className="text-sm font-semibold mb-3">Commission Structure</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="text-center p-3 rounded-lg bg-[var(--surface)]">
            <p className="text-lg font-bold text-gold">Tier 1</p>
            <p className="text-xs text-muted mt-1">Direct Referrals</p>
            <p className="text-sm font-semibold mt-1">$5 per lot</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-[var(--surface)]">
            <p className="text-lg font-bold text-neon">Tier 2</p>
            <p className="text-xs text-muted mt-1">Sub-referrals</p>
            <p className="text-sm font-semibold mt-1">$2 per lot</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-[var(--surface)]">
            <p className="text-lg font-bold text-purple-400">VIP Bonus</p>
            <p className="text-xs text-muted mt-1">10+ referrals</p>
            <p className="text-sm font-semibold mt-1">+20% bonus</p>
          </div>
        </div>
      </section>

      {/* Referral History */}
      <section className="glass rounded-xl overflow-hidden">
        <div className="p-4 border-b border-[var(--border)]">
          <h2 className="text-sm font-semibold">Referral History</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[var(--border)] text-muted">
                <th className="text-left p-3 font-medium">Name</th>
                <th className="text-left p-3 font-medium">Date</th>
                <th className="text-left p-3 font-medium">Status</th>
                <th className="text-right p-3 font-medium">Commission</th>
              </tr>
            </thead>
            <tbody>
              {MOCK_REFERRALS.map(r => (
                <tr key={r.id} className="border-b border-[var(--border)] last:border-0">
                  <td className="p-3 font-medium">{r.name}</td>
                  <td className="p-3 text-muted">{r.date}</td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] ${
                      r.status === 'Active' ? 'bg-neon/10 text-neon' :
                      r.status === 'Pending' ? 'bg-gold/10 text-gold' : 'bg-[var(--surface)] text-muted'
                    }`}>{r.status}</span>
                  </td>
                  <td className="p-3 text-right font-medium text-neon">${r.commission.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
