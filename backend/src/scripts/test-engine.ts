import assert from 'node:assert';
import * as e from '../modules/trading/engine';
import { DEFAULT_SYMBOLS } from '../modules/marketdata/symbols';

const EUR = DEFAULT_SYMBOLS.find((s) => s.name === 'EURUSD')!;
const XAU = DEFAULT_SYMBOLS.find((s) => s.name === 'XAUUSD')!;
const JPY = DEFAULT_SYMBOLS.find((s) => s.name === 'USDJPY')!;
let pass = 0; const ok = (c: boolean, m: string) => { assert.ok(c, m); console.log('  ✓', m); pass++; };

console.log('— spread & quote —');
const q = e.applySpread(1.10000, EUR);
ok(q.ask > q.bid, 'ask > bid after spread');
ok(Math.abs(e.spreadValue(q, EUR) - EUR.spreadPoints) < 0.5, 'spread ~= configured points');
ok(e.executionPrice('BUY', q) === q.ask && e.executionPrice('SELL', q) === q.bid, 'BUY@ask / SELL@bid');

console.log('— margin —');
ok(e.requiredMargin(EUR, 1, 1.10000, 100) === 1100, '1 lot EURUSD @1:100 = $1100');
ok(e.requiredMargin(EUR, 0.1, 1.10000, 100) === 110, '0.1 lot = $110');
ok(e.requiredMargin(XAU, 1, 2330.5, 100) === 2330.5, '1 lot XAU (contract 100) margin');

console.log('— P&L (BUY closes at bid, SELL at ask) —');
const buy: e.OpenPositionState = { side: 'BUY', lots: 1, openPrice: 1.10000, marginUsed: 1100, commission: 0, swap: 0, symbol: EUR };
ok(e.positionPnL(buy, { bid: 1.10500, ask: 1.10510 }) === 500, 'BUY +50 pips = +$500');
const sell: e.OpenPositionState = { side: 'SELL', lots: 1, openPrice: 1.10000, marginUsed: 1100, commission: 0, swap: 0, symbol: EUR };
ok(e.positionPnL(sell, { bid: 1.09490, ask: 1.09500 }) === 500, 'SELL +50 pips = +$500');
ok(e.positionPnL(buy, { bid: 1.09500, ask: 1.09510 }) === -500, 'BUY -50 pips = -$500');

console.log('— account snapshot —');
const snap = e.buildSnapshot(10000, [{ pos: buy, quote: { bid: 1.10500, ask: 1.10510 } }]);
ok(snap.equity === 10500, 'equity = balance + floating');
ok(snap.usedMargin === 1100 && snap.freeMargin === 9400, 'used & free margin');
ok(snap.marginLevel === 954.55, 'margin level %');
ok(e.buildSnapshot(10000, []).marginLevel === Infinity, 'no positions -> Infinity level');

console.log('— risk-based lot sizing —');
const lots = e.lotsForRisk(EUR, 10000, 2, 1.10000, 1.09000);
ok(lots === 0.2, '2% of 10k over 100-pip SL = 0.2 lots');

console.log('— SL / TP detection —');
const slBuy: e.OpenPositionState = { ...buy, stopLoss: 1.09500, takeProfit: 1.10500 };
ok(e.shouldHitStopLoss(slBuy, { bid: 1.09500, ask: 1.09510 }) === true, 'BUY SL hit at bid<=SL');
ok(e.shouldHitTakeProfit(slBuy, { bid: 1.10500, ask: 1.10510 }) === true, 'BUY TP hit at bid>=TP');
ok(e.shouldHitStopLoss(slBuy, { bid: 1.10000, ask: 1.10010 }) === false, 'BUY SL not hit mid-range');

console.log('— pending order triggers —');
ok(e.shouldTriggerPending('BUY_LIMIT', 1.09000, { bid: 1.08990, ask: 1.09000 }) === true, 'BUY_LIMIT triggers when ask<=trigger');
ok(e.shouldTriggerPending('SELL_STOP', 1.09000, { bid: 1.09000, ask: 1.09010 }) === true, 'SELL_STOP triggers when bid<=trigger');
ok(e.shouldTriggerPending('BUY_STOP', 1.11000, { bid: 1.10990, ask: 1.11000 }) === true, 'BUY_STOP triggers when ask>=trigger');
ok(e.shouldTriggerPending('BUY_LIMIT', 1.09000, { bid: 1.10000, ask: 1.10010 }) === false, 'BUY_LIMIT does not trigger far above');

console.log('— margin call / stop out —');
const levels = { warn70: 70, marginCall: 100, stopOut: 50 };
ok(e.evaluateMargin({ ...snap, marginLevel: 200 } as any, levels) === 'OK', 'level 200 -> OK');
ok(e.evaluateMargin({ ...snap, marginLevel: 95 } as any, levels) === 'MARGIN_CALL', 'level 95 -> MARGIN_CALL');
ok(e.evaluateMargin({ ...snap, marginLevel: 40 } as any, levels) === 'STOP_OUT', 'level 40 -> STOP_OUT');
ok(e.evaluateMargin({ balance:1,equity:1,usedMargin:0,freeMargin:1,marginLevel:Infinity,floatingPnL:0 }, levels) === 'OK', 'no margin used -> OK');
ok(JSON.stringify(e.selectStopOutCandidates([{id:'a',pnl:-5},{id:'b',pnl:-50},{id:'c',pnl:10}])) === JSON.stringify(['b','a','c']), 'stop-out closes worst-loss first');

console.log('— commission —');
ok(e.commissionFor({ ...EUR, commission: 7 }, 2) === 14, '$7/lot * 2 lots = $14');

console.log(`\n✅ ENGINE: ${pass}/${pass} assertions passed`);
