import { SymbolSpec } from '../trading/engine';

// Default symbol catalogue. Admin can override spread/commission in DB.
export const DEFAULT_SYMBOLS: (SymbolSpec & {
  displayName: string; source: 'binance' | 'twelvedata' | 'mock'; externalSymbol: string;
})[] = [
  { name: 'XAUUSD', displayName: 'Gold',     kind: 'METAL',  base: 'XAU', quote: 'USD', contractSize: 100,    digits: 2, spreadPoints: 30, commission: 0, source: 'twelvedata', externalSymbol: 'XAU/USD' },
  { name: 'EURUSD', displayName: 'Euro',     kind: 'FOREX',  base: 'EUR', quote: 'USD', contractSize: 100000, digits: 5, spreadPoints: 8,  commission: 0, source: 'twelvedata', externalSymbol: 'EUR/USD' },
  { name: 'GBPUSD', displayName: 'Pound',    kind: 'FOREX',  base: 'GBP', quote: 'USD', contractSize: 100000, digits: 5, spreadPoints: 12, commission: 0, source: 'twelvedata', externalSymbol: 'GBP/USD' },
  { name: 'USDJPY', displayName: 'Yen',      kind: 'FOREX',  base: 'USD', quote: 'JPY', contractSize: 100000, digits: 3, spreadPoints: 10, commission: 0, source: 'twelvedata', externalSymbol: 'USD/JPY' },
  { name: 'US30',   displayName: 'Dow 30',   kind: 'INDEX',  base: 'US30',quote: 'USD', contractSize: 1,      digits: 2, spreadPoints: 200,commission: 0, source: 'twelvedata', externalSymbol: 'DJI' },
  { name: 'NAS100', displayName: 'Nasdaq',   kind: 'INDEX',  base: 'NAS', quote: 'USD', contractSize: 1,      digits: 2, spreadPoints: 150,commission: 0, source: 'twelvedata', externalSymbol: 'IXIC' },
  { name: 'BTCUSD', displayName: 'Bitcoin',  kind: 'CRYPTO', base: 'BTC', quote: 'USD', contractSize: 1,      digits: 2, spreadPoints: 1000,commission: 0,source: 'binance',    externalSymbol: 'BTCUSDT' },
];

// Seed/mock starting prices when no API key is configured.
export const MOCK_PRICES: Record<string, number> = {
  XAUUSD: 2330.50, EURUSD: 1.08550, GBPUSD: 1.27200,
  USDJPY: 156.800, US30: 39200.0, NAS100: 18250.0, BTCUSD: 67500.0,
};
