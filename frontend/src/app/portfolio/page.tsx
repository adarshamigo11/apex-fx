'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useLivePrices } from '../../lib/useLivePrices';
import { useTheme } from '../../lib/useTheme';
import { appApi } from '../../lib/appApi';

type Tab = 'positions' | 'pending' | 'history' | 'analytics' | 'wallet';

const MOCK_HISTORY = [
  { ticket: 101, symbol: 'EURUSD', side: 'BUY', lots: 0.1, openPrice: 1.0855, closePrice: 1.0878, profit: 23.0, closeTime: '2024-06-12 14:30' },
  { ticket: 102, symbol: 'XAUUSD', side: 'SELL', lots: 0.05, openPrice: 2340.50, closePrice: 2335.20, profit: 26.5, closeTime: '2024-06-11 09:15' },
  { ticket: 103, symbol: 'GBPUSD', side: 'BUY', lots: 0.2, openPrice: 1.2720, closePrice: 1.2705, profit: -30.0, closeTime: '2024-06-10 16:45' },
];

export default function PortfolioPage() {
  const prices = useLivePrices();
  const { theme, toggle } = useTheme();
  const [tab, setTab] = useState<Tab>('positions');
  const [accounts, setAccounts] = useState<any[]>([]);
  const [wallet, setWallet] = useState<any>(null);
  const [activeAccountId, setActiveAccountId] = useState('');

  useEffect(() => {
    appApi.loadTokens();
    appApi.accounts().then((a: any[]) => {
      setAccounts(a);
      if (a.length > 0) setActiveAccountId(a[0]._id);
    }).catch(() => setAccounts([]));
    appApi.wallet().then(setWallet).catch(() => setWallet(null));
  }, []);

  return (
    <main className="min-h-screen p-3 sm:p-4 max-w-5xl mx-auto">
      <header className="flex items-center justify-between py-2 mb-3">
        <div>
          <h1 className="text-lg font-bold">Portfolio</h1>
          <p className="text-[10px] text-muted uppercase tracking-widest">Trade & account management</p>
        </div>
        <button onClick={toggle} className="glass rounded-full w-8 h-8 grid place-items-center text-sm">
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
      </header>

      {/* Tabs */}
      <div className="flex gap-3 border-b border-[var(--border)] mb-4 overflow-x-auto">
        {(['positions', 'pending', 'history', 'analytics', 'wallet'] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`text-xs pb-2.5 px-1 capitalize whitespace-nowrap ${tab === t ? 'tab-active font-semibold' : 'tab-inactive'}`}>
            {t === 'positions' ? 'Open Positions' : t === 'pending' ? 'Pending Orders' : t === 'history' ? 'History' : t === 'analytics' ? 'Analytics' : 'Wallet'}
          </button>
        ))}
      </div>

      {/* Open Positions */}
      {tab === 'positions' && (
        <section className="glass rounded-xl p-4">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-muted text-[10px] uppercase tracking-wider">
                  <th className="text-left py-1.5">Symbol</th>
                  <th className="text-left py-1.5">Type</th>
                  <th className="text-right py-1.5">Lot</th>
                  <th className="text-right py-1.5">Entry</th>
                  <th className="text-right py-1.5">Current</th>
                  <th className="text-right py-1.5">P/L</th>
                </tr>
              </thead>
              <tbody>
                <tr><td colSpan={6} className="text-center text-muted py-8">No open positions</td></tr>
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Pending Orders */}
      {tab === 'pending' && (
        <section className="glass rounded-xl p-4">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-muted text-[10px] uppercase tracking-wider">
                  <th className="text-left py-1.5">Symbol</th>
                  <th className="text-left py-1.5">Order Type</th>
                  <th className="text-right py-1.5">Entry</th>
                  <th className="text-right py-1.5">SL</th>
                  <th className="text-right py-1.5">TP</th>
                  <th className="text-right py-1.5">Status</th>
                </tr>
              </thead>
              <tbody>
                <tr><td colSpan={6} className="text-center text-muted py-8">No pending orders</td></tr>
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* History */}
      {tab === 'history' && (
        <section className="glass rounded-xl p-4">
          <div className="flex gap-2 mb-3">
            {['Today', 'Week', 'Month', 'All'].map((f) => (
              <button key={f} className="text-[10px] glass rounded-lg px-3 py-1">{f}</button>
            ))}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-muted text-[10px] uppercase tracking-wider">
                  <th className="text-left py-1.5">#</th>
                  <th className="text-left py-1.5">Symbol</th>
                  <th className="text-left py-1.5">Side</th>
                  <th className="text-right py-1.5">Lots</th>
                  <th className="text-right py-1.5">Open</th>
                  <th className="text-right py-1.5">Close</th>
                  <th className="text-right py-1.5">P/L</th>
                  <th className="text-right py-1.5">Time</th>
                </tr>
              </thead>
              <tbody>
                {MOCK_HISTORY.map((h) => (
                  <tr key={h.ticket} className="border-t border-white/5">
                    <td className="py-2 font-mono">{h.ticket}</td>
                    <td className="py-2 font-semibold">{h.symbol}</td>
                    <td className={`py-2 ${h.side === 'BUY' ? 'text-neon' : 'text-loss'}`}>{h.side}</td>
                    <td className="py-2 text-right font-mono">{h.lots}</td>
                    <td className="py-2 text-right font-mono">{h.openPrice}</td>
                    <td className="py-2 text-right font-mono">{h.closePrice}</td>
                    <td className={`py-2 text-right font-mono font-semibold ${h.profit >= 0 ? 'text-neon' : 'text-loss'}`}>
                      {h.profit >= 0 ? '+' : ''}${h.profit.toFixed(2)}
                    </td>
                    <td className="py-2 text-right text-muted">{h.closeTime}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Analytics */}
      {tab === 'analytics' && (
        <section className="glass rounded-xl p-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <div className="text-center">
              <p className="text-[10px] text-muted uppercase tracking-widest">Win Rate</p>
              <p className="text-2xl font-bold text-neon">67%</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] text-muted uppercase tracking-widest">Profit Factor</p>
              <p className="text-2xl font-bold">1.85</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] text-muted uppercase tracking-widest">ROI</p>
              <p className="text-2xl font-bold text-neon">+12.4%</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] text-muted uppercase tracking-widest">Avg RRR</p>
              <p className="text-2xl font-bold">1:2.3</p>
            </div>
          </div>
          <div className="glass rounded-xl p-6 text-center text-muted text-sm">
            <p>Equity curve chart will appear here once you have trading history</p>
            <p className="text-[10px] mt-1">Coming Soon</p>
          </div>
        </section>
      )}

      {/* Wallet */}
      {tab === 'wallet' && (
        <section className="space-y-3">
          <div className="glass rounded-xl p-4 text-center">
            <p className="text-[10px] text-muted uppercase tracking-widest">Wallet Balance</p>
            <p className="text-3xl font-bold text-gold mt-1">${(wallet?.balance ?? 0).toFixed(2)}</p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Link href="/wallet" className="glass rounded-xl p-3 text-center text-sm font-medium hover:bg-neon/5">Deposit</Link>
            <Link href="/wallet" className="glass rounded-xl p-3 text-center text-sm font-medium hover:bg-neon/5">Withdraw</Link>
            <Link href="/wallet" className="glass rounded-xl p-3 text-center text-sm font-medium hover:bg-neon/5">Transfer</Link>
          </div>
          <div className="glass rounded-xl p-4">
            <h3 className="text-sm font-semibold mb-3">Recent Transactions</h3>
            <div className="text-center py-4 text-muted text-sm">No recent transactions</div>
          </div>
        </section>
      )}
    </main>
  );
}
