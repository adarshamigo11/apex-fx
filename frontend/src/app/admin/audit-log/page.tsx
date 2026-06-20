'use client';
import { useEffect, useState, useCallback } from 'react';
import { appApi } from '@/lib/appApi';

const ACTION_COLORS: Record<string, string> = {
  'user.status': 'bg-blue-500/10 text-blue-400',
  'kyc.decision': 'bg-[#ffd166]/10 text-[#ffd166]',
  'withdrawal.decision': 'bg-purple-500/10 text-purple-400',
  'balance.adjust': 'bg-[#39ff8b]/10 text-[#39ff8b]',
  'symbol.update': 'bg-cyan-500/10 text-cyan-400',
};

const ACTION_TYPES = ['', 'user.status', 'kyc.decision', 'withdrawal.decision', 'balance.adjust', 'symbol.update', 'employee.create', 'employee.suspend', 'role.update', 'wallet.credit', 'wallet.debit', 'market.halt', 'market.resume', 'approval.decide'];

export default function AdminAuditLogPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const limit = 20;

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const data = await appApi.admin.auditLog.list({ page, limit });
      let items = data.items || [];
      if (actionFilter) {
        items = items.filter((l: any) => l.action === actionFilter);
      }
      setLogs(items);
      setTotal(data.total || 0);
    } catch (e) {
      console.error('Failed to load audit log', e);
    }
    setLoading(false);
  }, [page, actionFilter]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Audit Log</h1>
          <p className="text-muted">{total} admin actions recorded</p>
        </div>
        <button
          onClick={async () => {
            try {
              const data = await appApi.admin.auditLog.export({ action: actionFilter });
              const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.json`;
              a.click();
              URL.revokeObjectURL(url);
            } catch (e: any) {
              alert(e.message || 'Export failed');
            }
          }}
          className="px-4 py-2 rounded-xl bg-[var(--surface)] hover:bg-[var(--border)] text-sm transition-colors self-start"
        >
          Export JSON
        </button>
      </div>

      {/* Filter */}
      <div className="glass rounded-xl p-4 flex flex-col sm:flex-row gap-4">
        <select
          value={actionFilter}
          onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
          className="px-4 py-2 rounded-lg bg-[var(--bg)] border border-[var(--border)] focus:outline-none"
        >
          <option value="">All Actions</option>
          {ACTION_TYPES.filter(Boolean).map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
        <input
          type="text"
          placeholder="Search by actor ID..."
          className="flex-1 px-4 py-2 rounded-lg bg-[var(--bg)] border border-[var(--border)] focus:outline-none focus:border-[#39ff8b]"
        />
      </div>

      {/* Table */}
      <div className="glass rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin w-6 h-6 border-2 border-[#39ff8b] border-t-transparent rounded-full" />
          </div>
        ) : logs.length === 0 ? (
          <p className="text-center text-muted py-12">No audit log entries</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted border-b border-[var(--border)]">
                  <th className="p-4">Timestamp</th>
                  <th className="p-4">Admin</th>
                  <th className="p-4">Action</th>
                  <th className="p-4">Target</th>
                  <th className="p-4">Details</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log: any) => (
                  <>
                    <tr
                      key={log._id}
                      onClick={() => setExpandedId(expandedId === log._id ? null : log._id)}
                      className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface)] cursor-pointer"
                    >
                      <td className="p-4 text-muted whitespace-nowrap text-xs">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="p-4 text-xs font-mono">
                        {String(log.actorId).slice(0, 10)}...
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${ACTION_COLORS[log.action] || 'bg-gray-500/10 text-gray-400'}`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="p-4 text-muted text-xs">
                        {log.targetType}
                        {log.targetId && ` #${String(log.targetId).slice(0, 8)}`}
                      </td>
                      <td className="p-4 text-muted text-xs truncate max-w-xs">
                        {log.meta ? JSON.stringify(log.meta).slice(0, 60) : '-'}
                      </td>
                    </tr>
                    {expandedId === log._id && (
                      <tr key={`${log._id}-expand`} className="border-b border-[var(--border)]">
                        <td colSpan={5} className="p-4 bg-[var(--surface)]">
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm mb-4">
                            <div>
                              <p className="text-muted">Actor ID</p>
                              <p className="font-mono text-xs break-all">{log.actorId}</p>
                            </div>
                            <div>
                              <p className="text-muted">Action</p>
                              <p className="font-medium">{log.action}</p>
                            </div>
                            <div>
                              <p className="text-muted">Target Type</p>
                              <p>{log.targetType}</p>
                            </div>
                            {log.targetId && (
                              <div>
                                <p className="text-muted">Target ID</p>
                                <p className="font-mono text-xs break-all">{log.targetId}</p>
                              </div>
                            )}
                            <div>
                              <p className="text-muted">Timestamp</p>
                              <p>{new Date(log.createdAt).toLocaleString()}</p>
                            </div>
                          </div>
                          {log.meta && (
                            <div>
                              <p className="text-muted text-sm mb-2">Metadata</p>
                              <pre className="p-3 rounded-lg bg-[var(--bg)] text-xs overflow-x-auto max-h-48">
                                {JSON.stringify(log.meta, null, 2)}
                              </pre>
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

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-[var(--border)]">
            <p className="text-sm text-muted">Page {page} of {totalPages}</p>
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1 rounded-lg bg-[var(--surface)] hover:bg-[var(--border)] disabled:opacity-50">
                Previous
              </button>
              <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="px-3 py-1 rounded-lg bg-[var(--surface)] hover:bg-[var(--border)] disabled:opacity-50">
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
