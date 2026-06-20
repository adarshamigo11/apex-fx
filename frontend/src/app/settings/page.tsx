'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useTheme } from '../../lib/useTheme';
import { appApi } from '../../lib/appApi';

const TABS = ['Profile', 'Security', 'Preferences', 'Devices'] as const;
type Tab = typeof TABS[number];

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>('Profile');
  const { theme, toggle } = useTheme();
  const [user, setUser] = useState<any>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    appApi.loadTokens();
    appApi.me().then(u => {
      setUser(u);
      setFirstName(u?.firstName ?? '');
      setLastName(u?.lastName ?? '');
      setPhone(u?.phone ?? '');
    }).catch(() => setUser(null));
  }, []);

  return (
    <main className="min-h-screen p-4 sm:p-6 max-w-3xl mx-auto">
      <header className="mb-6">
        <h1 className="text-xl font-bold">Settings</h1>
        <p className="text-xs text-muted">Manage your preferences</p>
      </header>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-[var(--border)] mb-6 overflow-x-auto">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm whitespace-nowrap ${tab === t ? 'tab-active font-medium' : 'tab-inactive'}`}>
            {t}
          </button>
        ))}
      </div>

      {msg && <div className="glass rounded-xl p-3 mb-4 text-xs text-center text-neon">{msg}</div>}

      {/* Admin Panel Link (only for admins) */}
      {user && user.roleName && user.roleName !== 'USER' && (
        <Link href="/admin" className="glass rounded-xl p-4 mb-4 flex items-center gap-4 hover:bg-[var(--surface)] transition-colors block">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#39ff8b] to-[#ffd166] flex items-center justify-center font-bold text-[#0a0e1a]">A</div>
          <div className="flex-1">
            <p className="text-sm font-medium">Admin Panel</p>
            <p className="text-xs text-muted">Role: {user.roleName} — Manage users, KYC, trades, and more</p>
          </div>
          <svg className="w-5 h-5 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
        </Link>
      )}

      {/* Profile */}
      {tab === 'Profile' && (
        <section className="space-y-4">
          <div className="glass rounded-xl p-5">
            <h2 className="text-sm font-semibold mb-4">Personal Information</h2>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-muted uppercase mb-1 block">First Name</label>
                  <input type="text" value={firstName} onChange={e => setFirstName(e.target.value)}
                    className="w-full glass rounded-lg px-4 py-2.5 text-sm outline-none" />
                </div>
                <div>
                  <label className="text-[10px] text-muted uppercase mb-1 block">Last Name</label>
                  <input type="text" value={lastName} onChange={e => setLastName(e.target.value)}
                    className="w-full glass rounded-lg px-4 py-2.5 text-sm outline-none" />
                </div>
              </div>
              <div>
                <label className="text-[10px] text-muted uppercase mb-1 block">Email</label>
                <input type="email" value={user?.email ?? ''} disabled
                  className="w-full glass rounded-lg px-4 py-2.5 text-sm outline-none opacity-50" />
              </div>
              <div>
                <label className="text-[10px] text-muted uppercase mb-1 block">Phone</label>
                <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                  className="w-full glass rounded-lg px-4 py-2.5 text-sm outline-none" />
              </div>
              <button onClick={() => setMsg('Profile updated!')}
                className="bg-neon text-black font-semibold rounded-lg px-6 py-2.5 text-sm hover:opacity-90 transition">
                Save Changes
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Security */}
      {tab === 'Security' && (
        <section className="space-y-4">
          <div className="glass rounded-xl p-5">
            <h2 className="text-sm font-semibold mb-4">Change Password</h2>
            <div className="space-y-3 max-w-md">
              <input type="password" placeholder="Current Password"
                className="w-full glass rounded-lg px-4 py-2.5 text-sm outline-none" />
              <input type="password" placeholder="New Password"
                className="w-full glass rounded-lg px-4 py-2.5 text-sm outline-none" />
              <input type="password" placeholder="Confirm New Password"
                className="w-full glass rounded-lg px-4 py-2.5 text-sm outline-none" />
              <button onClick={() => setMsg('Password updated!')}
                className="bg-neon text-black font-semibold rounded-lg px-6 py-2.5 text-sm hover:opacity-90 transition">
                Update Password
              </button>
            </div>
          </div>

          <div className="glass rounded-xl p-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold">Two-Factor Authentication</h2>
                <p className="text-xs text-muted mt-0.5">Add an extra layer of security</p>
              </div>
              <button className="glass rounded-lg px-4 py-2 text-xs font-medium text-gold hover:bg-gold/10 transition">
                Enable 2FA
              </button>
            </div>
          </div>

          <div className="glass rounded-xl p-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold">Login Alerts</h2>
                <p className="text-xs text-muted mt-0.5">Get notified of new login attempts</p>
              </div>
              <button className="w-10 h-5 bg-neon rounded-full relative">
                <span className="w-4 h-4 bg-white rounded-full absolute right-0.5 top-0.5" />
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Preferences */}
      {tab === 'Preferences' && (
        <section className="space-y-3">
          {/* Theme */}
          <div className="glass rounded-xl p-5 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Theme</p>
              <p className="text-xs text-muted">{theme === 'dark' ? 'Dark mode' : 'Light mode'}</p>
            </div>
            <button onClick={toggle} className="glass rounded-lg px-4 py-2 text-xs font-medium hover:bg-neon/10 transition">
              {theme === 'dark' ? 'Switch to Light' : 'Switch to Dark'}
            </button>
          </div>

          {/* Language */}
          <div className="glass rounded-xl p-5 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Language</p>
              <p className="text-xs text-muted">Interface language</p>
            </div>
            <select className="glass rounded-lg px-3 py-1.5 text-xs outline-none bg-transparent">
              <option>English</option>
              <option>Hindi</option>
              <option>Spanish</option>
              <option>Arabic</option>
            </select>
          </div>

          {/* Notifications */}
          <div className="glass rounded-xl p-5">
            <p className="text-sm font-medium mb-3">Notification Preferences</p>
            <div className="space-y-2">
              {[
                { label: 'Trade Confirmations', desc: 'When orders are filled', enabled: true },
                { label: 'Price Alerts', desc: 'When target prices are hit', enabled: true },
                { label: 'Margin Warnings', desc: 'Low margin level alerts', enabled: true },
                { label: 'Promotional', desc: 'Bonuses, events, updates', enabled: false },
              ].map((n, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-[var(--border)] last:border-0">
                  <div>
                    <p className="text-xs font-medium">{n.label}</p>
                    <p className="text-[10px] text-muted">{n.desc}</p>
                  </div>
                  <div className={`w-9 h-5 rounded-full relative cursor-pointer ${n.enabled ? 'bg-neon' : 'bg-[var(--surface)]'}`}>
                    <span className={`w-3.5 h-3.5 bg-white rounded-full absolute top-[3px] transition-all ${n.enabled ? 'right-[3px]' : 'left-[3px]'}`} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Timezone */}
          <div className="glass rounded-xl p-5 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Timezone</p>
              <p className="text-xs text-muted">Chart and time display</p>
            </div>
            <select className="glass rounded-lg px-3 py-1.5 text-xs outline-none bg-transparent">
              <option>UTC+5:30 (IST)</option>
              <option>UTC+0 (GMT)</option>
              <option>UTC-5 (EST)</option>
              <option>UTC+9 (JST)</option>
            </select>
          </div>
        </section>
      )}

      {/* Devices */}
      {tab === 'Devices' && (
        <section className="space-y-3">
          <div className="glass rounded-xl p-5">
            <h2 className="text-sm font-semibold mb-3">Connected Devices</h2>
            <div className="space-y-3">
              {[
                { device: 'Chrome on Windows', location: 'Mumbai, India', time: 'Now', current: true },
                { device: 'Safari on iPhone', location: 'Mumbai, India', time: '2 hours ago', current: false },
                { device: 'Firefox on MacOS', location: 'Delhi, India', time: '3 days ago', current: false },
              ].map((d, i) => (
                <div key={i} className="flex items-center justify-between py-3 border-b border-[var(--border)] last:border-0">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{d.device.includes('Chrome') ? '🖥️' : d.device.includes('Safari') ? '📱' : '💻'}</span>
                    <div>
                      <p className="text-xs font-medium">{d.device}</p>
                      <p className="text-[10px] text-muted">{d.location} • {d.time}</p>
                    </div>
                  </div>
                  {d.current ? (
                    <span className="px-2 py-0.5 bg-neon/10 text-neon rounded-full text-[10px]">Current</span>
                  ) : (
                    <button className="text-xs text-loss hover:underline">Revoke</button>
                  )}
                </div>
              ))}
            </div>
          </div>
          <button className="w-full glass rounded-xl p-3 text-xs text-loss font-medium hover:bg-loss/10 transition">
            Log out of all other devices
          </button>
        </section>
      )}
    </main>
  );
}
