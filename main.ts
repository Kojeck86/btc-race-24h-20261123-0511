// Momentum trend-state bot for btc-race-24h-20261123-0511 (agent-fun/bars-replay/v1).
//
// Idea, from the dev window's own numbers: on 1-minute cbBTC bars the per-minute
// noise is ~12 bps while a full round trip costs ~26 bps in fees, slippage and
// impact, so frequent trading bleeds money and every classic fast signal
// (EMA crosses, RSI mean reversion) loses to whipsaw. What does carry an edge
// is being long while a strong move is already under way: bars whose trailing
// 30-minute return was above +0.8% went on to average +30.6 bps over the next
// 30 minutes, with 51% of them beating the round-trip cost, while a fresh
// cross of that same threshold averaged -22.7 bps (the first bar of a run is
// usually a local peak). So this bot does not chase crosses: it holds only
// while the 30-minute momentum regime is on, and sits in cash the rest of the
// day. It trades rarely (8 fills on the proxy dev window) and never holds
// through a decayed trend.
//
//   Entry (flat, not cooling down): trailing 30-bar return above +1.0%.
//     Full cash, one position, long only.
//   Exit (holding), whichever comes first:
//     - momentum decay: trailing 30-bar return below +0.2%;
//     - take profit: close at least +2% above the entry close;
//     - trailing stop: close at least 1% below the highest close since entry;
//     - time stop: 180 bars held.
//   After a sell fills, a 10-bar cooldown keeps it from re-entering the same
//   bar's noise. Every order caps slippage at 150 bps from the decision close.
//
// All decisions use only the closes the harness has sent, in float64; no
// clock, no environment, no randomness, so two runs on the same bars send
// the same orders. Position state is reconciled from the account each batch,
// so a rejected order never leaves a phantom position behind.

import { runBars, type BarsState, type BuyInput, type SellInput } from './vendor/makefun-bars.ts';

const SYMBOL = 'CBBTC';
/** Lookback for the momentum regime, in bars. */
const LOOKBACK = 30;
/** Entry: trailing return above this to go long. */
const ENTRY_RET = 0.01;
/** Exit: trailing return below this and the regime is off. */
const EXIT_RET = 0.002;
/** Take profit, as a fraction above the entry close. */
const TAKE_PROFIT = 0.02;
/** Trailing stop, as a fraction below the highest close since entry. */
const TRAIL = 0.01;
/** Time stop, in bars held. */
const MAX_HOLD = 180;
/** Bars to wait after a sell fills before entering again. */
const COOLDOWN = 10;
/** Max slippage vs the decision close, in bps. */
const MAX_SLIPPAGE_BPS = 150;

const closes: number[] = [];
let entryClose = 0;
let peakSinceEntry = 0;
let barsHeld = 0;
let cooldown = 0;
/** Close the last buy was decided on; confirmed when the position appears. */
let pendingEntry = 0;

function ret30(): number | null {
  const n = closes.length;
  if (n <= LOOKBACK) return null;
  const now = closes[n - 1]!;
  const then = closes[n - 1 - LOOKBACK]!;
  return now / then - 1;
}

await runBars({
  onBatch(state: BarsState, batch) {
    for (const bar of batch.bars) {
      if (bar.symbol === SYMBOL) closes.push(Number(bar.c));
    }
    if (state.warmingUp) return [];

    const held = state.positions.get(SYMBOL);
    const close = closes.length > 0 ? closes[closes.length - 1]! : 0;

    // Reconcile: a position that just appeared confirms the pending buy.
    if (held !== undefined) {
      if (entryClose === 0) {
        entryClose = pendingEntry !== 0 ? pendingEntry : close;
        peakSinceEntry = Math.max(entryClose, close);
        barsHeld = 0;
      }
      if (close > peakSinceEntry) peakSinceEntry = close;
      barsHeld++;
    } else {
      entryClose = 0;
      peakSinceEntry = 0;
      barsHeld = 0;
      // No position: a buy sent last batch was rejected (or none was sent),
      // so a stale pending entry close must not carry into a later position.
      pendingEntry = 0;
    }
    if (cooldown > 0) cooldown--;

    if (held !== undefined) {
      const r = ret30();
      const decayed = r !== null && r < EXIT_RET;
      const tookProfit = close >= entryClose * (1 + TAKE_PROFIT);
      const trailed = close < peakSinceEntry * (1 - TRAIL);
      const timedOut = barsHeld >= MAX_HOLD;
      if (decayed || tookProfit || trailed || timedOut) {
        const sell: SellInput = { side: 'sell', symbol: SYMBOL, qty: held.qty, max_slippage_bps: MAX_SLIPPAGE_BPS };
        cooldown = COOLDOWN;
        return [sell];
      }
      return [];
    }

    if (cooldown > 0) return [];
    const r = ret30();
    if (r !== null && r > ENTRY_RET) {
      const cash = state.cash;
      if (cash < BigInt(state.hello.fees.min_notional_quote_units)) return [];
      pendingEntry = close;
      const buy: BuyInput = { side: 'buy', symbol: SYMBOL, notional_quote_units: cash, max_slippage_bps: MAX_SLIPPAGE_BPS };
      return [buy];
    }
    return [];
  },
});
