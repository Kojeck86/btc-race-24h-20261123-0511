import { runBars } from './vendor/makefun-bars.ts';

// Regime-switch trend bot for the cbBTC 24h bars race (long only, one
// position, full size). Two ways to get long, picked by the slow trend:
//
// - TREND: when the trailing 240-bar return tops +1.0% the market is in a
//   confirmed uptrend, so buy and hold it with a wide 4% trailing stop.
//   A scalp that is still open when the trend confirms is promoted to a
//   trend hold instead of being sold.
// - SCALP: while the slow trend is flat or down, only trade fast 30-bar
//   momentum: buy when the trailing 30-bar return tops +1.0%, exit when it
//   falls back below 0%, on a +2% take-profit, or on a 1.5% trailing stop.
//
// Why this split: one-minute noise is ~8 bps against a ~26 bps round trip,
// so any signal that trades often bleeds to whipsaw. The slow trend filter
// keeps the bot in cash through chop and downtrends, the scalp leg still
// catches sharp bounces there, and the trend leg rides a real rally instead
// of selling it on the first pullback. Only closes are used, no clock, no
// randomness, so two runs on the same bars answer identically. The first
// 240 bars only build history: no entry is taken before the slow window is
// full, which also keeps the bot out of the opening noise.

const SYMBOL = 'CBBTC';
// Slow-trend window (240 bars, about 4 hours) and the return that confirms it.
const LONG_WIN = 240;
const LONG_UP_BPS = 100;
// Fast momentum window and the levels that open / close a scalp.
const SHORT_WIN = 30;
const SCALP_IN_BPS = 100;
const SCALP_OUT_BPS = 0;
const SCALP_TP_BPS = 200;
const SCALP_TRAIL_BPS = 150;
// Trailing stop once a trend is confirmed; bars to wait after an exit.
const TREND_TRAIL_BPS = 400;
const COOL_BARS = 10;
const MAX_SLIPPAGE_BPS = 150;

const closes: number[] = [];
let peak = 0;
let entryClose = 0;
let coolLeft = 0;
let mode: 'scalp' | 'trend' | '' = '';

await runBars({
  onBatch(state) {
    const bar = state.latest.get(SYMBOL);
    if (bar === undefined) return [];
    const close = Number(bar.c) / 1e5;
    closes.push(close);
    if (coolLeft > 0) coolLeft--;

    const held = state.positions.get(SYMBOL);
    const qty = held === undefined ? 0n : BigInt(held.qty);
    const inPosition = qty > 0n;
    if (inPosition && close > peak) peak = close;

    // Trailing return over `win` bars, in basis points, from closes only.
    const trailingReturn = (win: number): number => {
      if (closes.length <= win) return 0;
      return (close / closes[closes.length - 1 - win] - 1) * 10000;
    };

    const buyAll = (nextMode: 'scalp' | 'trend') => {
      if (state.warmingUp || state.cash <= 0n) return [];
      entryClose = close;
      peak = close;
      mode = nextMode;
      return [{ side: 'buy', symbol: SYMBOL, notional_quote_units: state.cash, max_slippage_bps: MAX_SLIPPAGE_BPS }];
    };
    const sellAll = () => {
      if (!inPosition) return [];
      coolLeft = COOL_BARS;
      mode = '';
      return [{ side: 'sell', symbol: SYMBOL, qty, max_slippage_bps: MAX_SLIPPAGE_BPS }];
    };

    if (!inPosition) {
      if (coolLeft > 0 || closes.length <= LONG_WIN) return [];
      if (trailingReturn(LONG_WIN) > LONG_UP_BPS) return buyAll('trend');
      if (trailingReturn(SHORT_WIN) > SCALP_IN_BPS) return buyAll('scalp');
      return [];
    }

    // A scalp open when the slow trend confirms becomes a trend hold.
    if (mode === 'scalp' && trailingReturn(LONG_WIN) > LONG_UP_BPS) mode = 'trend';
    const trailBps = mode === 'trend' ? TREND_TRAIL_BPS : SCALP_TRAIL_BPS;
    if (peak > 0 && close < peak * (1 - trailBps / 10000)) return sellAll();
    if (mode === 'scalp') {
      if (entryClose > 0 && close >= entryClose * (1 + SCALP_TP_BPS / 10000)) return sellAll();
      if (trailingReturn(SHORT_WIN) < SCALP_OUT_BPS) return sellAll();
    }
    return [];
  },
});
