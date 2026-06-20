'use client';
import { useEffect, useState } from 'react';
import { appApi } from '@/lib/appApi';

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-[#ffd166]/10 text-[#ffd166]',
  PROCESSING: 'bg-blue-500/10 text-blue-400',
  APPROVED: 'bg-[#39ff8b]/10 text-[#39ff8b]',
  REJECTED: 'bg-[#ff5d6c]/10 text-[#ff5d6c]',
};

const TABS = ['', 'PENDING', 'APPROVED', 'REJECTED'];

export default function AdminWithdrawalsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [actionLoading, setActionLoading] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await appApi.admin.withdrawals.list(tab || undefined);
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('Failed to load withdrawals', e);
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [tab]);

  const handleDecision = async (id: string, decision: 'APPROVED' | 'REJECTED') => {
    if (decision === 'REJECTED') {
      if (!confirm('Rejecting will refund the amount to the user wallet. Continue?')) return;
    }
    setActionLoading(id);
    try {
      await appApi.admin.withdrawals.decide(id, decision, note || undefined);
      setNote('');
      setExpandedId(null);
      await fetchData();
    } catch (e: any) {
      alert(e.message || 'Failed');
    }
    setActionLoading('');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Withdrawals</h1>
        <p className="text-muted">{items.length} requests</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 glass rounded-xl p-1 w-fit">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t ? 'bg-[#39ff8b]/10 text-[#39ff8b]' : 'text-muted hover:text-[var(--text)]'}`}
          >
            {t || 'All'}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="glass rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin w-6 h-6 border-2 border-[#39ff8b] border-t-transparent rounded-full" />
          </div>
        ) : items.length === 0 ? (
          <p className="text-center text-muted py-12">No withdrawal requests</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted border-b border-[var(--border)]">
                  <th className="p-4">User ID</th>
                  <th className="p-4">Amount</th>
                  <th className="p-4">Currency</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Requested</th>
                  <th className="p-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((w: any) => (
                  <>
                    <tr
                      key={w._id}
                      onClick={() => setExpandedId(expandedId === w._id ? null : w._id)}
                      className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface)] cursor-pointer"
                    >
                      <td className="p-4 text-xs font-mono">{String(w.userId).slice(0, 10)}...</td>
                      <td className="p-4 font-medium">${Number(w.amount).toFixed(2)}</td>
                      <td className="p-4 text-muted">{w.currency || 'USD'}</td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${STATUS_COLORS[w.status] || ''}`}>
                          {w.status}
                        </span>
                      </td>
                      <td className="p-4 text-muted whitespace-nowrap">{new Date(w.createdAt).toLocaleDateString()}</td>
                      <td className="p-4">
                        {w.status === 'PENDING' && (
                          <span className="text-[#ffd166] text-xs">Pending review</span>
                        )}
                      </td>
                    </tr>
                    {expandedId === w._id && (
                      <tr key={`${w._id}-expand`} className="border-b border-[var(--border)]">
                        <td colSpan={6} className="p-4 bg-[var(--surface)]">
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm mb-4">
                            <div>
                              <p className="text-muted">User ID</p>
                              <p className="font-mono text-xs">{w.userId}</p>
                            </div>
                            <div>
                              <p className="text-muted">Amount</p>
                              <p className="font-medium text-lg">${Number(w.amount).toFixed(2)} {w.currency || 'USD'}</p>
                            </div>
                            <div>
                              <p className="text-muted">Last Updated</p>
                              <p>{new Date(w.updatedAt).toLocaleString()}</p>
                            </div>
                            {w.reviewNote && (
                              <div>
                                <p className="text-muted">Review Note</p>
                                <p>{w.reviewNote}</p>
                              </div>
                            )}
                          </div>
                          {w.status === 'PENDING' && (
                            <div className="flex flex-col sm:flex-row gap-3">
                              <input
                                type="text"
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                                placeholder="Note (optional)"
                                className="flex-1 px-3 py-2 rounded-lg bg-[var(--bg)] border border-[var(--border)] text-sm focus:outline-none focus:border-[#39ff8b]"
                              />
                              <button
                                onClick={() => handleDecision(w._id, 'APPROVED')}
                                disabled={actionLoading === w._id}
                                className="px-4 py-2 rounded-lg bg-[#39ff8b]/10 text-[#39ff8b] hover:bg-[#39ff8b]/20 text-sm font-medium"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleDecision(w._id, 'REJECTED')}
                                disabled={actionLoading === w._id}
                                className="px-4 py-2 rounded-lg bg-[#ff5d6c]/10 text-[#ff5d6c] hover:bg-[#ff5d6c]/20 text-sm font-medium"
                              >
                                Reject (Refunds)
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
