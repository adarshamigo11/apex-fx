'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useTheme } from '../../lib/useTheme';
import { appApi } from '../../lib/appApi';

export default function ProfilePage() {
  const { theme, toggle } = useTheme();
  const [user, setUser] = useState<any>(null);
  const [wallet, setWallet] = useState<any>(null);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [kyc, setKyc] = useState<any>(null);

  useEffect(() => {
    appApi.loadTokens();
    appApi.me().then(setUser).catch(() => setUser(null));
    appApi.wallet().then(setWallet).catch(() => setWallet(null));
    appApi.accounts().then(setAccounts).catch(() => setAccounts([]));
    appApi.kyc().then(setKyc).catch(() => setKyc(null));
  }, []);

  const handleLogout = () => {
    appApi.setTokens(null, null);
    window.location.href = '/login';
  };

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
            {user?.firstName ? user.firstName[0].toUpperCase() : '👤'}
          </div>
          <div>
            <p className="font-semibold text-base">{user?.firstName ? `${user.firstName} ${user.lastName ?? ''}` : 'Guest'}</p>
            <p className="text-xs text-muted">{user?.email ?? 'Not logged in'}</p>
            <p className="text-[10px] text-muted mt-0.5">{user?.phone ?? ''}</p>
          </div>
        </div>
      </section>

      {/* Menu Sections */}
      <section className="space-y-2">
        {/* Personal Information */}
        <MenuItem icon="👤" label="Personal Information" href="/settings" desc="Name, email, mobile" />

        {/* Trading Accounts */}
        <MenuItem icon="📊" label="Trading Accounts" href="/accounts" desc={`${accounts.length} accounts`} />

        {/* KYC */}
        <MenuItem icon="✅" label="KYC Verification" href="/kyc"
          desc={kyc?.status ?? 'Not started'}
          badge={kyc?.status === 'APPROVED' ? 'text-neon' : kyc?.status === 'REJECTED' ? 'text-loss' : 'text-gold'}
        />

        {/* Referral */}
        <MenuItem icon="🎁" label="Referral Program" href="/referral" desc="Earn commissions" />

        {/* Wallet */}
        <MenuItem icon="💰" label="Wallet" href="/wallet" desc={`$${(wallet?.balance ?? 0).toFixed(2)}`} />

        {/* Security */}
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

        {/* Support */}
        <MenuItem icon="💬" label="Support" href="/support" desc="Live chat, tickets" />

        {/* Logout */}
        {user?.sub ? (
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
