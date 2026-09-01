# SettleShield Hackathon Submission

## Tagline

Bounded protection for crypto settlement time, powered by DreamDEX Event Contracts.

## Problem

Crypto invoices, OTC trades, bridge transfers, payroll batches, and treasury movements do not settle instantly. While a transfer is pending, the recipient or sender can be exposed to a short-term price move. Existing products often require a full derivatives account, introduce leverage or liquidation, or address speculation rather than the settlement workflow itself.

## Solution

SettleShield lets a user protect part of a pending ETH settlement with a capped DreamDEX ETH DOWN Event Contract position.

The user enters:

- external settlement value;
- expected 15-minute or 1-hour window;
- maximum protection cost;
- desired maximum compensation.

SettleShield discovers the matching Event Contract, verifies its onchain Trading state, reads live DOWN liquidity, and returns bounded terms. If the user accepts, the application places an IOC BUY_NO order on Shannon testnet. An onchain receipt links the external settlement reference, DreamDEX order, oracle resolution, redemption, and actual payout.

## Why it is different

Most prediction-market products help users predict, signal, copy, or automate trades. SettleShield applies Event Contracts to an external economic transaction while it settles.

The positioning is deliberate:

- not insurance;
- not a guaranteed price lock;
- not a perfect hedge;
- not leverage;
- bounded settlement protection with a known maximum cost.

## Technical implementation

- `@somnia-chain/markets-sdk` 0.28.1 for Event Contract discovery, books, canonical chain reads, IOC order execution, positions, resolution, and redemption.
- Typed market selection using `asset=ETH` and `intervalSec=900|3600`; no question-text parsing.
- Stable identity by `marketId`; recycled pool addresses are never used as historical identity.
- Exact bigint price and share arithmetic.
- Visible-depth walk before an order is accepted.
- IOC-only BUY_NO execution.
- Zero-fill failure and honest partial-fill accounting.
- Solidity receipt registry with owner-only settlement attestation and explicit normal/void resolution.
- Next.js product interface with Shannon wallet signing and explorer evidence.

## Safety

- Testnet chain ID is enforced.
- Protection cost cannot exceed the user cap.
- Compensation cannot exceed the external exposure.
- Insufficient liquidity is refused.
- No leverage, liquidation, borrowing, or naked shorting.
- The canonical onchain status is checked immediately before writes.
- Every transaction receipt is checked.
- Private keys are never stored by the application.

## Ecosystem impact

SettleShield introduces Event Contract demand from:

- crypto payments;
- cross-chain bridges;
- OTC settlement;
- DAO treasury operations;
- crypto payroll;
- marketplace escrow;
- stablecoin conversions.

It gives users a reason to interact with DreamDEX even when they do not identify as prediction-market traders.

## Current scope

The hackathon MVP simulates the external payment or bridge workflow and uses a real Shannon Event Contract position. Settlement confirmation is manual or represented by a signed reference. It does not build a complete payment network or bridge.

## Future

- bridge and escrow adapters that attest automatically;
- treasury policy limits and batch protection;
- routing across several Event Contract windows;
- compensation recommendations based on settlement duration;
- sponsored or account-abstraction transaction bundles;
- reusable receipt queries for payment and treasury dashboards.

## Links

- Receipt registry: https://shannon-explorer.somnia.network/address/0xd64b02dDd9d088FA8547F9740B841BEd056bDD2D
- Deployment transaction: https://shannon-explorer.somnia.network/tx/0xf23f6417feff61ba3e8e2bf6d5eb85cc5d37598caf3e1c18ef851726d1179901
- Real BUY_NO IOC protection: https://shannon-explorer.somnia.network/tx/0x2683372fa36bdeb2ddfd33661636abf79203632484942a9481477c0038242c0e
- SettleShield receipt creation: https://shannon-explorer.somnia.network/tx/0x9d2371ee1a08e4c5c9533a3729a004d5c8e8a6cea19edfee1a5f7d6250b02bee
- External settlement attestation: https://shannon-explorer.somnia.network/tx/0x13a99d56a326680d107ea7926c932845fe1129f255d298d6d57afcbc3dffe487
- DreamDEX resolution: https://shannon-explorer.somnia.network/tx/0x745c0d0db69be1e189ce51dff001b61094e3fd52334a5e2ea348eb4e071fc1b5
- Final protection receipt: https://shannon-explorer.somnia.network/tx/0x7fe410cbe2de2091947038b9a8168ddcefe5cbb70761e13465ada74b8cf7b04e
- Public repository: https://github.com/SourceSenseiTheRealOne/settleshield
- GitHub Pages showcase: https://sourcesenseitherealone.github.io/settleshield/
- Demo: add 2-3 minute video URL before submission
- Public proof JSON: https://sourcesenseitherealone.github.io/settleshield/testnet-proof.json
