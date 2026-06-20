'use client';

import { useEffect, useState } from 'react';
import { appApi } from '../../lib/appApi';

const TABS = ['Deposit', 'Withdraw', 'Transfer', 'Transactions'] as const;
type Tab = typeof TABS[number];

const MOCK_TXS = [
  { id: '1', type: 'Deposit', amount: 5000, date: '2025-01-10', status: 'Completed' },
  { id: '2', type: 'Withdrawal', amount: -1000, date: '2025-01-08', status: 'Completed' },
  { id: '3', type: 'Transfer', amount: -500, date: '2025-01-06', status: 'Completed' },
  { id: '4', type: 'Deposit', amount: 10000, date: '2025-01-03', status: 'Completed' },
  { id: '5', type: 'Withdrawal', amount: -2000, date: '2024-12-29', status: 'Pending' },
];

export default function WalletPage() {
  const [tab, setTab] = useState<Tab>('Deposit');
  const [wallet, setWallet] = useState<any>(null);
  const [amount, setAmount] = useState('');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    appApi.loadTokens();
    appApi.wallet().then(setWallet).catch(() => setWallet(null));
  }, []);

  const handleDeposit = async () => {
    if (!amount) return;
    setMsg('');
    try {
      await appApi.deposit(parseFloat(amount));
      setMsg('Deposit successful!');
      setAmount('');
      appApi.wallet().then(setWallet);
    } catch { setMsg('Deposit failed'); }
  };

  const handleWithdraw = async () => {
    if (!amount) return;
    setMsg('');
    try {
      await appApi.withdraw(parseFloat(amount));
      setMsg('Withdrawal successful!');
      setAmount('');
      appApi.wallet().then(setWallet);
    } catch { setMsg('Withdrawal failed'); }
  };

  return (
    <main className="min-h-screen p-4 sm:p-6 max-w-4xl mx-auto">
      <header className="mb-6">
        <h1 className="text-xl font-bold">Wallet</h1>
        <p className="text-xs text-muted">Manage your funds</p>
      </header>

      {/* Balance Card */}
      <section className="glass rounded-2xl p-5 mb-6 flex flex-wrap items-center gap-6">
        <div>
          <p className="text-xs text-muted uppercase">Available Balance</p>
          <p className="text-2xl font-bold text-neon">${(wallet?.balance ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
        </div>
        <div>
          <p className="text-xs text-muted uppercase">Equity</p>
          <p className="text-lg font-semibold">${(wallet?.equity ?? wallet?.balance ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
        </div>
        <div>
          <p className="text-xs text-muted uppercase">Credit</p>
          <p className="text-lg font-semibold">${(wallet?.credit ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
        </div>
      </section>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-[var(--border)] mb-6 overflow-x-auto">
        {TABS.map(t => (
          <button key={t} onClick={() => { setTab(t); setMsg(''); setAmount(''); }}
            className={`px-4 py-2 text-sm whitespace-nowrap ${tab === t ? 'tab-active font-medium' : 'tab-inactive'}`}
          >{t}</button>
        ))}
      </div>

      {/* Tab Content */}
      {tab === 'Deposit' && (
        <section className="glass rounded-xl p-5 max-w-md">
          <h2 className="text-sm font-semibold mb-3">Deposit Funds</h2>
          <p className="text-xs text-muted mb-4">Add funds to your wallet instantly</p>
          <div className="space-y-3">
            <div className="grid grid-cols-4 gap-2">
              {[100, 500, 1000, 5000].map(v => (
                <button key={v} onClick={() => setAmount(String(v))} className="glass rounded-lg py-2 text-xs font-medium hover:bg-neon/10">${v}</button>
              ))}
            </div>
            <input type="number" placeholder="Custom amount" value={amount} onChange={e => setAmount(e.target.value)}
              className="w-full glass rounded-lg px-4 py-2.5 text-sm outline-none" />
            <button onClick={handleDeposit} className="w-full bg-neon text-black font-semibold rounded-lg py-2.5 text-sm hover:opacity-90 transition">
              Deposit
            </button>
            {msg && <p className="text-xs text-center text-neon">{msg}</p>}
          </div>
        </section>
      )}

      {tab === 'Withdraw' && (
        <section className="glass rounded-xl p-5 max-w-md">
          <h2 className="text-sm font-semibold mb-3">Withdraw Funds</h2>
          <p className="text-xs text-muted mb-4">Withdraw to your linked bank account</p>
          <div className="space-y-3">
            <input type="number" placeholder="Amount to withdraw" value={amount} onChange={e => setAmount(e.target.value)}
              className="w-full glass rounded-lg px-4 py-2.5 text-sm outline-none" />
            <button onClick={handleWithdraw} className="w-full bg-loss text-white font-semibold rounded-lg py-2.5 text-sm hover:opacity-90 transition">
              Withdraw
            </button>
            {msg && <p className="text-xs text-center text-loss">{msg}</p>}
          </div>
        </section>
      )}

      {tab === 'Transfer' && (
        <section className="glass rounded-xl p-5 max-w-md">
          <h2 className="text-sm font-semibold mb-3">Transfer Between Accounts</h2>
          <p className="text-xs text-muted mb-4">Move funds between your trading accounts</p>
          <div className="space-y-3">
            <select className="w-full glass rounded-lg px-4 py-2.5 text-sm outline-none bg-transparent">
              <option value="">From Account</option>
              <option>Main Wallet</option>
              <option>Standard Account</option>
              <option>Demo Account</option>
            </select>
            <select className="w-full glass rounded-lg px-4 py-2.5 text-sm outline-none bg-transparent">
              <option value="">To Account</option>
              <option>Main Wallet</option>
              <option>Standard Account</option>
              <option>Demo Account</option>
            </select>
            <input type="number" placeholder="Amount" value={amount} onChange={e => setAmount(e.target.value)}
              className="w-full glass rounded-lg px-4 py-2.5 text-sm outline-none" />
            <button className="w-full bg-gold text-black font-semibold rounded-lg py-2.5 text-sm hover:opacity-90 transition">
              Transfer
            </button>
          </div>
        </section>
      )}

      {tab === 'Transactions' && (
        <section className="glass rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[var(--border)] text-muted">
                  <th className="text-left p-3 font-medium">Date</th>
                  <th className="text-left p-3 font-medium">Type</th>
                  <th className="text-right p-3 font-medium">Amount</th>
                  <th className="text-right p-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {MOCK_TXS.map(tx => (
                  <tr key={tx.id} className="border-b border-[var(--border)] last:border-0">
                    <td className="p-3 text-muted">{tx.date}</td>
                    <td className="p-3">{tx.type}</td>
                    <td className={`p-3 text-right font-medium ${tx.amount > 0 ? 'text-neon' : 'text-loss'}`}>
                      {tx.amount > 0 ? '+' : ''}${Math.abs(tx.amount).toLocaleString()}
                    </td>
                    <td className="p-3 text-right">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] ${tx.status === 'Completed' ? 'bg-neon/10 text-neon' : 'bg-gold/10 text-gold'}`}>
                        {tx.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </main>
  );
}
