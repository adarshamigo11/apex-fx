'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTheme } from '../../lib/useTheme';
import { appApi } from '../../lib/appApi';

function fmt(n: number | null | undefined, d = 2) {
  return (n ?? 0).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
}

export default function ProfilePage() {
  const { theme, toggle } = useTheme();
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [wallet, setWallet] = useState<any>(null);
  const [kyc, setKyc] = useState<any>(null);
  const [switching, setSwitching] = useState<string | null>(null);

  useEffect(() => {
    appApi.loadTokens();
    appApi.profile().then(setProfile).catch(() => setProfile(null));
    appApi.wallet().then(setWallet).catch(() => setWallet(null));
    appApi.kyc().then(setKyc).catch(() => setKyc(null));
  }, []);

  const handleLogout = () => {
    appApi.setTokens(null, null);
    window.location.href = '/login';
  };

  const handleSwitch = async (accountId: string) => {
    setSwitching(accountId);
    try {
      await appApi.switchAccount(accountId);
      router.push('/dashboard');
    } catch (e: any) {
      alert(e.message || 'Failed to switch account');
    }
    setSwitching(null);
  };

  const accounts = profile?.accounts || [];
  const activeId = profile?.activeAccountId;

  return (
    <main className="min-h-screen p-3 sm:p-4 max-w-2xl mx-auto">
      <header className="flex items-center justify-between py-2 mb-4">
        <div>
          <h1 className="text-lg font-bold">Profile</h1>
          <p className="text-[10px] text-muted uppercase tracking-widest">Account center</p>
        </div>
        <button onClick={toggle} className="glass rounded-full w-8 h-8 grid place-items-center text-sm">
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
      </header>

      {/* User Card */}
      <section className="glass rounded-xl p-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-full bg-neon/20 grid place-items-center text-2xl font-bold">
            {profile?.firstName ? profile.firstName[0].toUpperCase() : '👤'}
          </div>
          <div className="flex-1">
            <p className="font-semibold text-base">{profile?.fullName || (profile?.firstName ? `${profile.firstName} ${profile.lastName ?? ''}` : 'Guest')}</p>
            <p className="text-xs text-muted">{profile?.email ?? 'Not logged in'}</p>
            {profile?.phone && <p className="text-[10px] text-muted">{profile.phone}</p>}
          </div>
          {profile?.kycStatus && (
            <span className={`text-[9px] px-2 py-1 rounded-full font-bold uppercase tracking-wider ${
              profile.kycStatus === 'APPROVED' ? 'bg-[#39ff8b]/15 text-[#39ff8b]'
              : profile.kycStatus === 'PENDING' ? 'bg-[#ffd166]/15 text-[#ffd166]'
              : profile.kycStatus === 'REJECTED' ? 'bg-[#ff5d6c]/15 text-[#ff5d6c]'
              : 'bg-white/10 text-muted'
            }`}>
              KYC: {profile.kycStatus.replace('_', ' ')}
            </span>
          )}
        </div>
        {profile?.country && (
          <div className="flex gap-4 mt-3 pt-3 border-t border-[var(--border)] text-[10px] text-muted">
            <span>Country: <span className="text-[var(--text)]">{profile.country}</span></span>
            <span>Joined: <span className="text-[var(--text)]">{profile.createdAt ? new Date(profile.createdAt).toLocaleDateString() : '-'}</span></span>
            {profile.lastLoginAt && <span>Last Login: <span className="text-[var(--text)]">{new Date(profile.lastLoginAt).toLocaleDateString()}</span></span>}
          </div>
        )}
      </section>

      {/* Trading Accounts Cards */}
      {accounts.length > 0 && (
        <section className="mb-4">
          <h2 className="text-sm font-semibold mb-2 px-1">Trading Accounts</h2>
          <div className="space-y-2">
            {accounts.map((acc: any) => {
              const isDemo = acc.accountCategory === 'DEMO' || acc.server?.startsWith('Demo');
              const isActive = acc._id === activeId;
              return (
                <div key={acc._id} className={`glass rounded-xl p-4 transition-all ${isActive ? 'ring-1 ring-[#39ff8b]/40' : ''}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                        isDemo ? 'bg-[#66b2ff]/15 text-[#66b2ff]' : 'bg-[#39ff8b]/15 text-[#39ff8b]'
                      }`}>
                        {isDemo ? 'DEMO' : 'LIVE'}
                      </span>
                      <span className="text-sm font-semibold">{acc.type || acc.accountType} #{acc.login}</span>
                      {isActive && <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#39ff8b]/15 text-[#39ff8b] font-bold">ACTIVE</span>}
                    </div>
                    {!isActive && (
                      <button onClick={() => handleSwitch(acc._id)} disabled={switching === acc._id}
                        className="text-[10px] px-3 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-muted hover:text-white transition-colors disabled:opacity-50">
                        {switching === acc._id ? '...' : 'Switch'}
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px]">
                    <div>
                      <p className="text-muted">Balance</p>
                      <p className="font-mono font-bold">${fmt(acc.balance)}</p>
                    </div>
                    <div>
                      <p className="text-muted">Leverage</p>
                      <p className="font-mono font-bold">1:{acc.leverage}</p>
                    </div>
                    <div>
                      <p className="text-muted">Currency</p>
                      <p className="font-mono font-bold">{acc.currency}</p>
                    </div>
                    <div>
                      <p className="text-muted">Server</p>
                      <p className="font-mono font-bold">{acc.server}</p>
                    </div>
                  </div>
                  {isDemo && (acc.investorPassword || acc.tradingPassword) && (
                    <div className="mt-2 pt-2 border-t border-[var(--border)] grid grid-cols-2 gap-3 text-[10px]">
                      {acc.tradingPassword && <div><span className="text-muted">Trading Pass:</span> <span className="font-mono">{acc.tradingPassword}</span></div>}
                      {acc.investorPassword && <div><span className="text-muted">Investor Pass:</span> <span className="font-mono">{acc.investorPassword}</span></div>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Menu Sections */}
      <section className="space-y-2">
        <MenuItem icon="👤" label="Personal Information" href="/settings" desc="Name, email, mobile" />
        <MenuItem icon="📊" label="Trading Accounts" href="/accounts" desc={`${accounts.length} accounts`} />
        <MenuItem icon="✅" label="KYC Verification" href="/kyc"
          desc={kyc?.status ?? profile?.kycStatus ?? 'Not started'}
          badge={kyc?.status === 'APPROVED' || profile?.kycStatus === 'APPROVED' ? 'text-neon' : kyc?.status === 'REJECTED' || profile?.kycStatus === 'REJECTED' ? 'text-loss' : 'text-gold'}
        />
        <MenuItem icon="🎁" label="Referral Program" href="/referral" desc={profile?.referralCode ? `Code: ${profile.referralCode}` : 'Earn commissions'} />
        <MenuItem icon="💰" label="Wallet" href="/wallet" desc={`$${(wallet?.balance ?? 0).toFixed(2)}`} />
        <MenuItem icon="🔒" label="Security" href="/settings" desc="Password, 2FA" />

        {/* Theme */}
        <div className="glass rounded-xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-lg">🎨</span>
            <div>
              <p className="text-sm font-medium">Theme</p>
              <p className="text-[10px] text-muted">{theme === 'dark' ? 'Dark mode' : 'Light mode'}</p>
            </div>
          </div>
          <button onClick={toggle} className="glass rounded-lg px-3 py-1.5 text-xs">
            {theme === 'dark' ? 'Light' : 'Dark'}
          </button>
        </div>

        <MenuItem icon="💬" label="Support" href="/support" desc="Live chat, tickets" />

        {/* Logout */}
        {profile?.id ? (
          <button onClick={handleLogout} className="w-full glass rounded-xl px-4 py-3 flex items-center gap-3 text-loss text-left">
            <span className="text-lg">🚪</span>
            <div>
              <p className="text-sm font-medium">Log out</p>
              <p className="text-[10px] text-muted">End your session</p>
            </div>
          </button>
        ) : (
          <Link href="/login" className="glass rounded-xl px-4 py-3 flex items-center gap-3">
            <span className="text-lg">🔑</span>
            <div>
              <p className="text-sm font-medium">Log in</p>
              <p className="text-[10px] text-muted">Access your account</p>
            </div>
          </Link>
        )}
      </section>
    </main>
  );
}

function MenuItem({ icon, label, href, desc, badge }: { icon: string; label: string; href: string; desc?: string; badge?: string }) {
  return (
    <Link href={href} className="glass rounded-xl px-4 py-3 flex items-center justify-between hover:bg-[var(--surface)]">
      <div className="flex items-center gap-3">
        <span className="text-lg">{icon}</span>
        <div>
          <p className="text-sm font-medium">{label}</p>
          {desc && <p className={`text-[10px] ${badge ?? 'text-muted'}`}>{desc}</p>}
        </div>
      </div>
      <span className="text-muted text-sm">›</span>
    </Link>
  );
}
