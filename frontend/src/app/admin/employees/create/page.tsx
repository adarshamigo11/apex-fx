'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { appApi } from '@/lib/appApi';
import { PageHeader } from '@/components/admin';

const ROLES = [
  'ADMIN', 'OPERATIONS_MANAGER', 'FINANCE_MANAGER', 'RISK_MANAGER', 'COMPLIANCE_OFFICER',
  'SUPPORT_MANAGER', 'SUPPORT_AGENT', 'SALES_MANAGER', 'SALES_AGENT', 'AFFILIATE_MANAGER',
  'MARKETING_MANAGER', 'AUDITOR', 'READ_ONLY_ANALYST',
];

const DEPARTMENTS = ['Operations', 'Finance', 'Risk', 'Compliance', 'Support', 'Sales', 'Marketing', 'IT', 'HR'];

export default function CreateEmployeePage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: '', password: '', firstName: '', lastName: '', roleName: 'SUPPORT_AGENT', department: 'Support', title: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await appApi.admin.employees.create(form);
      router.push('/admin/employees');
    } catch (e: any) {
      setError(e.message || 'Failed to create employee');
    }
    setLoading(false);
  };

  return (
    <div className="max-w-2xl">
      <PageHeader title="Create Employee" subtitle="Add a new team member" />

      <form onSubmit={submit} className="glass rounded-xl p-6 space-y-5">
        {error && <div className="p-3 rounded-xl bg-[#ff5d6c]/10 text-[#ff5d6c] text-sm">{error}</div>}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-muted uppercase tracking-wide block mb-1.5">First Name</label>
            <input required value={form.firstName} onChange={e => setForm({ ...form, firstName: e.target.value })} className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-sm focus:outline-none focus:border-[#39ff8b]" />
          </div>
          <div>
            <label className="text-xs text-muted uppercase tracking-wide block mb-1.5">Last Name</label>
            <input required value={form.lastName} onChange={e => setForm({ ...form, lastName: e.target.value })} className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-sm focus:outline-none focus:border-[#39ff8b]" />
          </div>
        </div>

        <div>
          <label className="text-xs text-muted uppercase tracking-wide block mb-1.5">Email</label>
          <input type="email" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-sm focus:outline-none focus:border-[#39ff8b]" />
        </div>

        <div>
          <label className="text-xs text-muted uppercase tracking-wide block mb-1.5">Password (min 8 chars)</label>
          <input type="password" required minLength={8} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-sm focus:outline-none focus:border-[#39ff8b]" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-muted uppercase tracking-wide block mb-1.5">Role</label>
            <select value={form.roleName} onChange={e => setForm({ ...form, roleName: e.target.value })} className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-sm focus:outline-none focus:border-[#39ff8b]">
              {ROLES.map(r => <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted uppercase tracking-wide block mb-1.5">Department</label>
            <select value={form.department} onChange={e => setForm({ ...form, department: e.target.value })} className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-sm focus:outline-none focus:border-[#39ff8b]">
              {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="text-xs text-muted uppercase tracking-wide block mb-1.5">Job Title</label>
          <input required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. Senior Support Agent" className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-sm focus:outline-none focus:border-[#39ff8b]" />
        </div>

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={() => router.back()} className="px-6 py-2.5 rounded-xl bg-[var(--surface)] text-sm hover:bg-[var(--border)] transition-colors">Cancel</button>
          <button type="submit" disabled={loading} className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#39ff8b] to-[#ffd166] text-[#0a0e1a] text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity">
            {loading ? 'Creating...' : 'Create Employee'}
          </button>
        </div>
      </form>
    </div>
  );
}
