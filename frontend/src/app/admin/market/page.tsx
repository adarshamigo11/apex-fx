'use client';
import { useEffect, useState } from 'react';
import { appApi } from '@/lib/appApi';
import { PageHeader, StatCard, StatusBadge, Spinner, ConfirmDialog, PermGate } from '@/components/admin';

export default function AdminMarketPage() {
  const [dashboard, setDashboard] = useState<any>(null);
  const [feedHealth, setFeedHealth] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [haltConfirm, setHaltConfirm] = useState(false);
  const [resumeConfirm, setResumeConfirm] = useState(false);
  const [actionLoading, setActionLoading] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [d, f] = await Promise.all([appApi.admin.market.dashboard(), appApi.admin.market.feedHealth()]);
      setDashboard(d);
      setFeedHealth(f);
    } catch (e) {
      console.error('Failed to load market data', e);
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleHalt = async () => {
    setActionLoading('halt');
    try {
      await appApi.admin.market.halt();
      await fetchData();
    } catch (e: any) {
      alert(e.message || 'Failed to halt');
    }
    setActionLoading('');
    setHaltConfirm(false);
  };

  const handleResume = async () => {
    setActionLoading('resume');
    try {
      await appApi.admin.market.resume();
      await fetchData();
    } catch (e: any) {
      alert(e.message || 'Failed to resume');
    }
    setActionLoading('');
    setResumeConfirm(false);
  };

  if (loading) return <Spinner />;

  return (
    <div>
      <PageHeader
        title="Market Dashboard"
        subtitle="Live market overview and trading activity"
        actions={
          <div className="flex gap-2">
            <PermGate perm="market.halt">
              <button onClick={() => setHaltConfirm(true)} className="px-4 py-2 rounded-xl bg-[#ff5d6c]/10 text-[#ff5d6c] hover:bg-[#ff5d6c]/20 text-sm transition-colors">
                Halt Trading
              </button>
            </PermGate>
            <PermGate perm="market.resume">
              <button onClick={() => setResumeConfirm(true)} className="px-4 py-2 rounded-xl bg-[#39ff8b]/10 text-[#39ff8b] hover:bg-[#39ff8b]/20 text-sm transition-colors">
                Resume Trading
              </button>
            </PermGate>
            <button onClick={fetchData} className="px-4 py-2 rounded-xl bg-[var(--surface)] hover:bg-[var(--border)] text-sm transition-colors">
              Refresh
            </button>
          </div>
        }
      />

      {/* Market Stats */}
      {dashboard && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard label="Total Volume (24h)" value={`$${(dashboard.totalVolume24h || 0).toLocaleString()}`} icon="📊" color="#39ff8b" />
          <StatCard label="Open Positions" value={dashboard.openPositions || 0} icon="📈" color="#66b2ff" />
          <StatCard label="Active Symbols" value={dashboard.activeSymbols || 0} icon="🔧" color="#ffd166" />
          <StatCard label="Trades Today" value={dashboard.tradesToday || 0} icon="📉" color="#39ff8b" />
        </div>
      )}

      {/* Symbol Activity */}
      {dashboard?.symbols && (
        <div className="glass rounded-xl p-6 mb-8">
          <h2 className="font-semibold text-lg mb-4">Symbol Activity</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted border-b border-[var(--border)]">
                  <th className="pb-3 pr-4">Symbol</th>
                  <th className="pb-3 pr-4">Volume</th>
                  <th className="pb-3 pr-4">Trades</th>
                  <th className="pb-3 pr-4">Open Positions</th>
                  <th className="pb-3">Exposure</th>
                </tr>
              </thead>
              <tbody>
                {dashboard.symbols.map((s: any) => (
                  <tr key={s.name || s.symbol} className="border-b border-[var(--border)] last:border-0">
                    <td className="py-3 pr-4 font-medium">{s.name || s.symbol}</td>
                    <td className="py-3 pr-4 text-muted">${(s.volume || 0).toLocaleString()}</td>
                    <td className="py-3 pr-4">{s.trades || 0}</td>
                    <td className="py-3 pr-4">{s.openPositions || 0}</td>
                    <td className="py-3">${(s.exposure || 0).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Feed Health */}
      {feedHealth && (
        <div className="glass rounded-xl p-6">
          <h2 className="font-semibold text-lg mb-4">Feed Provider Health</h2>
          {Array.isArray(feedHealth) && feedHealth.length > 0 ? (
            <div className="space-y-3">
              {feedHealth.map((p: any) => (
                <div key={p.name || p._id} className="flex items-center justify-between py-2 border-b border-[var(--border)] last:border-0">
                  <div className="flex items-center gap-3">
                    <div className={`w-2.5 h-2.5 rounded-full ${p.healthStatus === 'HEALTHY' ? 'bg-[#39ff8b]' : p.healthStatus === 'DEGRADED' ? 'bg-[#ffd166]' : 'bg-[#ff5d6c]'}`} />
                    <div>
                      <p className="text-sm font-medium">{p.name}</p>
                      <p className="text-xs text-muted">{p.type} | Priority: {p.priority || '-'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <StatusBadge status={p.healthStatus || 'UNKNOWN'} />
                    {p.lastCheckAt && <p className="text-xs text-muted mt-1">{new Date(p.lastCheckAt).toLocaleString()}</p>}
                  </div>
                </div>
              ))}
            </div>
          ) : feedHealth.providers ? (
            <div className="space-y-3">
              {feedHealth.providers.map((p: any) => (
                <div key={p.name || p._id} className="flex items-center justify-between py-2 border-b border-[var(--border)] last:border-0">
                  <div className="flex items-center gap-3">
                    <div className={`w-2.5 h-2.5 rounded-full ${p.healthStatus === 'HEALTHY' ? 'bg-[#39ff8b]' : p.healthStatus === 'DEGRADED' ? 'bg-[#ffd166]' : 'bg-[#ff5d6c]'}`} />
                    <div>
                      <p className="text-sm font-medium">{p.name}</p>
                      <p className="text-xs text-muted">{p.type}</p>
                    </div>
                  </div>
                  <StatusBadge status={p.healthStatus || 'UNKNOWN'} />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted text-center py-8">No feed provider data available</p>
          )}
        </div>
      )}

      {/* Halt Confirm */}
      <ConfirmDialog
        open={haltConfirm}
        onClose={() => setHaltConfirm(false)}
        onConfirm={handleHalt}
        title="Halt Trading"
        message="This will immediately halt all trading across the platform. Open positions will remain open but no new orders can be placed. Are you sure?"
        confirmText="Halt All Trading"
        danger
      />

      {/* Resume Confirm */}
      <ConfirmDialog
        open={resumeConfirm}
        onClose={() => setResumeConfirm(false)}
        onConfirm={handleResume}
        title="Resume Trading"
        message="This will resume trading across the platform. All halted symbols will be re-enabled."
        confirmText="Resume Trading"
      />
    </div>
  );
}
