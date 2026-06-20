'use client';
import { useEffect, useState } from 'react';
import { appApi } from '@/lib/appApi';
import { PageHeader, StatusBadge, FilterTabs, Spinner, Pagination, PermGate } from '@/components/admin';

const TABS = [
  { value: '', label: 'All' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
];

export default function AdminDepositsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [actionLoading, setActionLoading] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await appApi.admin.deposits.list(tab || undefined);
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('Failed to load deposits', e);
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [tab]);

  const handleDecision = async (id: string, decision: 'APPROVED' | 'REJECTED') => {
    setActionLoading(id);
    try {
      await appApi.admin.deposits.decide(id, decision, note || undefined);
      setNote('');
      setExpandedId(null);
      await fetchData();
    } catch (e: any) {
      alert(e.message || 'Failed');
    }
    setActionLoading('');
  };

  const pendingCount = items.filter(i => i.status === 'PENDING').length;

  return (
    <div>
      <PageHeader
        title="Deposits"
        subtitle={`${items.length} deposit requests${pendingCount ? `, ${pendingCount} pending` : ''}`}
      />

      <FilterTabs tabs={TABS} active={tab} onChange={setTab} />

      <div className="glass rounded-xl overflow-hidden mt-6">
        {loading ? (
          <Spinner />
        ) : items.length === 0 ? (
          <p className="text-center text-muted py-12">No deposit requests</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted border-b border-[var(--border)]">
                  <th className="p-4">User ID</th>
                  <th className="p-4">Amount</th>
                  <th className="p-4">Method</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Date</th>
                  <th className="p-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((d: any) => (
                  <>
                    <tr
                      key={d._id}
                      onClick={() => setExpandedId(expandedId === d._id ? null : d._id)}
                      className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface)] cursor-pointer"
                    >
                      <td className="p-4 text-xs font-mono">{String(d.userId).slice(0, 10)}...</td>
                      <td className="p-4 font-medium text-[#39ff8b]">${Number(d.amount).toFixed(2)}</td>
                      <td className="p-4 text-muted">{d.method || d.paymentMethod || '-'}</td>
                      <td className="p-4"><StatusBadge status={d.status} /></td>
                      <td className="p-4 text-muted whitespace-nowrap">{new Date(d.createdAt).toLocaleDateString()}</td>
                      <td className="p-4">
                        {d.status === 'PENDING' && (
                          <span className="text-[#ffd166] text-xs">Pending review</span>
                        )}
                      </td>
                    </tr>
                    {expandedId === d._id && (
                      <tr key={`${d._id}-expand`} className="border-b border-[var(--border)]">
                        <td colSpan={6} className="p-4 bg-[var(--surface)]">
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm mb-4">
                            <div>
                              <p className="text-muted">User ID</p>
                              <p className="font-mono text-xs break-all">{d.userId}</p>
                            </div>
                            <div>
                              <p className="text-muted">Amount</p>
                              <p className="font-medium text-lg text-[#39ff8b]">${Number(d.amount).toFixed(2)} {d.currency || 'USD'}</p>
                            </div>
                            <div>
                              <p className="text-muted">Transaction ID</p>
                              <p className="font-mono text-xs">{d.transactionId || d._id}</p>
                            </div>
                            <div>
                              <p className="text-muted">Method</p>
                              <p>{d.method || d.paymentMethod || 'N/A'}</p>
                            </div>
                            <div>
                              <p className="text-muted">Last Updated</p>
                              <p>{new Date(d.updatedAt).toLocaleString()}</p>
                            </div>
                            {d.reviewNote && (
                              <div>
                                <p className="text-muted">Review Note</p>
                                <p>{d.reviewNote}</p>
                              </div>
                            )}
                          </div>
                          {d.status === 'PENDING' && (
                            <PermGate perm="deposit.approve">
                              <div className="flex flex-col sm:flex-row gap-3">
                                <input
                                  type="text"
                                  value={note}
                                  onChange={(e) => setNote(e.target.value)}
                                  placeholder="Note (optional)"
                                  className="flex-1 px-3 py-2 rounded-lg bg-[var(--bg)] border border-[var(--border)] text-sm focus:outline-none focus:border-[#39ff8b]"
                                />
                                <button
                                  onClick={() => handleDecision(d._id, 'APPROVED')}
                                  disabled={actionLoading === d._id}
                                  className="px-4 py-2 rounded-lg bg-[#39ff8b]/10 text-[#39ff8b] hover:bg-[#39ff8b]/20 text-sm font-medium"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => handleDecision(d._id, 'REJECTED')}
                                  disabled={actionLoading === d._id}
                                  className="px-4 py-2 rounded-lg bg-[#ff5d6c]/10 text-[#ff5d6c] hover:bg-[#ff5d6c]/20 text-sm font-medium"
                                >
                                  Reject
                                </button>
                              </div>
                            </PermGate>
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
