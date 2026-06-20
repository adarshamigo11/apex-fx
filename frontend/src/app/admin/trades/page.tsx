'use client';
import { useEffect, useState, useCallback } from 'react';
import { appApi } from '@/lib/appApi';

const CLOSE_REASON_COLORS: Record<string, string> = {
  MANUAL: 'bg-gray-500/10 text-gray-400',
  STOP_LOSS: 'bg-[#ff5d6c]/10 text-[#ff5d6c]',
  TAKE_PROFIT: 'bg-[#39ff8b]/10 text-[#39ff8b]',
  STOP_OUT: 'bg-[#ffd166]/10 text-[#ffd166]',
  ADMIN: 'bg-purple-500/10 text-purple-400',
};

export default function AdminTradesPage() {
  const [trades, setTrades] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [userSearch, setUserSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const limit = 20;

  const fetchTrades = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { page, limit };
      const data = await appApi.admin.trades.list(params);
      setTrades(data.items || []);
      setTotal(data.total || 0);
    } catch (e) {
      console.error('Failed to load trades', e);
    }
    setLoading(false);
  }, [page]);

  useEffect(() => { fetchTrades(); }, [fetchTrades]);

  const totalPages = Math.ceil(total / limit);

  const filteredTrades = userSearch.trim()
    ? trades.filter((t: any) =>
        String(t.accountLogin || '').toLowerCase().includes(userSearch.toLowerCase()) ||
        String(t.symbolName || '').toLowerCase().includes(userSearch.toLowerCase())
      )
    : trades;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Trade History</h1>
        <p className="text-muted">{total} total trades</p>
      </div>

      {/* Search */}
      <div className="glass rounded-xl p-4">
        <input
          type="text"
          placeholder="Search by account login or symbol..."
          value={userSearch}
          onChange={(e) => setUserSearch(e.target.value)}
          className="w-full px-4 py-2 rounded-lg bg-[var(--bg)] border border-[var(--border)] focus:outline-none focus:border-[#39ff8b]"
        />
      </div>

      {/* Table */}
      <div className="glass rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin w-6 h-6 border-2 border-[#39ff8b] border-t-transparent rounded-full" />
          </div>
        ) : filteredTrades.length === 0 ? (
          <p className="text-center text-muted py-12">No trades found</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted border-b border-[var(--border)]">
                  <th className="p-4">Ticket</th>
                  <th className="p-4">Account</th>
                  <th className="p-4">Symbol</th>
                  <th className="p-4">Side</th>
                  <th className="p-4">Lots</th>
                  <th className="p-4">Open</th>
                  <th className="p-4">Close</th>
                  <th className="p-4">Profit</th>
                  <th className="p-4">Reason</th>
                  <th className="p-4">Closed</th>
                </tr>
              </thead>
              <tbody>
                {filteredTrades.map((t: any) => (
                  <>
                    <tr
                      key={t._id || t.ticket}
                      onClick={() => setExpandedId(expandedId === t._id ? null : t._id)}
                      className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface)] cursor-pointer"
                    >
                      <td className="p-4 font-mono text-xs">#{t.ticket}</td>
                      <td className="p-4">{t.accountLogin || '-'}</td>
                      <td className="p-4 font-medium">{t.symbolName}</td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${t.side === 'BUY' ? 'bg-[#39ff8b]/10 text-[#39ff8b]' : 'bg-[#ff5d6c]/10 text-[#ff5d6c]'}`}>
                          {t.side}
                        </span>
                      </td>
                      <td className="p-4">{t.lots}</td>
                      <td className="p-4">{t.openPrice}</td>
                      <td className="p-4">{t.closePrice}</td>
                      <td className="p-4">
                        <span className={t.profit >= 0 ? 'text-[#39ff8b]' : 'text-[#ff5d6c]'}>
                          {t.profit >= 0 ? '+' : ''}{Number(t.profit).toFixed(2)}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${CLOSE_REASON_COLORS[t.closeReason] || ''}`}>
                          {t.closeReason}
                        </span>
                      </td>
                      <td className="p-4 text-muted whitespace-nowrap">
                        {new Date(t.closeTime).toLocaleString()}
                      </td>
                    </tr>
                    {expandedId === t._id && (
                      <tr key={`${t._id}-expand`} className="border-b border-[var(--border)]">
                        <td colSpan={10} className="p-4 bg-[var(--surface)]">
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                            <div>
                              <p className="text-muted">Ticket</p>
                              <p className="font-medium">#{t.ticket}</p>
                            </div>
                            <div>
                              <p className="text-muted">Symbol</p>
                              <p className="font-medium">{t.symbolName}</p>
                            </div>
                            <div>
                              <p className="text-muted">Side</p>
                              <p className="font-medium">{t.side}</p>
                            </div>
                            <div>
                              <p className="text-muted">Lots</p>
                              <p className="font-medium">{t.lots}</p>
                            </div>
                            <div>
                              <p className="text-muted">Open Price</p>
                              <p className="font-medium">{t.openPrice}</p>
                            </div>
                            <div>
                              <p className="text-muted">Close Price</p>
                              <p className="font-medium">{t.closePrice}</p>
                            </div>
                            <div>
                              <p className="text-muted">Profit</p>
                              <p className={`font-medium ${t.profit >= 0 ? 'text-[#39ff8b]' : 'text-[#ff5d6c]'}`}>
                                ${Number(t.profit).toFixed(2)}
                              </p>
                            </div>
                            <div>
                              <p className="text-muted">Commission</p>
                              <p className="font-medium">${Number(t.commission || 0).toFixed(2)}</p>
                            </div>
                            <div>
                              <p className="text-muted">Swap</p>
                              <p className="font-medium">${Number(t.swap || 0).toFixed(2)}</p>
                            </div>
                            <div>
                              <p className="text-muted">Open Time</p>
                              <p className="text-xs">{new Date(t.openTime).toLocaleString()}</p>
                            </div>
                            <div>
                              <p className="text-muted">Close Time</p>
                              <p className="text-xs">{new Date(t.closeTime).toLocaleString()}</p>
                            </div>
                            <div>
                              <p className="text-muted">Close Reason</p>
                              <p className="font-medium">{t.closeReason}</p>
                            </div>
                          </div>
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
