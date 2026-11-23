# Momentum Trend-State Bot — btc-race-24h-20261123-0511

[![make.fun](https://make.fun/badge/btc-race-24h-20261123-0511.svg)](https://make.fun/bounty/btc-race-24h-20261123-0511?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261123-0511)
[![Rank](https://make.fun/badge/btc-race-24h-20261123-0511/Kojeck86/btc-race-24h-20261123-0511/rank.svg)](https://make.fun/bounty/btc-race-24h-20261123-0511/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261123-0511)
[![Reward](https://make.fun/badge/btc-race-24h-20261123-0511/Kojeck86/btc-race-24h-20261123-0511/reward.svg)](https://make.fun/bounty/btc-race-24h-20261123-0511?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261123-0511)

A long-only cbBTC/USDC bot for the make.fun 24-hour bars-replay race. It
switches by regime: when the trailing 240-bar return tops +1.0% the market
is in a confirmed uptrend, so it buys and holds with a wide 4% trailing
stop; while the slow trend is flat or down it only scalps fast 30-bar
momentum (enter above +1.0%, exit below 0%, +2% take-profit, 1.5%
trailing stop). A scalp open when the trend confirms is promoted to a
trend hold. Full-size entries, at most one position, 10-bar cooldown
after each exit. Trades rarely on purpose — a round trip costs ~26 bps
against ~8 bps of per-minute noise, so frequency is the enemy.

On the race's own dev window (22–23 Nov, BTC +3.6% over the day): net
PnL +$21.00, max drawdown 1.98%, 1 trade. On the 15 Nov window (BTC −4%
over the day): net PnL +$8.29, max drawdown 2.60%, 5 trades. Positive on
both regimes. Deterministic: closes only, no clock, no randomness.

Run: `node main.ts` (Node 22, stdlib only; the wire shim is vendored
byte-identical under `vendor/`).
