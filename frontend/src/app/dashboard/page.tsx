'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { createChart, IChartApi, ISeriesApi, CandlestickData, Time } from 'lightweight-charts';
import { useLivePrices, Tick } from '../../lib/useLivePrices';
import { useTheme } from '../../lib/useTheme';
import { appApi } from '../../lib/appApi';

/* в”Ђв”Ђ types в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ */
interface Account { _id: string; login: string; type: string; balance: number; currency: string; leverage: number; }
interface Position { _id: string; ticket: number; symbolName: string; side: 'BUY' | 'SELL'; lots: number; openPrice: number; marginUsed: number; commission: number; swap: number; stopLoss?: number | null; takeProfit?: number | null; openTime: string; }
interface Snapshot { balance: number; equity: number; usedMargin: number; freeMargin: number; marginLevel: number; floatingPnL: number; }

const SYMBOLS = ['XAUUSD', 'EURUSD', 'GBPUSD', 'USDJPY', 'US30', 'NAS100', 'BTCUSD'];
const TIMEFRAMES = ['M1', 'M5', 'M15', 'H1', 'H4', 'D1'];
const LOTS = [0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1, 2, 5];

function pnlColor(v: number) { return v > 0 ? 'text-neon' : v < 0 ? 'text-loss' : 'text-muted'; }
function fmt(n: number | null | undefined, d = 2) { return (n ?? 0).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d }); }

/* в”Ђв”Ђ component в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ */
export default function DashboardPage() {
  const { theme, toggle } = useTheme();
  const prices = useLivePrices();

  // auth & data
  const [user, setUser] = useState<any>(null);
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

  // account types (admin-configured)
  const [accountTypes, setAccountTypes] = useState<any[]>([]);
  const [showOpenAccount, setShowOpenAccount] = useState(false);
  const [selectedType, setSelectedType] = useState<any>(null);
  const [openingAccount, setOpeningAccount] = useState(false);

  // в”Ђв”Ђ init в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
  useEffect(() => {
    appApi.loadTokens();
    appApi.me().then(setUser).catch(() => setUser(null));
    appApi.accounts().then((a: Account[]) => {
      setAccounts(a);
      if (a.length > 0 && !activeAccountId) setActiveAccountId(a[0]._id);
    }).catch(() => setAccounts([]));
    appApi.accountTypes().then(setAccountTypes).catch(() => {});
  }, []);

  // в”Ђв”Ђ fetch snapshot + positions в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
  const refreshData = useCallback(() => {
    if (!activeAccountId) return;
    appApi.trading.snapshot(activeAccountId).then((s: Snapshot) => setSnapshot(s)).catch(() => {});
    // fetch open positions via snapshot enrichment вЂ” we need a dedicated endpoint
    // For now, use the accounts/:id/snapshot response which includes position details
  }, [activeAccountId]);

  useEffect(() => { refreshData(); const id = setInterval(refreshData, 5000); return () => clearInterval(id); }, [refreshData]);

  // в”Ђв”Ђ chart в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
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

    // load candles
    appApi.trading.candles(selectedSymbol, selectedTf).then((candles: any[]) => {
      const data: CandlestickData[] = candles.map((c: any) => ({
        time: c.time as Time,
        open: c.open, high: c.high, low: c.low, close: c.close,
      }));
      series.setData(data);
      chart.timeScale().fitContent();
    }).catch(() => {});

    // resize
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) chart.applyOptions({ width: e.contentRect.width });
    });
    ro.observe(chartContainerRef.current);
    return () => { ro.disconnect(); chart.remove(); chartRef.current = null; };
  }, [selectedSymbol, selectedTf, theme]);

  // в”Ђв”Ђ place order в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
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

  // в”Ђв”Ђ close position в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
  const closePos = async (id: string) => {
    try { await appApi.trading.closePosition(id); refreshData(); } catch {}
  };

  // в”Ђв”Ђ derive live P&L for display в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
  const liveTick = prices[selectedSymbol];
  const equity = snapshot ? snapshot.equity : 0;
  const floatingPnL = snapshot ? snapshot.floatingPnL : 0;
  const usedMargin = snapshot ? snapshot.usedMargin : 0;
  const freeMargin = snapshot ? snapshot.freeMargin : 0;
  const marginLevel = snapshot ? snapshot.marginLevel : 0;
  const activeAccount = accounts.find((a) => a._id === activeAccountId);

  return (
    <main className="min-h-screen p-2 sm:p-3 max-w-[1440px] mx-auto">
      {/* в”Ђв”Ђ header в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ */}
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
            {theme === 'dark' ? 'вЂпёЏ' : 'рџЊ™'}
          </button>
        </div>
      </header>

      {/* в”Ђв”Ђ account selector + equity row в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ */}
      <section className="grid grid-cols-3 md:grid-cols-5 gap-2 sm:gap-3 mb-2 sm:mb-3">
        {/* Account selector */}
        <div className="glass rounded-xl p-2 sm:p-3 col-span-3 md:col-span-2">
          <p className="text-[10px] text-muted uppercase tracking-widest mb-1">Trading Account</p>
          <select
            value={activeAccountId}
            onChange={(e) => setActiveAccountId(e.target.value)}
            className="w-full bg-transparent text-sm font-semibold outline-none cursor-pointer"
          >
            {accounts.length === 0 && <option value="">No accounts вЂ” create one below</option>}
            {accounts.map((a) => (
              <option key={a._id} value={a._id}>
                #{a.login} {a.type} 1:{a.leverage} вЂ” ${fmt(a.balance)}
              </option>
            ))}
          </select>
          {accounts.length === 0 && (
            <button onClick={() => setShowOpenAccount(true)} className="text-xs rounded-lg bg-emerald-600 text-white px-3 py-1 mt-2">+ Open Account</button>
          )}
          {accounts.length > 0 && (
            <button onClick={() => setShowOpenAccount(true)} className="text-[10px] text-[#39ff8b] hover:underline mt-1">+ Open New Account</button>
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

      {/* в”Ђв”Ђ main grid: chart + trade panel в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ */}
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
              <button onClick={() => setLots((l) => Math.max(0.01, +(+l - 0.01).toFixed(2)))} className="glass rounded-lg w-8 h-8 grid place-items-center text-sm">в€’</button>
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
              <input type="number" value={sl} onChange={(e) => setSl(e.target.value)} placeholder="вЂ”"
                className="w-full mt-1 bg-transparent glass rounded-lg px-2 py-1 text-sm font-mono outline-none" />
            </div>
            <div>
              <label className="text-[10px] text-muted uppercase tracking-widest">Take Profit</label>
              <input type="number" value={tp} onChange={(e) => setTp(e.target.value)} placeholder="вЂ”"
                className="w-full mt-1 bg-transparent glass rounded-lg px-2 py-1 text-sm font-mono outline-none" />
            </div>
          </div>

          {/* Execute */}
          <button onClick={placeOrder}
            className={`w-full py-3 rounded-xl font-bold text-sm transition-all ${
              side === 'BUY' ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'bg-red-600 hover:bg-red-500 text-white'
            }`}>
            {side} {lots} {selectedSymbol}
          </button>

          {tradeMsg && (
            <p className={`text-xs text-center ${tradeMsg.ok ? 'text-neon' : 'text-loss'}`}>{tradeMsg.text}</p>
          )}
        </div>
      </section>

      {/* в”Ђв”Ђ positions / pending / history tabs в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ */}
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
                    <td className="py-2 pr-2 text-right font-mono">{currentPrice || 'вЂ”'}</td>
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
              {marginLevel === Infinity || marginLevel === 0 ? 'вЂ”' : fmt(marginLevel) + '%'}
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
            <p className="text-[10px] text-muted mt-1">Margin level {marginLevel === Infinity ? 'вЂ”' : fmt(marginLevel) + '%'}</p>
          </div>
        )}
      </section>

      {/* Open Account Modal */}
      {showOpenAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="glass rounded-2xl p-6 w-full max-w-md max-h-[80vh] overflow-y-auto">
            <h2 className="text-lg font-bold mb-1">Open New Account</h2>
            <p className="text-xs text-muted mb-4">Choose an account type configured by your broker</p>

            {accountTypes.length === 0 ? (
              <p className="text-sm text-muted text-center py-8">No account types available. Contact support.</p>
            ) : (
              <div className="space-y-3">
                {accountTypes.map((t: any) => (
                  <button
                    key={t._id}
                    onClick={() => setSelectedType(t)}
                    className={`w-full text-left p-4 rounded-xl border transition-all ${
                      selectedType?._id === t._id
                        ? 'border-[#39ff8b] bg-[#39ff8b]/5'
                        : 'border-[var(--border)] hover:border-[var(--border)] hover:bg-[var(--surface)]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-sm">{t.displayName}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${t.category === 'DEMO' ? 'bg-[#66b2ff]/15 text-[#66b2ff]' : 'bg-[#39ff8b]/15 text-[#39ff8b]'}`}>
                        {t.category}
                      </span>
                    </div>
                    {t.description && <p className="text-[11px] text-muted mb-2">{t.description}</p>}
                    <div className="flex gap-3 text-[10px] text-muted">
                      <span>Leverage: 1:{t.defaultLeverage}</span>
                      <span>Min: ${t.minDeposit}</span>
                      {t.commission > 0 && <span>${t.commission}/lot</span>}
                      {t.spreadMarkup > 0 && <span>+{t.spreadMarkup}pts spread</span>}
                    </div>
                  </button>
                ))}
              </div>
            )}

            <div className="flex justify-end gap-3 mt-5">
              <button onClick={() => { setShowOpenAccount(false); setSelectedType(null); }} className="px-4 py-2 rounded-lg text-sm text-muted hover:text-white">Cancel</button>
              <button
                disabled={!selectedType || openingAccount}
                onClick={async () => {
                  if (!selectedType) return;
                  setOpeningAccount(true);
                  try {
                    const acc = await appApi.createAccount({ accountTypeId: selectedType._id });
                    setAccounts(prev => [...prev, acc]);
                    setActiveAccountId(acc._id);
                    setShowOpenAccount(false);
                    setSelectedType(null);
                  } catch (e: any) {
                    alert(e.message || 'Failed to open account');
                  }
                  setOpeningAccount(false);
                }}
                className="px-5 py-2 rounded-lg bg-gradient-to-r from-[#39ff8b] to-[#ffd166] text-[#0a0e1a] font-medium text-sm hover:opacity-90 disabled:opacity-50"
              >
                {openingAccount ? 'Opening...' : 'Open Account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
