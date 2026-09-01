# SettleShield demo script

Target: 2 minutes 20 seconds to 2 minutes 45 seconds.

Record the public showcase at:

https://sourcesenseitherealone.github.io/settleshield/

Keep the browser at 1440 by 900 or larger. Do not show the local proof wallet, `.env.local`, browser extension settings, or private balances.

## 0:00-0:20 - Problem

Show the hero and protection properties.

Narration:

> A business expects a one-thousand-dollar ETH payment, but confirmation may take fifteen minutes to an hour. The value can fall while settlement is pending. SettleShield uses DreamDEX Event Contracts to offset part of that short-term loss with a known upfront cost, no leverage, and no liquidation.

## 0:20-0:48 - Configure bounded protection

Scroll to the calculator. Keep the default one-thousand-dollar settlement, ten-dollar budget, and ten-dollar gross compensation cap. Select **Calculate protection**.

Narration:

> This Pages build is a static calculator, so it uses our verified forty-five-percent Shannon fill price as a reference rather than claiming a live quote. The same bounded rules run in the full application. A ten-dollar gross payout would cost four dollars and fifty cents, leaving a maximum net offset of five dollars and fifty cents. The cap is partial protection, not a guaranteed exchange rate.

## 0:48-1:15 - Explain the product flow

Point to direction, maximum loss, maximum payout, net offset, and protected shares.

Narration:

> The application discovers the matching ETH Event Contract, verifies its onchain trading state, reads visible DOWN liquidity, and rejects protection that exceeds the budget or available depth. Execution uses an immediate-or-cancel BUY NO order. Zero fills are rejected, and partial fills are reported as partial protection.

## 1:15-1:45 - Show the executed position

Scroll to **Verified position**. Open the BUY NO order in a new tab, then return.

Narration:

> This is not a reconstructed success screen. The proof wallet bought exactly one NO share for zero-point-four-five tUSDC on Somnia Shannon. The order succeeded onchain, and the wallet balance readback confirmed the share. SettleShield then created a receipt linked to the actual fill rather than the requested amount.

## 1:45-2:08 - Link the external settlement

Open the protection receipt and settlement attestation links, then return to the showcase.

Narration:

> The receipt stores the exposure, protection cost, protected shares, market expiry, and DreamDEX transaction hash. A separate attestation records that the external invoice or bridge transfer settled. SettleShield does not pretend to be the payment network. It links the external settlement to its protection position.

## 2:08-2:30 - Resolution and final accounting

Open the DreamDEX resolution and final receipt links.

Narration:

> In this run, ETH closed above its opening price, so YES won and the NO protection paid zero. SettleShield correctly skipped a losing redemption transaction and finalized the receipt with zero compensation. A DOWN win would redeem the held NO shares. A void is recorded separately under the protocol's void payout rules.

## 2:30-2:40 - Close

Return to the hero or repository link.

Narration:

> SettleShield turns Event Contracts into bounded protection for payments, bridges, OTC trades, payroll, and treasury transfers. It protects settlement time rather than creating another trading signal.

## Required final frame

Hold the final frame for three seconds with these URLs visible:

- Showcase: https://sourcesenseitherealone.github.io/settleshield/
- Source: https://github.com/SourceSenseiTheRealOne/settleshield
- Public evidence: https://sourcesenseitherealone.github.io/settleshield/testnet-proof.json
