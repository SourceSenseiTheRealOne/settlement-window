# DoraHacks submission sheet

Official event: https://dorahacks.io/hackathon/event-contracts/detail

Submission page: https://dorahacks.io/hackathon/event-contracts/buidl

## Project name

SettleShield

## One-line pitch

Bounded protection for crypto payments and bridge transfers while settlement is pending, powered by DreamDEX Event Contracts.

## Short description

SettleShield protects part of a crypto transaction's value during the gap between initiation and final settlement. It finds a matching ETH DOWN Event Contract on DreamDEX, enforces a user-defined cost cap, executes an immediate-or-cancel position, and links the fill to an onchain settlement receipt. The product does not promise a full hedge or guaranteed exchange rate.

## Problem

A business can issue a crypto invoice, start a bridge transfer, or agree to an OTC trade at one value and receive a different value when settlement finishes. The delay may be only fifteen minutes, but a sharp move during that window can change the transaction's economics. Existing Event Contract interfaces focus mainly on speculation rather than an external payment or transfer.

## Solution

SettleShield treats the settlement delay as a bounded exposure. Before the external transaction completes, the user chooses a maximum protection cost and compensation cap. SettleShield checks current DreamDEX liquidity and buys an ETH NO/DOWN Event Contract only when the requested protection fits those limits. A winning position can offset part of a price decline. The maximum loss is the known protection cost.

## Product flow

1. Create a simulated crypto invoice or bridge transfer.
2. Choose a fifteen-minute or one-hour settlement window.
3. Set the maximum protection cost and gross compensation cap.
4. Discover a matching DreamDEX Event Contract and check its onchain state and visible DOWN liquidity.
5. Execute a BUY NO immediate-or-cancel order on Somnia Shannon.
6. Create an onchain SettleShield receipt linked to the actual fill.
7. Attest the external settlement separately.
8. Read the canonical DreamDEX result, redeem only when claimable, and finalize actual compensation.

## What makes it different

SettleShield uses Event Contracts to support an external economic transaction while it settles. It is not a trading-signal dashboard, autonomous trading agent, copy-trading tool, or probability interface. The initial use case is crypto invoices and bridge transfers, with the same model extending to OTC trades, payroll, escrow, and treasury operations.

## Safety boundaries

- User-defined protection budget cap
- Known maximum loss
- No leverage or liquidation
- Liquidity checks before execution
- Immediate-or-cancel orders so stale protection does not rest on the book
- Explicit partial-fill reporting
- Separate handling for losing, winning, and voided markets
- No claim of full coverage, insurance, or a guaranteed exchange rate

## Technical implementation

The application uses Next.js, React, TypeScript, viem, Solidity, Foundry, and `@somnia-chain/markets-sdk` version 0.28.1. Values use bigint USD micros rather than floating-point arithmetic. Market discovery verifies the typed ETH asset, interval, DreamDEX venue, and canonical onchain trading state. The receipt contract stores the external exposure, protection order, actual bounded amounts, settlement attestation, resolution, payout, and redemption reference.

## Testnet result

The proof wallet bought one NO share on the one-hour ETH Event Contract for 0.45 tUSDC. The transaction succeeded and the wallet balance readback confirmed the share. SettleShield created the linked receipt and recorded the external settlement attestation.

ETH later closed above its opening price, so YES won. The NO position paid zero. SettleShield skipped a losing redemption transaction and finalized the receipt with zero compensation. This demonstrates both the execution path and honest loss accounting.

## Public links

- Product showcase: https://sourcesenseitherealone.github.io/settleshield/
- Public repository: https://github.com/SourceSenseiTheRealOne/settleshield
- Public proof JSON: https://sourcesenseitherealone.github.io/settleshield/testnet-proof.json
- Receipt registry: https://shannon-explorer.somnia.network/address/0xd64b02dDd9d088FA8547F9740B841BEd056bDD2D
- Protection order: https://shannon-explorer.somnia.network/tx/0x2683372fa36bdeb2ddfd33661636abf79203632484942a9481477c0038242c0e
- Receipt creation: https://shannon-explorer.somnia.network/tx/0x9d2371ee1a08e4c5c9533a3729a004d5c8e8a6cea19edfee1a5f7d6250b02bee
- Settlement attestation: https://shannon-explorer.somnia.network/tx/0x13a99d56a326680d107ea7926c932845fe1129f255d298d6d57afcbc3dffe487
- DreamDEX resolution: https://shannon-explorer.somnia.network/tx/0x745c0d0db69be1e189ce51dff001b61094e3fd52334a5e2ea348eb4e071fc1b5
- Final receipt: https://shannon-explorer.somnia.network/tx/0x7fe410cbe2de2091947038b9a8168ddcefe5cbb70761e13465ada74b8cf7b04e
- SDK feedback: https://github.com/SourceSenseiTheRealOne/settleshield/blob/development/docs/SDK_FEEDBACK.md

## Demo video

Pending. Paste the final public 2-3 minute video URL here before submitting on DoraHacks.

## Future work

The narrow MVP proves the protection and receipt lifecycle without building another bridge or payment network. Next steps are automatic bridge and escrow attestations, treasury policy limits, batch protection, routing across several Event Contract windows, and sponsored transaction bundles.

## Final submission checklist

- [x] Working Shannon testnet prototype
- [x] Public source repository
- [x] Public product showcase
- [x] SDK and documentation feedback
- [x] Onchain execution and final receipt evidence
- [ ] Public 2-3 minute demo video URL
- [ ] DoraHacks BUIDL submitted to the Event Contracts Hackathon
