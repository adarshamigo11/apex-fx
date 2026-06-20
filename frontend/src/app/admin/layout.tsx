'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { appApi } from '@/lib/appApi';
import { useState, useEffect } from 'react';

const NAV_GROUPS = [
  {
    label: 'Overview',
    items: [
      { href: '/admin', label: 'Dashboard', icon: '📊' },
      { href: '/admin/system-health', label: 'System Health', icon: '💻' },
    ],
  },
  {
    label: 'People',
    items: [
      { href: '/admin/employees', label: 'Employees', icon: '👔' },
      { href: '/admin/users', label: 'Users', icon: '👥' },
      { href: '/admin/roles', label: 'Roles', icon: '🔑' },
    ],
  },
  {
    label: 'Operations',
    items: [
      { href: '/admin/kyc', label: 'KYC', icon: '📋' },
      { href: '/admin/deposits', label: 'Deposits', icon: '💰' },
      { href: '/admin/withdrawals', label: 'Withdrawals', icon: '💸' },
      { href: '/admin/support', label: 'Support', icon: '🎫' },
    ],
  },
  {
    label: 'Trading',
    items: [
      { href: '/admin/trades', label: 'Trade History', icon: '📈' },
      { href: '/admin/risk', label: 'Risk Dashboard', icon: '⚠️' },
    ],
  },
  {
    label: 'Market',
    items: [
      { href: '/admin/symbols', label: 'Instruments', icon: '🔧' },
      { href: '/admin/market', label: 'Market Dashboard', icon: '🌐' },
      { href: '/admin/feed-providers', label: 'Feed Providers', icon: '📡' },
    ],
  },
  {
    label: 'Compliance',
    items: [
      { href: '/admin/audit-log', label: 'Audit Log', icon: '📝' },
      { href: '/admin/approvals', label: 'Approvals', icon: '✅' },
      { href: '/admin/security-events', label: 'Security', icon: '🛡️' },
    ],
  },
  {
    label: 'Communication',
    items: [
      { href: '/admin/communication', label: 'Messages', icon: '📨' },
    ],
  },
  {
    label: 'System',
    items: [
      { href: '/admin/account-types', label: 'Account Types', icon: '🏦' },
      { href: '/admin/settings', label: 'Settings', icon: '⚙️' },
    ],
  },
];

const ALL_ITEMS = NAV_GROUPS.flatMap(g => g.items);

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [authState, setAuthState] = useState<'loading' | 'authenticated' | 'unauthenticated'>('loading');
  const [user, setUser] = useState<{ id: string; role: string; perms: string[] } | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  const isLoginPage = pathname === '/admin/login';

  useEffect(() => {
    if (isLoginPage) {
      setAuthState('authenticated');
      return;
    }
    const currentUser = appApi.getCurrentUser();
    if (!currentUser || currentUser.role === 'USER') {
      setAuthState('unauthenticated');
      router.replace('/admin/login');
    } else {
      setUser(currentUser);
      setAuthState('authenticated');
    }
  }, [isLoginPage, router]);

  const toggleGroup = (label: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label); else next.add(label);
      return next;
    });
  };

  if (isLoginPage) return <>{children}</>;

  if (authState === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="glass rounded-xl p-8 text-center">
          <div className="animate-spin w-8 h-8 border-2 border-[#39ff8b] border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-muted">Checking permissions...</p>
        </div>
      </div>
    );
  }

  if (authState === 'unauthenticated') return null;

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('at');
      localStorage.removeItem('rt');
    }
    appApi.setTokens(null, null);
    router.push('/admin/login');
  };

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className={`fixed lg:sticky top-0 left-0 h-screen w-64 glass border-r border-[var(--border)] flex flex-col z-50 transition-transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        {/* Logo */}
        <div className="p-5 border-b border-[var(--border)] flex-shrink-0">
          <Link href="/admin" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#39ff8b] to-[#ffd166] flex items-center justify-center font-bold text-[#0a0e1a]">A</div>
            <div>
              <h1 className="font-bold text-base">ApexFX Admin</h1>
              <p className="text-[10px] text-muted uppercase tracking-wider">Back Office</p>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-4 overflow-y-auto">
          {NAV_GROUPS.map((group) => {
            const collapsed = collapsedGroups.has(group.label);
            return (
              <div key={group.label}>
                <button
                  onClick={() => toggleGroup(group.label)}
                  className="flex items-center justify-between w-full px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-muted hover:text-[var(--text)] transition-colors"
                >
                  {group.label}
                  <svg className={`w-3 h-3 transition-transform ${collapsed ? '' : 'rotate-90'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
                {!collapsed && (
                  <div className="mt-1 space-y-0.5">
                    {group.items.map((item) => {
                      const isActive = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href));
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setSidebarOpen(false)}
                          className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all ${
                            isActive
                              ? 'bg-[#39ff8b]/10 text-[#39ff8b] font-medium'
                              : 'text-muted hover:bg-[var(--surface)] hover:text-[var(--text)]'
                          }`}
                        >
                          <span className="text-base">{item.icon}</span>
                          <span>{item.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* User section */}
        <div className="p-3 border-t border-[var(--border)] flex-shrink-0">
          <div className="flex items-center gap-2 p-2 rounded-lg glass mb-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#39ff8b] to-[#ffd166] flex items-center justify-center text-xs font-bold text-[#0a0e1a] flex-shrink-0">
              {user?.role?.charAt(0) || 'A'}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium truncate">{user?.role?.replace(/_/g, ' ') || 'Admin'}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Link href="/dashboard" className="flex-1 text-center py-1.5 px-2 text-xs rounded-lg bg-[var(--surface)] hover:bg-[var(--border)] transition-colors">
              App
            </Link>
            <button onClick={handleLogout} className="flex-1 py-1.5 px-2 text-xs rounded-lg bg-[#ff5d6c]/10 text-[#ff5d6c] hover:bg-[#ff5d6c]/20 transition-colors">
              Logout
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Top bar */}
        <header className="sticky top-0 z-30 glass border-b border-[var(--border)] px-4 lg:px-8 py-3 flex items-center justify-between">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 rounded-lg hover:bg-[var(--surface)]"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted hidden sm:block">
              {ALL_ITEMS.find(i => pathname === i.href || (i.href !== '/admin' && pathname.startsWith(i.href)))?.label || 'Admin'}
            </span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-8 overflow-x-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
