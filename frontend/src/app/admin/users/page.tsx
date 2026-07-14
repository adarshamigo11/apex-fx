'use client';
import { useEffect, useState, useCallback } from 'react';
import { appApi } from '@/lib/appApi';
import Link from 'next/link';

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-[#39ff8b]/10 text-[#39ff8b]',
  PENDING: 'bg-[#ffd166]/10 text-[#ffd166]',
  SUSPENDED: 'bg-[#ff5d6c]/10 text-[#ff5d6c]',
  BANNED: 'bg-[#ff5d6c]/20 text-[#ff5d6c]',
  FROZEN: 'bg-[#66b2ff]/10 text-[#66b2ff]',
  RESTRICTED: 'bg-[#ffd166]/15 text-[#ffd166]',
  TERMINATED: 'bg-[#ff5d6c]/20 text-[#ff5d6c]',
};

const ROLE_COLORS: Record<string, string> = {
  SUPER_ADMIN: 'bg-purple-500/10 text-purple-400',
  ADMIN: 'bg-blue-500/10 text-blue-400',
  MANAGER: 'bg-cyan-500/10 text-cyan-400',
  EMPLOYEE: 'bg-green-500/10 text-green-400',
  IB: 'bg-orange-500/10 text-orange-400',
  USER: 'bg-gray-500/10 text-gray-400',
};

export default function AdminUsersPage() {
  // Load tokens from localStorage into module-level variables
  // so that API calls include the Authorization header
  appApi.loadTokens();
  const [users, setUsers] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const limit = 20;

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { page, limit };
      if (search.trim()) params.q = search.trim();
      if (statusFilter) params.status = statusFilter;
      const data = await appApi.admin.users.list(params);
      setUsers(data.items || []);
      setTotal(data.total || 0);
    } catch (e) {
      console.error('Failed to load users', e);
    }
    setLoading(false);
  }, [page, search, statusFilter]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Users</h1>
          <p className="text-muted">{total} total users</p>
        </div>
      </div>

      {/* Filters */}
      <div className="glass rounded-xl p-4 flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search by email or name..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full px-4 py-2 rounded-lg bg-[var(--bg)] border border-[var(--border)] focus:outline-none focus:border-[#39ff8b]"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="px-4 py-2 rounded-lg bg-[var(--bg)] border border-[var(--border)] focus:outline-none"
        >
          <option value="">All Statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="PENDING">Pending</option>
          <option value="SUSPENDED">Suspended</option>
          <option value="FROZEN">Frozen</option>
          <option value="RESTRICTED">Restricted</option>
          <option value="BANNED">Banned</option>
          <option value="TERMINATED">Terminated</option>
        </select>
      </div>

      {/* Table */}
      <div className="glass rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin w-6 h-6 border-2 border-[#39ff8b] border-t-transparent rounded-full" />
          </div>
        ) : users.length === 0 ? (
          <p className="text-center text-muted py-12">No users found</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted border-b border-[var(--border)]">
                  <th className="p-4">User</th>
                  <th className="p-4">Email</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Role</th>
                  <th className="p-4">2FA</th>
                  <th className="p-4">Created</th>
                  <th className="p-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user: any) => (
                  <tr key={user._id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface)]">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#39ff8b] to-[#ffd166] flex items-center justify-center text-xs font-bold text-[#0a0e1a]">
                          {(user.firstName?.charAt(0) || user.email?.charAt(0) || '?').toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium">{user.firstName} {user.lastName}</p>
                          <p className="text-xs text-muted">ID: {String(user._id).slice(0, 8)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-muted">{user.email}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${STATUS_COLORS[user.status] || ''}`}>
                        {user.status}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${ROLE_COLORS[user.roleName] || ''}`}>
                        {user.roleName}
                      </span>
                    </td>
                    <td className="p-4">
                      {user.twoFactorEnabled ? (
                        <span className="text-[#39ff8b]">On</span>
                      ) : (
                        <span className="text-muted">Off</span>
                      )}
                    </td>
                    <td className="p-4 text-muted whitespace-nowrap">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="p-4">
                      <Link href={`/admin/users/${user._id}`} className="text-[#39ff8b] hover:underline text-sm">
                        View
                      </Link>
                    </td>
                  </tr>
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
              <button
                disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}
                className="px-3 py-1 rounded-lg bg-[var(--surface)] hover:bg-[var(--border)] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(p => p + 1)}
                className="px-3 py-1 rounded-lg bg-[var(--surface)] hover:bg-[var(--border)] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
