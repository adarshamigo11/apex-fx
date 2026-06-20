'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { appApi } from '../lib/appApi';

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/', icon: 'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z' },
  { label: 'Market Watch', href: '/watchlist', icon: 'M22 7l-8.5 8.5-5-5L2 17' },
  { label: 'Trading Terminal', href: '/dashboard', icon: 'M2 3h20v14H2zM8 21h8M12 17v4' },
  { label: 'Portfolio', href: '/portfolio', icon: 'M2 7h20v14H2zM16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16' },
  { label: 'Wallet', href: '/wallet', icon: 'M21 4H3a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h18a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zM1 10h22' },
  { label: 'Trading Accounts', href: '/accounts', icon: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75' },
  { label: 'Analytics', href: '/analytics', icon: 'M18 20V10M12 20V4M6 20v-6' },
  { label: 'Economic Calendar', href: '/calendar', icon: 'M19 4H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zM16 2v4M8 2v4M3 10h18' },
  { label: 'Referral / IB', href: '/referral', icon: 'M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M8.5 3A4 4 0 1 0 8.5 11 4 4 0 0 0 8.5 3zM20 8v6M23 11h-6' },
  { label: 'KYC Verification', href: '/kyc', icon: 'M9 12l2 2 4-4M7.835 4.697A3.42 3.42 0 0 0 1 12c0 5.523 4.477 10 10 10a10 10 0 0 0 10-10c0-2.2-.9-4.2-2.3-5.7' },
  { label: 'Notifications', href: '/notifications', icon: 'M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0' },
  { label: 'Support Center', href: '/support', icon: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z' },
  { label: 'Settings', href: '/settings', icon: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9' },
];

function SvgIcon({ d, size = 20 }: { d: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    appApi.loadTokens();
    const u = appApi.getCurrentUser();
    if (u) setUser(u);
  }, []);

  return (
    <aside
      className={`hidden md:flex flex-col fixed top-0 left-0 h-screen z-40 border-r border-[var(--border)] bg-[var(--bg)] sidebar-transition scrollbar-thin overflow-y-auto ${
        collapsed ? 'w-sidebar-collapsed' : 'w-sidebar-expanded'
      }`}
    >
      {/* Logo */}
      <div className="flex items-center gap-2 px-4 h-14 shrink-0 border-b border-[var(--border)]">
        {!collapsed && (
          <h1 className="text-lg font-bold whitespace-nowrap">
            <span className="text-gold">Apex</span><span className="text-neon">FX</span>
          </h1>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="ml-auto glass rounded-lg w-7 h-7 grid place-items-center text-xs text-muted hover:text-[var(--text)]"
          aria-label="Toggle sidebar"
        >
          {collapsed ? '→' : '←'}
        </button>
      </div>

      {/* Nav links */}
      <nav className="flex-1 py-2 px-2 space-y-0.5">
        {NAV_ITEMS.map((item) => {
          const isActive = item.href === '/'
            ? pathname === '/'
            : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
                isActive
                  ? 'bg-neon/10 text-neon font-medium'
                  : 'text-muted hover:text-[var(--text)] hover:bg-[var(--surface)]'
              }`}
            >
              <span className="shrink-0"><SvgIcon d={item.icon} /></span>
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="shrink-0 p-3 border-t border-[var(--border)]">
        {user && (
          <button
            onClick={() => appApi.logout()}
            className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm text-muted hover:text-[#ff5d6c] hover:bg-[#ff5d6c]/10 transition-all ${collapsed ? 'justify-center' : ''}`}
            title="Logout"
          >
            <span className="shrink-0">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </span>
            {!collapsed && <span>Logout</span>}
          </button>
        )}
        {!collapsed && (
          <p className="text-[10px] text-muted text-center mt-2">ApexFX v0.2.0</p>
        )}
      </div>
    </aside>
  );
}
