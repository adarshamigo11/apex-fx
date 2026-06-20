'use client';
import { useEffect, useState, useCallback } from 'react';
import { appApi } from '@/lib/appApi';
import { PageHeader, StatusBadge, Spinner, Pagination, FilterTabs } from '@/components/admin';

const TYPE_TABS = [
  { value: '', label: 'All' },
  { value: 'LOGIN_FAILED', label: 'Failed Logins' },
  { value: 'SUSPICIOUS_IP', label: 'Suspicious IP' },
  { value: 'PASSWORD_CHANGE', label: 'Password Changes' },
  { value: '2FA_TOGGLE', label: '2FA Changes' },
  { value: 'ACCOUNT_LOCKED', label: 'Account Locked' },
];

export default function AdminSecurityEventsPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('');
  const [search, setSearch] = useState('');
  const limit = 20;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { page, limit };
      if (typeFilter) params.type = typeFilter;
      if (search.trim()) params.q = search.trim();
      const data = await appApi.admin.securityEvents.list(params);
      setEvents(data.items || []);
      setTotal(data.total || 0);
    } catch (e) {
      console.error('Failed to load security events', e);
    }
    setLoading(false);
  }, [page, typeFilter, search]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div>
      <PageHeader
        title="Security Events"
        subtitle={`${total} security events logged`}
      />

      <FilterTabs tabs={TYPE_TABS} active={typeFilter} onChange={(v) => { setTypeFilter(v); setPage(1); }} />

      <div className="glass rounded-xl p-4 mt-4 mb-6">
        <input
          type="text"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search by user ID..."
          className="w-full sm:w-72 px-4 py-2.5 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-sm focus:outline-none focus:border-[#39ff8b]"
        />
      </div>

      <div className="glass rounded-xl overflow-hidden">
        {loading ? (
          <Spinner />
        ) : events.length === 0 ? (
          <p className="text-center text-muted py-12">No security events</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted border-b border-[var(--border)]">
                  <th className="p-4">Timestamp</th>
                  <th className="p-4">Type</th>
                  <th className="p-4">User</th>
                  <th className="p-4">IP Address</th>
                  <th className="p-4">Description</th>
                </tr>
              </thead>
              <tbody>
                {events.map((e: any) => (
                  <tr key={e._id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface)]">
                    <td className="p-4 text-xs text-muted whitespace-nowrap">{new Date(e.createdAt).toLocaleString()}</td>
                    <td className="p-4">
                      <span className={`text-xs px-2 py-1 rounded font-medium ${
                        e.type === 'LOGIN_FAILED' ? 'bg-[#ff5d6c]/10 text-[#ff5d6c]' :
                        e.type === 'SUSPICIOUS_IP' ? 'bg-[#ffd166]/10 text-[#ffd166]' :
                        e.type === 'ACCOUNT_LOCKED' ? 'bg-[#ff5d6c]/15 text-[#ff5d6c]' :
                        'bg-[var(--surface)] text-muted'
                      }`}>{e.type}</span>
                    </td>
                    <td className="p-4 text-xs font-mono">{String(e.userId).slice(0, 10)}...</td>
                    <td className="p-4 text-xs font-mono text-muted">{e.ip || '-'}</td>
                    <td className="p-4 text-xs text-muted truncate max-w-xs">{e.description || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Pagination page={page} totalPages={totalPages} onChange={setPage} />
      </div>
    </div>
  );
}
