'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { appApi } from '../../lib/appApi';

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: '', password: '', firstName: '', lastName: '' });
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await appApi.register(form);
      setOk('Account created. Please sign in.');
      setTimeout(() => router.push('/login'), 900);
    } catch (e: any) {
      setError(e.message || 'Registration failed');
    }
  };

  return (
    <main className="min-h-screen p-4 max-w-md mx-auto flex items-center">
      <form onSubmit={submit} className="glass rounded-2xl p-5 w-full space-y-3">
        <h1 className="text-xl font-bold">Create account</h1>
        <input className="w-full rounded-xl border px-3 py-2" value={form.firstName} onChange={(e)=>setForm({...form, firstName: e.target.value})} placeholder="First name" />
        <input className="w-full rounded-xl border px-3 py-2" value={form.lastName} onChange={(e)=>setForm({...form, lastName: e.target.value})} placeholder="Last name" />
        <input className="w-full rounded-xl border px-3 py-2" value={form.email} onChange={(e)=>setForm({...form, email: e.target.value})} placeholder="Email" />
        <input className="w-full rounded-xl border px-3 py-2" type="password" value={form.password} onChange={(e)=>setForm({...form, password: e.target.value})} placeholder="Password" />
        {error ? <p className="text-sm text-red-400">{error}</p> : null}
        {ok ? <p className="text-sm text-emerald-400">{ok}</p> : null}
        <button className="w-full rounded-xl bg-emerald-500 text-white py-2" type="submit">Create account</button>
      </form>
    </main>
  );
}
