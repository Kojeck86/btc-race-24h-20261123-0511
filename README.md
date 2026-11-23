# Momentum Trend-State Bot — btc-race-24h-20261123-0511

[![make.fun](https://make.fun/badge/btc-race-24h-20261123-0511.svg)](https://make.fun/bounty/btc-race-24h-20261123-0511?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261123-0511)
[![Rank](https://make.fun/badge/btc-race-24h-20261123-0511/Kojeck86/btc-race-24h-20261123-0511-repo/rank.svg)](https://make.fun/bounty/btc-race-24h-20261123-0511/leaderboard)
[![Reward](https://make.fun/badge/btc-race-24h-20261123-0511/Kojeck86/btc-race-24h-20261123-0511-repo/reward.svg)](https://make.fun/bounty/btc-race-24h-20261123-0511?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261123-0511)

A long-only cbBTC/USDC bot for the make.fun 24-hour bars-replay race. It
holds only while a strong 30-minute momentum regime is on: enter when the
trailing 30-bar return tops +1.0%, exit on momentum decay (below +0.2%),
+2% take-profit, a 1% trailing stop, or a 180-bar time stop. Full-size
entries, at most one position, 10-bar cooldown after each exit. Trades
rarely on purpose — a round trip costs ~26 bps against ~12 bps of
per-minute noise, so frequency is the enemy.

On the kit's proxy dev window (15 Nov, BTC −4% over the day): net PnL
+$12.67, max drawdown 0.94%, 8 trades. Deterministic: closes only, no
clock, no randomness.

Run: `node main.ts` (Node 22, stdlib only; the wire shim is vendored
byte-identical under `vendor/`).
