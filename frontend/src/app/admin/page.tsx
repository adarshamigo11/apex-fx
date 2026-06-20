'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { appApi } from '@/lib/appApi';
import { PageHeader, Spinner } from '@/components/admin';

function fmt(n: number | null | undefined) { return (n ?? 0).toLocaleString('en-US'); }
function money(n: number | null | undefined) { return '$' + (n ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

export default function AdminDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [audit, setAudit] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      appApi.admin.monitoring.stats(),
      appApi.admin.auditLog.list({ limit: 10 }),
    ]).then(([s, a]) => { setStats(s); setAudit(a); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;

  return (
    <div className="space-y-6">
      <PageHeader title="Super Admin Dashboard" subtitle="Complete platform overview and real-time metrics" />

      {/* ─── TOP-LEVEL KPI CARDS ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiCard icon="👥" label="Total Users" value={fmt(stats?.totalUsers)} color="#39ff8b" href="/admin/users" />
        <KpiCard icon="👔" label="Total Employees" value={fmt(stats?.totalEmployees)} color="#66b2ff" href="/admin/employees" />
        <KpiCard icon="💰" label="Total Deposits" value={money(stats?.totalDeposits?.total)} sub={`${fmt(stats?.totalDeposits?.count)} transactions`} color="#39ff8b" href="/admin/deposits" />
        <KpiCard icon="💸" label="Total Withdrawals" value={money(stats?.totalWithdrawals?.total)} sub={`${fmt(stats?.totalWithdrawals?.count)} transactions`} color="#ff5d6c" href="/admin/withdrawals" />
        <KpiCard icon="📈" label="Active Trades" value={fmt(stats?.activePositions)} color="#ffd166" href="/admin/trades" />
        <KpiCard icon="💵" label="Total P&L" value={money(stats?.totalFloatingPnL)} color={stats?.totalFloatingPnL >= 0 ? '#39ff8b' : '#ff5d6c'} />
      </div>

      {/* ─── FINANCIAL OVERVIEW ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Platform Balance */}
        <div className="glass rounded-xl p-6">
          <h3 className="text-xs text-muted uppercase tracking-widest mb-4">Platform Balance</h3>
          <p className="text-3xl font-bold text-[#39ff8b]">{money(stats?.totalWalletBalance)}</p>
          <p className="text-xs text-muted mt-1">Total client wallet balance</p>
          <div className="mt-4 pt-4 border-t border-[var(--border)] space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted">Margin Used</span>
              <span className="font-medium">{money(stats?.totalMarginUsed)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted">Floating P&L</span>
              <span className={`font-medium ${(stats?.totalFloatingPnL ?? 0) >= 0 ? 'text-[#39ff8b]' : 'text-[#ff5d6c]'}`}>
                {(stats?.totalFloatingPnL ?? 0) >= 0 ? '+' : ''}{money(stats?.totalFloatingPnL)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted">Trading Accounts</span>
              <span className="font-medium">{fmt(stats?.totalAccounts)}</span>
            </div>
          </div>
        </div>

        {/* User Breakdown */}
        <div className="glass rounded-xl p-6">
          <h3 className="text-xs text-muted uppercase tracking-widest mb-4">User Breakdown</h3>
          <div className="space-y-3">
            <ProgressBar label="Active" value={stats?.activeUsers || 0} total={stats?.totalUsers || 1} color="#39ff8b" />
            <ProgressBar label="Pending" value={stats?.pendingUsers || 0} total={stats?.totalUsers || 1} color="#ffd166" />
            <ProgressBar label="Restricted" value={stats?.restrictedUsers || 0} total={stats?.totalUsers || 1} color="#ff5d6c" />
          </div>
          <div className="mt-4 pt-4 border-t border-[var(--border)] grid grid-cols-2 gap-3">
            <MiniStat label="Clients" value={fmt((stats?.totalUsers || 0) - (stats?.totalEmployees || 0))} />
            <MiniStat label="Staff" value={fmt(stats?.totalEmployees)} />
            <MiniStat label="Active" value={fmt(stats?.activeUsers)} />
            <MiniStat label="Total" value={fmt(stats?.totalUsers)} />
          </div>
        </div>

        {/* Pending Actions */}
        <div className="glass rounded-xl p-6">
          <h3 className="text-xs text-muted uppercase tracking-widest mb-4">Pending Actions</h3>
          <div className="space-y-3">
            <ActionItem icon="💸" label="Withdrawals" count={stats?.pendingWithdrawals || 0} href="/admin/withdrawals" urgent />
            <ActionItem icon="💰" label="Deposits" count={stats?.pendingDeposits || 0} href="/admin/deposits" urgent />
            <ActionItem icon="📋" label="KYC Reviews" count={stats?.pendingKyc || 0} href="/admin/kyc" urgent />
            <ActionItem icon="🎫" label="Open Tickets" count={stats?.openTickets || 0} href="/admin/support" />
          </div>
          <div className="mt-4 pt-4 border-t border-[var(--border)]">
            <p className="text-xs text-muted">
              {((stats?.pendingWithdrawals || 0) + (stats?.pendingDeposits || 0) + (stats?.pendingKyc || 0)) > 0 
                ? '⚠️ Items require your attention' 
                : '✅ No pending items'}
            </p>
          </div>
        </div>
      </div>

      {/* ─── TODAY'S ACTIVITY ─── */}
      <div className="glass rounded-xl p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold text-lg">Today&apos;s Activity</h2>
          <span className="text-xs text-muted">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <TodayStat icon="🆕" label="New Signups" value={stats?.today?.signups || 0} color="#39ff8b" />
          <TodayStat icon="📈" label="Trades Closed" value={stats?.today?.trades || 0} color="#66b2ff" />
          <TodayStat icon="💰" label="Deposits" value={stats?.today?.deposits?.count || 0} sub={money(stats?.today?.deposits?.total)} color="#39ff8b" />
          <TodayStat icon="💸" label="Withdrawals" value={stats?.today?.withdrawals?.count || 0} sub={money(stats?.today?.withdrawals?.total)} color="#ffd166" />
          <TodayStat icon="📊" label="Net Flow" value="" sub={money((stats?.today?.deposits?.total || 0) - (stats?.today?.withdrawals?.total || 0))} color={(stats?.today?.deposits?.total || 0) >= (stats?.today?.withdrawals?.total || 0) ? '#39ff8b' : '#ff5d6c'} />
        </div>
      </div>

      {/* ─── PLATFORM METRICS ROW ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        <MetricTile label="Symbols" value={fmt(stats?.totalSymbols)} icon="🔧" />
        <MetricTile label="Trade History" value={fmt(stats?.totalTrades)} icon="📊" />
        <MetricTile label="Open Positions" value={fmt(stats?.activePositions)} icon="📈" />
        <MetricTile label="Accounts" value={fmt(stats?.totalAccounts)} icon="🏦" />
        <MetricTile label="KYC Pending" value={fmt(stats?.pendingKyc)} icon="📋" />
        <MetricTile label="Tickets" value={`${fmt(stats?.openTickets)}/${fmt(stats?.totalTickets)}`} icon="🎫" />
        <MetricTile label="Employees" value={fmt(stats?.totalEmployees)} icon="👔" />
        <MetricTile label="Clients" value={fmt((stats?.totalUsers || 0) - (stats?.totalEmployees || 0))} icon="👤" />
      </div>

      {/* ─── QUICK ACTIONS + RECENT ACTIVITY ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Quick Actions */}
        <div className="glass rounded-xl p-6">
          <h3 className="font-semibold mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-2">
            <QuickAction href="/admin/users" icon="👥" label="Manage Users" />
            <QuickAction href="/admin/employees/create" icon="➕" label="Add Employee" />
            <QuickAction href="/admin/deposits" icon="💰" label="Approve Deposits" />
            <QuickAction href="/admin/withdrawals" icon="💸" label="Process Withdrawals" />
            <QuickAction href="/admin/kyc" icon="📋" label="Review KYC" />
            <QuickAction href="/admin/symbols" icon="🔧" label="Manage Symbols" />
            <QuickAction href="/admin/roles" icon="🔑" label="Manage Roles" />
            <QuickAction href="/admin/settings" icon="⚙️" label="Settings" />
          </div>
        </div>

        {/* Recent Admin Activity */}
        <div className="glass rounded-xl p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Recent Admin Activity</h3>
            <Link href="/admin/audit-log" className="text-xs text-[#39ff8b] hover:underline">View All</Link>
          </div>
          {audit?.items?.length ? (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {audit.items.slice(0, 10).map((item: any) => (
                <div key={item._id} className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-[var(--surface)] transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[var(--surface)] flex items-center justify-center text-sm">
                      {item.action?.includes('kyc') ? '📋' : item.action?.includes('withdraw') ? '💸' : item.action?.includes('deposit') ? '💰' : item.action?.includes('user') ? '👤' : item.action?.includes('symbol') ? '🔧' : item.action?.includes('employee') ? '👔' : '📝'}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{item.action}</p>
                      <p className="text-[11px] text-muted">{item.targetType} {item.targetId ? `#${item.targetId.slice(0, 8)}` : ''}</p>
                    </div>
                  </div>
                  <span className="text-[11px] text-muted whitespace-nowrap">{new Date(item.createdAt).toLocaleString()}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted text-center py-12">No recent activity</p>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Sub Components ──────────────────────────────────────── */

function KpiCard({ icon, label, value, sub, color, href }: { icon: string; label: string; value: string; sub?: string; color: string; href?: string }) {
  const content = (
    <div className="glass rounded-xl p-4 hover:border-[var(--border)] transition-all group cursor-pointer">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xl">{icon}</span>
        {href && <span className="text-xs text-muted group-hover:text-[#39ff8b] transition-colors">→</span>}
      </div>
      <p className="text-lg sm:text-xl font-bold" style={{ color }}>{value}</p>
      <p className="text-[11px] text-muted mt-0.5">{label}</p>
      {sub && <p className="text-[10px] text-muted">{sub}</p>}
    </div>
  );
  return href ? <Link href={href}>{content}</Link> : content;
}

function ProgressBar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-muted">{label}</span>
        <span className="font-medium">{fmt(value)} <span className="text-muted text-xs">({pct}%)</span></span>
      </div>
      <div className="h-2 rounded-full bg-[var(--surface)] overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center p-2 rounded-lg bg-[var(--surface)]">
      <p className="text-sm font-bold">{value}</p>
      <p className="text-[10px] text-muted">{label}</p>
    </div>
  );
}

function ActionItem({ icon, label, count, href, urgent }: { icon: string; label: string; count: number; href: string; urgent?: boolean }) {
  return (
    <Link href={href} className="flex items-center justify-between p-3 rounded-lg hover:bg-[var(--surface)] transition-colors group">
      <div className="flex items-center gap-3">
        <span className="text-lg">{icon}</span>
        <span className="text-sm">{label}</span>
      </div>
      <span className={`text-sm font-bold px-2.5 py-0.5 rounded-full ${
        count > 0 && urgent ? 'bg-[#ff5d6c]/15 text-[#ff5d6c]' : count > 0 ? 'bg-[#ffd166]/15 text-[#ffd166]' : 'bg-[var(--surface)] text-muted'
      }`}>
        {count}
      </span>
    </Link>
  );
}

function TodayStat({ icon, label, value, sub, color }: { icon: string; label: string; value: string | number; sub?: string; color: string }) {
  return (
    <div className="text-center p-3 rounded-xl bg-[var(--surface)]">
      <span className="text-lg">{icon}</span>
      <p className="text-xl font-bold mt-1" style={{ color }}>{value}</p>
      <p className="text-[11px] text-muted">{label}</p>
      {sub && <p className="text-[10px] font-mono" style={{ color }}>{sub}</p>}
    </div>
  );
}

function MetricTile({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <div className="glass rounded-lg p-3 text-center">
      <span className="text-sm">{icon}</span>
      <p className="text-sm font-bold mt-1">{value}</p>
      <p className="text-[9px] text-muted uppercase tracking-wider">{label}</p>
    </div>
  );
}

function QuickAction({ href, icon, label }: { href: string; icon: string; label: string }) {
  return (
    <Link href={href} className="flex items-center gap-2 p-2.5 rounded-lg bg-[var(--surface)] hover:bg-[var(--border)] transition-colors text-sm">
      <span>{icon}</span>
      <span className="text-xs">{label}</span>
    </Link>
  );
}
