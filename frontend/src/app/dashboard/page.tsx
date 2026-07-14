'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createChart, IChartApi, ISeriesApi, CandlestickData, Time } from 'lightweight-charts';
import { useLivePrices, Tick } from '../../lib/useLivePrices';
import { useTheme } from '../../lib/useTheme';
import { appApi } from '../../lib/appApi';

/* ── types ──────────────────────────────────────────────────────── */
interface Account { _id: string; login: string; type: string; balance: number; currency: string; leverage: number; accountCategory?: string; accountType?: string; status?: string; server?: string; }
interface Position { _id: string; ticket: number; symbolName: string; side: 'BUY' | 'SELL'; lots: number; openPrice: number; marginUsed: number; commission: number; swap: number; stopLoss?: number | null; takeProfit?: number | null; openTime: string; }
interface Snapshot { balance: number; equity: number; usedMargin: number; freeMargin: number; marginLevel: number; floatingPnL: number; }

const SYMBOLS = ['XAUUSD', 'EURUSD', 'GBPUSD', 'USDJPY', 'US30', 'NAS100', 'BTCUSD'];
const TIMEFRAMES = ['M1', 'M5', 'M15', 'H1', 'H4', 'D1'];
const LOTS = [0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1, 2, 5];

function pnlColor(v: number) { return v > 0 ? 'text-neon' : v < 0 ? 'text-loss' : 'text-muted'; }
function fmt(n: number | null | undefined, d = 2) { return (n ?? 0).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d }); }

// Generate realistic mock candle data when backend is unavailable
function generateMockCandles(symbol: string, tf: string, count = 200): CandlestickData[] {
  const basePrices: Record<string, number> = { XAUUSD: 2384, EURUSD: 1.084, GBPUSD: 1.272, USDJPY: 154.2, US30: 39500, NAS100: 18200, BTCUSD: 67400 };
  const base = basePrices[symbol] || 100;
  const volatility = base * 0.003;
  const tfMinutes: Record<string, number> = { M1: 1, M5: 5, M15: 15, H1: 60, H4: 240, D1: 1440 };
  const interval = (tfMinutes[tf] || 5) * 60;
  const now = Math.floor(Date.now() / 1000);
  const startTime = now - count * interval;
  const candles: CandlestickData[] = [];
  let price = base;
  for (let i = 0; i < count; i++) {
    const change = (Math.random() - 0.48) * volatility;
    const open = price;
    const close = open + change;
    const high = Math.max(open, close) + Math.random() * volatility * 0.5;
    const low = Math.min(open, close) - Math.random() * volatility * 0.5;
    candles.push({ time: (startTime + i * interval) as Time, open: +open.toFixed(5), high: +high.toFixed(5), low: +low.toFixed(5), close: +close.toFixed(5) });
    price = close;
  }
  return candles;
}

/* ── component ──────────────────────────────────────────────────── */
export default function DashboardPage() {
  const { theme, toggle } = useTheme();
  const prices = useLivePrices();

  const router = useRouter();

  // auth & data
  const [user, setUser] = useState<any>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [activeAccountId, setActiveAccountId] = useState<string>('');
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);

  // chart state
  const [selectedSymbol, setSelectedSymbol] = useState('XAUUSD');
  const [selectedTf, setSelectedTf] = useState('M5');
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);

  // trade panel
  const [side, setSide] = useState<'BUY' | 'SELL'>('BUY');
  const [lots, setLots] = useState(0.1);
  const [sl, setSl] = useState('');
  const [tp, setTp] = useState('');
  const [tradeMsg, setTradeMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [bottomTab, setBottomTab] = useState<'positions' | 'pending' | 'history'>('positions');

  // upgrade to live
  const [liveAccountTypes, setLiveAccountTypes] = useState<any[]>([]);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [upgradeType, setUpgradeType] = useState<any>(null);
  const [upgrading, setUpgrading] = useState(false);

  // ── init: auth guard + load data ──────────────────────────────────
  useEffect(() => {
    appApi.loadTokens();
    const u = appApi.getCurrentUser();
    if (!u) {
      router.replace('/login');
      return;
    }
    setUser(u);
    setAuthChecked(true);
    appApi.me().then(setUser).catch(() => { router.replace('/login'); });
    appApi.accounts().then((a: Account[]) => {
      setAccounts(a);
      if (a.length > 0 && !activeAccountId) setActiveAccountId(a[0]._id);
    }).catch(() => setAccounts([]));
    appApi.liveAccountTypes().then(setLiveAccountTypes).catch(() => {});
  }, []);

  // ── fetch snapshot + positions ─────────────────────────────────────
  const refreshData = useCallback(() => {
    if (!activeAccountId) return;
    appApi.trading.snapshot(activeAccountId).then((s: Snapshot) => setSnapshot(s)).catch(() => {});
    // fetch open positions via snapshot enrichment — we need a dedicated endpoint
    // For now, use the accounts/:id/snapshot response which includes position details
  }, [activeAccountId]);

  useEffect(() => { refreshData(); const id = setInterval(refreshData, 5000); return () => clearInterval(id); }, [refreshData]);

  // ── chart ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!chartContainerRef.current) return;
    // destroy previous
    if (chartRef.current) { chartRef.current.remove(); chartRef.current = null; }

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: window.innerWidth < 640 ? 260 : 380,
      layout: {
        background: { color: theme === 'dark' ? '#0f1626' : '#f4f6fb' },
        textColor: theme === 'dark' ? '#8a94a6' : '#5b6477',
      },
      grid: {
        vertLines: { color: theme === 'dark' ? 'rgba(255,255,255,.06)' : 'rgba(0,0,0,.06)' },
        horzLines: { color: theme === 'dark' ? 'rgba(255,255,255,.06)' : 'rgba(0,0,0,.06)' },
      },
      crosshair: { mode: 0 },
      timeScale: { timeVisible: true, secondsVisible: false },
    });
    chartRef.current = chart;
    const series = chart.addCandlestickSeries({
      upColor: '#39ff8b', downColor: '#ff5d6c',
      borderUpColor: '#39ff8b', borderDownColor: '#ff5d6c',
      wickUpColor: '#39ff8b', wickDownColor: '#ff5d6c',
    });
    seriesRef.current = series;

    // load candles (fallback to mock data if backend unavailable)
    appApi.trading.candles(selectedSymbol, selectedTf).then((candles: any[]) => {
      if (candles && candles.length > 0) {
        const data: CandlestickData[] = candles.map((c: any) => ({
          time: c.time as Time,
          open: c.open, high: c.high, low: c.low, close: c.close,
        }));
        series.setData(data);
      } else {
        series.setData(generateMockCandles(selectedSymbol, selectedTf));
      }
      chart.timeScale().fitContent();
    }).catch(() => {
      series.setData(generateMockCandles(selectedSymbol, selectedTf));
      chart.timeScale().fitContent();
    });

    // resize
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) chart.applyOptions({ width: e.contentRect.width });
    });
    ro.observe(chartContainerRef.current);
    return () => { ro.disconnect(); chart.remove(); chartRef.current = null; };
  }, [selectedSymbol, selectedTf, theme]);

  // ── place order ───────────────────────────────────────────────────
  const placeOrder = async () => {
    if (!activeAccountId) { setTradeMsg({ text: 'Select a trading account first', ok: false }); return; }
    setTradeMsg(null);
    try {
      const body: any = { symbol: selectedSymbol, side, lots };
      if (sl) body.stopLoss = parseFloat(sl);
      if (tp) body.takeProfit = parseFloat(tp);
      await appApi.trading.placeOrder(activeAccountId, body);
      setTradeMsg({ text: `${side} ${lots} ${selectedSymbol} placed!`, ok: true });
      setSl(''); setTp('');
      refreshData();
    } catch (e: any) {
      setTradeMsg({ text: e.message || 'Order failed', ok: false });
    }
  };

  // ── close position ────────────────────────────────────────────────
  const closePos = async (id: string) => {
    try { await appApi.trading.closePosition(id); refreshData(); } catch {}
  };

  // ── derive live P&L for display ───────────────────────────────────
  const liveTick = prices[selectedSymbol];
  const equity = snapshot ? snapshot.equity : 0;
  const floatingPnL = snapshot ? snapshot.floatingPnL : 0;
  const usedMargin = snapshot ? snapshot.usedMargin : 0;
  const freeMargin = snapshot ? snapshot.freeMargin : 0;
  const marginLevel = snapshot ? snapshot.marginLevel : 0;
  const activeAccount = accounts.find((a) => a._id === activeAccountId);
  const isDemoAccount = activeAccount?.accountCategory === 'DEMO' || activeAccount?.server?.startsWith('Demo');
  const isLiveAccount = activeAccount?.accountCategory === 'LIVE' || activeAccount?.server?.startsWith('Live');
  const isAccountActive = activeAccount?.status === 'ACTIVE';

  // auth guard loading state
  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[#39ff8b] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-muted mt-3">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen p-2 sm:p-3 max-w-[1440px] mx-auto">
      {/* ── header ───────────────────────────────────────────────── */}
      <header className="flex items-center justify-between py-2 mb-2">
        <div className="flex items-center gap-2">
          <h1 className="text-lg sm:text-xl font-bold"><span className="text-gold">Apex</span><span className="text-neon">FX</span></h1>
          <span className="text-[10px] sm:text-xs text-muted">Dashboard</span>
        </div>
        <div className="flex items-center gap-2">
          {!user && <a href="/login" className="text-xs glass rounded-lg px-2 sm:px-3 py-1.5">Log in</a>}
          {user && (
            <button
              onClick={() => appApi.logout()}
              className="text-xs glass rounded-lg px-2 sm:px-3 py-1.5 text-[#ff5d6c] hover:bg-[#ff5d6c]/10 transition-colors"
            >
              Logout
            </button>
          )}
          <button onClick={toggle} className="glass rounded-full w-8 h-8 grid place-items-center text-sm">
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
        </div>
      </header>

      {/* ── account selector + equity row ────────────────────────── */}
      <section className="grid grid-cols-3 md:grid-cols-5 gap-2 sm:gap-3 mb-2 sm:mb-3">
        {/* Account selector */}
        <div className="glass rounded-xl p-2 sm:p-3 col-span-3 md:col-span-2">
          <div className="flex items-center justify-between mb-1">
            <p className="text-[10px] text-muted uppercase tracking-widest">Trading Account</p>
            {activeAccount && (
              <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                isDemoAccount ? 'bg-[#66b2ff]/15 text-[#66b2ff]' : isLiveAccount ? 'bg-[#39ff8b]/15 text-[#39ff8b]' : 'bg-white/10 text-muted'
              }`}>
                {isDemoAccount ? 'DEMO' : isLiveAccount ? 'LIVE' : activeAccount.accountCategory || ''}
              </span>
            )}
          </div>
          {activeAccount ? (
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-base font-bold">{activeAccount.accountType || activeAccount.type || 'Standard'}</span>
                <span className="text-[10px] text-muted font-mono">#{activeAccount.login}</span>
              </div>
              <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted">
                <span>1:{activeAccount.leverage}</span>
                {activeAccount.server && <span className="text-muted/60">|</span>}
                {activeAccount.server && <span>{activeAccount.server}</span>}
                {activeAccount.status && (
                  <>
                    <span className="text-muted/60">|</span>
                    <span className={activeAccount.status === 'ACTIVE' ? 'text-[#39ff8b]' : 'text-[#ffd166]'}>{activeAccount.status}</span>
                  </>
                )}
              </div>
              <select
                value={activeAccountId}
                onChange={(e) => setActiveAccountId(e.target.value)}
                className="w-full bg-transparent text-xs outline-none cursor-pointer mt-1.5 border-t border-[var(--border)] pt-1.5"
              >
                {accounts.map((a) => (
                  <option key={a._id} value={a._id}>
                    #{a.login} {a.accountType || a.type} 1:{a.leverage} — ${fmt(a.balance)}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <p className="text-sm text-muted py-1">No trading accounts</p>
              <p className="text-[10px] text-muted mt-0.5">Visit <a href="/accounts" className="text-[#39ff8b] hover:underline">/accounts</a> to create one</p>
            </div>
          )}
          {accounts.length > 0 && isDemoAccount && (
            <div className="flex items-center gap-3 mt-1.5">
              <button onClick={() => setShowUpgrade(true)} className="text-[10px] text-[#ffd166] hover:underline">Upgrade to Live →</button>
            </div>
          )}
        </div>

        {/* Equity */}
        <div className="glass rounded-xl p-2 sm:p-3">
          <p className="text-[10px] text-muted uppercase tracking-widest">Equity</p>
          <p className={`text-sm sm:text-lg font-bold ${pnlColor(floatingPnL)}`}>${fmt(equity)}</p>
        </div>

        {/* Free margin */}
        <div className="glass rounded-xl p-2 sm:p-3">
          <p className="text-[10px] text-muted uppercase tracking-widest">Free Margin</p>
          <p className="text-sm sm:text-lg font-bold">${fmt(freeMargin)}</p>
        </div>

        {/* Floating P&L */}
        <div className="glass rounded-xl p-2 sm:p-3">
          <p className="text-[10px] text-muted uppercase tracking-widest">Floating P&L</p>
          <p className={`text-sm sm:text-lg font-bold ${pnlColor(floatingPnL)}`}>{floatingPnL >= 0 ? '+' : ''}${fmt(floatingPnL)}</p>
        </div>
      </section>

      {/* ── main grid: chart + trade panel ───────────────────────── */}
      <section className="grid lg:grid-cols-[1fr_320px] gap-2 sm:gap-3 mb-2 sm:mb-3">
        {/* Chart */}
        <div className="glass rounded-xl p-2 sm:p-3">
          {/* symbol + tf selector */}
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <select value={selectedSymbol} onChange={(e) => setSelectedSymbol(e.target.value)}
              className="bg-transparent font-semibold text-sm outline-none cursor-pointer">
              {SYMBOLS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            {liveTick && (
              <span className="text-xs font-mono">
                <span className="text-loss">{liveTick.bid}</span>
                <span className="text-muted mx-1">/</span>
                <span className="text-neon">{liveTick.ask}</span>
                <span className="text-muted ml-2">spread {liveTick.spread}</span>
              </span>
            )}
            <div className="flex gap-1 ml-auto">
              {TIMEFRAMES.map((tf) => (
                <button key={tf} onClick={() => setSelectedTf(tf)}
                  className={`text-[10px] px-2 py-1 rounded-md ${tf === selectedTf ? 'bg-emerald-600 text-white' : 'glass'}`}>
                  {tf}
                </button>
              ))}
            </div>
          </div>
          <div ref={chartContainerRef} className="w-full rounded-lg overflow-hidden" />
        </div>

        {/* Trade panel */}
        <div className="glass rounded-xl p-3 sm:p-4 flex flex-col gap-2 sm:gap-3">
          <h3 className="text-sm font-semibold">New Order</h3>

          {/* Account not active warning */}
          {activeAccount && !isAccountActive && (
            <div className="rounded-lg bg-[#ffd166]/10 border border-[#ffd166]/30 p-3">
              <div className="flex items-start gap-2">
                <svg className="w-4 h-4 text-[#ffd166] flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div className="flex-1">
                  <p className="text-xs font-semibold text-[#ffd166]">Account Not Active</p>
                  <p className="text-[10px] text-muted mt-0.5">
                    {activeAccount.status === 'PENDING' 
                      ? 'Your account is pending admin approval. Trading will be available once activated.'
                      : `Your account is ${activeAccount.status?.toLowerCase()}. Please contact support.`
                    }
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Symbol display */}
          <div className="flex items-center justify-between">
            <span className="text-lg font-bold">{selectedSymbol}</span>
            {liveTick && <span className="text-xs font-mono text-muted">spread {liveTick.spread}</span>}
          </div>

          {/* Bid / Ask */}
          {liveTick && (
            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="rounded-lg bg-loss/10 py-2">
                <p className="text-[10px] text-muted">BID</p>
                <p className="font-mono font-bold text-loss">{liveTick.bid}</p>
              </div>
              <div className="rounded-lg bg-neon/10 py-2">
                <p className="text-[10px] text-muted">ASK</p>
                <p className="font-mono font-bold text-neon">{liveTick.ask}</p>
              </div>
            </div>
          )}

          {/* Side */}
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setSide('BUY')}
              className={`py-2 rounded-lg font-semibold text-sm transition-all ${side === 'BUY' ? 'bg-emerald-600 text-white shadow-glow' : 'glass'}`}>
              BUY
            </button>
            <button onClick={() => setSide('SELL')}
              className={`py-2 rounded-lg font-semibold text-sm transition-all ${side === 'SELL' ? 'bg-red-600 text-white' : 'glass'}`}>
              SELL
            </button>
          </div>

          {/* Lots */}
          <div>
            <label className="text-[10px] text-muted uppercase tracking-widest">Lots</label>
            <div className="flex items-center gap-1 mt-1">
              <button onClick={() => setLots((l) => Math.max(0.01, +(+l - 0.01).toFixed(2)))} className="glass rounded-lg w-8 h-8 grid place-items-center text-sm">−</button>
              <input type="number" value={lots.toFixed(2)} onChange={(e) => setLots(Math.max(0.01, parseFloat(e.target.value) || 0.01))}
                step="0.01" min="0.01" className="flex-1 bg-transparent text-center font-mono text-sm outline-none glass rounded-lg py-1" />
              <button onClick={() => setLots((l) => +(+l + 0.01).toFixed(2))} className="glass rounded-lg w-8 h-8 grid place-items-center text-sm">+</button>
            </div>
            <div className="flex gap-1 mt-1">
              {LOTS.slice(0, 6).map((l) => (
                <button key={l} onClick={() => setLots(l)}
                  className={`text-[10px] px-1.5 py-0.5 rounded ${l === lots ? 'bg-emerald-600 text-white' : 'glass'}`}>
                  {l}
                </button>
              ))}
            </div>
          </div>

          {/* SL / TP */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-muted uppercase tracking-widest">Stop Loss</label>
              <input type="number" value={sl} onChange={(e) => setSl(e.target.value)} placeholder="—"
                className="w-full mt-1 bg-transparent glass rounded-lg px-2 py-1 text-sm font-mono outline-none" />
            </div>
            <div>
              <label className="text-[10px] text-muted uppercase tracking-widest">Take Profit</label>
              <input type="number" value={tp} onChange={(e) => setTp(e.target.value)} placeholder="—"
                className="w-full mt-1 bg-transparent glass rounded-lg px-2 py-1 text-sm font-mono outline-none" />
            </div>
          </div>

          {/* Execute */}
          <button onClick={placeOrder} disabled={!isAccountActive}
            className={`w-full py-3 rounded-xl font-bold text-sm transition-all ${
              !isAccountActive 
                ? 'bg-gray-600 cursor-not-allowed opacity-50' 
                : side === 'BUY' ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'bg-red-600 hover:bg-red-500 text-white'
            }`}>
            {!isAccountActive ? 'Account Not Active' : `${side} ${lots} ${selectedSymbol}`}
          </button>

          {tradeMsg && (
            <p className={`text-xs text-center ${tradeMsg.ok ? 'text-neon' : 'text-loss'}`}>{tradeMsg.text}</p>
          )}
        </div>
      </section>

      {/* ── positions / pending / history tabs ──────────────────── */}
      <section className="glass rounded-xl p-3 sm:p-4 mb-2 sm:mb-3">
        <div className="flex gap-4 border-b border-[var(--border)] mb-3">
          {(['positions', 'pending', 'history'] as const).map((tab) => (
            <button key={tab} onClick={() => setBottomTab(tab)}
              className={`text-xs pb-2 capitalize ${bottomTab === tab ? 'tab-active font-semibold' : 'tab-inactive'}`}>
              {tab === 'positions' ? 'Open Positions' : tab === 'pending' ? 'Pending Orders' : 'History'}
            </button>
          ))}
        </div>

        {bottomTab === 'pending' && (
          <div className="text-center py-6 text-muted text-sm">No pending orders</div>
        )}
        {bottomTab === 'history' && (
          <div className="text-center py-6 text-muted text-sm">No trade history yet</div>
        )}

        {bottomTab === 'positions' && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-muted text-[10px] uppercase tracking-wider">
                <th className="text-left py-1.5 pr-2">#</th>
                <th className="text-left py-1.5 pr-2">Symbol</th>
                <th className="text-left py-1.5 pr-2">Side</th>
                <th className="text-right py-1.5 pr-2">Lots</th>
                <th className="text-right py-1.5 pr-2">Open</th>
                <th className="text-right py-1.5 pr-2">Current</th>
                <th className="text-right py-1.5 pr-2">P&L</th>
                <th className="text-right py-1.5">Action</th>
              </tr>
            </thead>
            <tbody>
              {positions.length === 0 ? (
                <tr><td colSpan={8} className="text-center text-muted py-4">No open positions</td></tr>
              ) : positions.map((p) => {
                const tick = prices[p.symbolName];
                const pnl = tick ? (p.side === 'BUY'
                  ? (tick.bid - p.openPrice) * p.lots * 100000
                  : (p.openPrice - tick.ask) * p.lots * 100000) : 0;
                const currentPrice = tick ? (p.side === 'BUY' ? tick.bid : tick.ask) : 0;
                return (
                  <tr key={p._id} className="border-t border-white/5">
                    <td className="py-2 pr-2 font-mono">{p.ticket}</td>
                    <td className="py-2 pr-2 font-semibold">{p.symbolName}</td>
                    <td className={`py-2 pr-2 font-semibold ${p.side === 'BUY' ? 'text-neon' : 'text-loss'}`}>{p.side}</td>
                    <td className="py-2 pr-2 text-right font-mono">{p.lots}</td>
                    <td className="py-2 pr-2 text-right font-mono">{p.openPrice}</td>
                    <td className="py-2 pr-2 text-right font-mono">{currentPrice || '—'}</td>
                    <td className={`py-2 pr-2 text-right font-mono font-semibold ${pnlColor(pnl)}`}>
                      {pnl >= 0 ? '+' : ''}{fmt(pnl)}
                    </td>
                    <td className="py-2 text-right">
                      <button onClick={() => closePos(p._id)} className="text-loss hover:underline">Close</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        )}
      </section>

      {/* Account Summary */}
      <section className="glass rounded-xl p-3 sm:p-4">
        <h3 className="text-sm font-semibold mb-2 sm:mb-3">Account Summary</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 sm:gap-4">
          <div>
            <p className="text-[10px] text-muted uppercase tracking-widest">Balance</p>
            <p className="text-base font-bold">${fmt(snapshot?.balance ?? 0)}</p>
          </div>
          <div>
            <p className="text-[10px] text-muted uppercase tracking-widest">Equity</p>
            <p className={`text-base font-bold ${pnlColor(floatingPnL)}`}>${fmt(equity)}</p>
          </div>
          <div>
            <p className="text-[10px] text-muted uppercase tracking-widest">Used Margin</p>
            <p className="text-base font-bold">${fmt(usedMargin)}</p>
          </div>
          <div>
            <p className="text-[10px] text-muted uppercase tracking-widest">Margin Level</p>
            <p className={`text-base font-bold ${marginLevel !== Infinity && marginLevel > 0 && marginLevel < 150 ? 'text-loss' : ''}`}>
              {marginLevel === Infinity || marginLevel === 0 ? '—' : fmt(marginLevel) + '%'}
            </p>
          </div>
          <div>
            <p className="text-[10px] text-muted uppercase tracking-widest">Floating P&L</p>
            <p className={`text-base font-bold ${pnlColor(floatingPnL)}`}>
              {floatingPnL >= 0 ? '+' : ''}${fmt(floatingPnL)}
            </p>
          </div>
        </div>

        {/* Visual margin bar */}
        {snapshot && usedMargin > 0 && marginLevel !== Infinity && marginLevel > 0 && (
          <div className="mt-3">
            <div className="h-2 rounded-full bg-white/5 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${marginLevel < 100 ? 'bg-loss' : marginLevel < 200 ? 'bg-gold' : 'bg-neon'}`}
                style={{ width: `${Math.min(marginLevel === Infinity ? 0 : marginLevel, 100)}%` }}
              />
            </div>
            <p className="text-[10px] text-muted mt-1">Margin level {marginLevel === Infinity ? '—' : fmt(marginLevel) + '%'}</p>
          </div>
        )}
      </section>

      {/* Upgrade Demo to Live Modal */}
      {showUpgrade && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="glass rounded-2xl p-6 w-full max-w-md max-h-[80vh] overflow-y-auto">
            <h2 className="text-lg font-bold mb-1">Upgrade to Live Account</h2>
            <p className="text-xs text-muted mb-4">Keep your demo account and add a live trading account</p>

            {liveAccountTypes.length === 0 ? (
              <p className="text-sm text-muted text-center py-8">No live account types available. Contact support.</p>
            ) : (
              <div className="space-y-3">
                {liveAccountTypes.map((t: any) => (
                  <button
                    key={t._id}
                    onClick={() => setUpgradeType(t)}
                    className={`w-full text-left p-4 rounded-xl border transition-all ${
                      upgradeType?._id === t._id
                        ? 'border-[#ffd166] bg-[#ffd166]/5'
                        : 'border-[var(--border)] hover:border-[var(--border)] hover:bg-[var(--surface)]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-sm">{t.displayName}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-[#39ff8b]/15 text-[#39ff8b]">LIVE</span>
                    </div>
                    {t.description && <p className="text-[11px] text-muted mb-2">{t.description}</p>}
                    <div className="flex gap-3 text-[10px] text-muted">
                      <span>Leverage: 1:{t.defaultLeverage}</span>
                      <span>Min: ${t.minDeposit}</span>
                      {t.commission > 0 && <span>${t.commission}/lot</span>}
                    </div>
                  </button>
                ))}
              </div>
            )}

            <div className="flex justify-end gap-3 mt-5">
              <button onClick={() => { setShowUpgrade(false); setUpgradeType(null); }} className="px-4 py-2 rounded-lg text-sm text-muted hover:text-white">Cancel</button>
              <button
                disabled={!upgradeType || upgrading}
                onClick={async () => {
                  if (!upgradeType) return;
                  setUpgrading(true);
                  try {
                    const acc = await appApi.upgradeDemo({ accountTypeId: upgradeType._id });
                    setAccounts(prev => [...prev, acc]);
                    setActiveAccountId(acc._id);
                    setShowUpgrade(false);
                    setUpgradeType(null);
                  } catch (e: any) {
                    alert(e.message || 'Failed to upgrade');
                  }
                  setUpgrading(false);
                }}
                className="px-5 py-2 rounded-lg bg-gradient-to-r from-[#ffd166] to-[#39ff8b] text-[#0a0e1a] font-medium text-sm hover:opacity-90 disabled:opacity-50"
              >
                {upgrading ? 'Upgrading...' : 'Upgrade Now'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
