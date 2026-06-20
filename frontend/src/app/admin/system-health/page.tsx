'use client';
import { useEffect, useState } from 'react';
import { appApi } from '@/lib/appApi';
import { StatCard, PageHeader, StatusBadge, Spinner } from '@/components/admin';

export default function SystemHealthPage() {
  const [system, setSystem] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [s, st] = await Promise.all([
        appApi.admin.monitoring.system(),
        appApi.admin.monitoring.stats(),
      ]);
      setSystem(s);
      setStats(st);
    } catch (e) {
      console.error('Failed to load system health', e);
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  if (loading) return <Spinner />;

  const dbStatus = system?.database?.connected ? 'HEALTHY' : 'DOWN';
  const feedStatus = system?.feedProviders?.healthy ? 'HEALTHY' : system?.feedProviders?.degraded ? 'DEGRADED' : 'DOWN';
  const apiStatus = system?.api?.uptime ? 'HEALTHY' : 'DEGRADED';

  return (
    <div>
      <PageHeader
        title="System Health"
        subtitle="Infrastructure monitoring and service status"
        actions={
          <button onClick={fetchData} className="px-4 py-2 rounded-xl bg-[var(--surface)] hover:bg-[var(--border)] text-sm transition-colors">
            Refresh
          </button>
        }
      />

      {/* Service Status Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="glass rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-2xl">🗄️</span>
            <StatusBadge status={dbStatus} />
          </div>
          <p className="text-lg font-bold">Database</p>
          <p className="text-xs text-muted mt-1">MongoDB {system?.database?.version || ''}</p>
          {system?.database?.connections != null && (
            <p className="text-xs text-muted">{system.database.connections} connections</p>
          )}
        </div>

        <div className="glass rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-2xl">⚡</span>
            <StatusBadge status={apiStatus} />
          </div>
          <p className="text-lg font-bold">API Server</p>
          <p className="text-xs text-muted mt-1">Uptime: {system?.api?.uptime || 'N/A'}</p>
          {system?.api?.memory && (
            <p className="text-xs text-muted">Mem: {system.api.memory}</p>
          )}
        </div>

        <div className="glass rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-2xl">📡</span>
            <StatusBadge status={feedStatus} />
          </div>
          <p className="text-lg font-bold">Price Feeds</p>
          <p className="text-xs text-muted mt-1">{system?.feedProviders?.total || 0} providers</p>
          {system?.feedProviders?.healthy != null && (
            <p className="text-xs text-muted">{system.feedProviders.healthy} healthy</p>
          )}
        </div>

        <div className="glass rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-2xl">🔴</span>
            <StatusBadge status="HEALTHY" />
          </div>
          <p className="text-lg font-bold">WebSocket</p>
          <p className="text-xs text-muted mt-1">{system?.websocket?.connections || 0} active</p>
        </div>
      </div>

      {/* Platform Stats */}
      {stats && (
        <div className="glass rounded-xl p-6 mb-8">
          <h2 className="font-semibold text-lg mb-4">Platform Statistics</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <p className="text-2xl font-bold text-[#39ff8b]">{stats.totalUsers?.toLocaleString() || 0}</p>
              <p className="text-xs text-muted">Total Users</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-[#66b2ff]">{stats.activeUsers?.toLocaleString() || 0}</p>
              <p className="text-xs text-muted">Active Users</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-[#ffd166]">{stats.totalTrades?.toLocaleString() || 0}</p>
              <p className="text-xs text-muted">Total Trades</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-[#39ff8b]">{stats.totalSymbols || 0}</p>
              <p className="text-xs text-muted">Active Symbols</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-[#ffd166]">{stats.pendingKyc || 0}</p>
              <p className="text-xs text-muted">Pending KYC</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-[#ffd166]">{stats.pendingWithdrawals || 0}</p>
              <p className="text-xs text-muted">Pending Withdrawals</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-[#ffd166]">{stats.pendingDeposits || 0}</p>
              <p className="text-xs text-muted">Pending Deposits</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-[#66b2ff]">{stats.today?.signups || 0}</p>
              <p className="text-xs text-muted">Today&apos;s Signups</p>
            </div>
          </div>
        </div>
      )}

      {/* Database Details */}
      {system?.database && (
        <div className="glass rounded-xl p-6 mb-8">
          <h2 className="font-semibold text-lg mb-4">Database Details</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <div className="flex justify-between py-2 border-b border-[var(--border)]">
              <span className="text-muted">Status</span>
              <StatusBadge status={system.database.connected ? 'HEALTHY' : 'DOWN'} />
            </div>
            <div className="flex justify-between py-2 border-b border-[var(--border)]">
              <span className="text-muted">Version</span>
              <span className="font-medium">{system.database.version || 'N/A'}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-[var(--border)]">
              <span className="text-muted">Connections</span>
              <span className="font-medium">{system.database.connections ?? 'N/A'}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-[var(--border)]">
              <span className="text-muted">Storage Size</span>
              <span className="font-medium">{system.database.storageSize || 'N/A'}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-[var(--border)]">
              <span className="text-muted">Data Size</span>
              <span className="font-medium">{system.database.dataSize || 'N/A'}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-[var(--border)]">
              <span className="text-muted">Collections</span>
              <span className="font-medium">{system.database.collections || 'N/A'}</span>
            </div>
          </div>
        </div>
      )}

      {/* Feed Provider Details */}
      {system?.feedProviders?.providers && (
        <div className="glass rounded-xl p-6">
          <h2 className="font-semibold text-lg mb-4">Feed Provider Status</h2>
          <div className="space-y-3">
            {system.feedProviders.providers.map((p: any) => (
              <div key={p.name || p._id} className="flex items-center justify-between py-2 border-b border-[var(--border)] last:border-0">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${p.healthStatus === 'HEALTHY' ? 'bg-[#39ff8b]' : p.healthStatus === 'DEGRADED' ? 'bg-[#ffd166]' : 'bg-[#ff5d6c]'}`} />
                  <div>
                    <p className="text-sm font-medium">{p.name}</p>
                    <p className="text-xs text-muted">{p.type}</p>
                  </div>
                </div>
                <div className="text-right">
                  <StatusBadge status={p.healthStatus || 'UNKNOWN'} />
                  {p.lastCheckAt && <p className="text-xs text-muted mt-1">Last: {new Date(p.lastCheckAt).toLocaleString()}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
