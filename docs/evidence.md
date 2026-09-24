# Verified evidence

Review date: 2026-09-24. Original execution: 2026-09-01T11:01:54.548Z. Network: **Somnia Shannon testnet**, chain ID `50312`.

## Public lifecycle

The [original proof JSON](../showcase/testnet-proof.json) is retained byte-for-byte. It describes a real one-share NO position with a 0.45 tUSDC collateral cost and a 1.00 tUSDC maximum payout. YES won. The NO position paid zero; no losing redemption was submitted. The final registry state is `Resolved` with zero compensation.

- Registry: [`0xd64b02dDd9d088FA8547F9740B841BEd056bDD2D`](https://shannon-explorer.somnia.network/address/0xd64b02dDd9d088FA8547F9740B841BEd056bDD2D)
- [Registry deployment](https://shannon-explorer.somnia.network/tx/0xf23f6417feff61ba3e8e2bf6d5eb85cc5d37598caf3e1c18ef851726d1179901)
- [Protection order](https://shannon-explorer.somnia.network/tx/0x2683372fa36bdeb2ddfd33661636abf79203632484942a9481477c0038242c0e)
- [Receipt creation](https://shannon-explorer.somnia.network/tx/0x9d2371ee1a08e4c5c9533a3729a004d5c8e8a6cea19edfee1a5f7d6250b02bee)
- [Owner settlement attestation](https://shannon-explorer.somnia.network/tx/0x13a99d56a326680d107ea7926c932845fe1129f255d298d6d57afcbc3dffe487)
- [Final zero-payout receipt](https://shannon-explorer.somnia.network/tx/0x7fe410cbe2de2091947038b9a8168ddcefe5cbb70761e13465ada74b8cf7b04e)
- [DreamDEX resolution](https://shannon-explorer.somnia.network/tx/0x745c0d0db69be1e189ce51dff001b61094e3fd52334a5e2ea348eb4e071fc1b5)

Read-only RPC checks confirmed successful receipts, chain identity and the recorded final shield state. The protection transaction's collateral transfer agrees with the recorded cost. Solidity 0.8.30, optimizer enabled with 200 runs and Cancun EVM target, reproduced the deployed registry runtime **exactly** (3216 bytes) from source at `37bc08c97000521321163dc521d3126601b82b99`.

No chain transaction was submitted during this presentation refresh. The rename leaves contract source, ABI, addresses, market/shield IDs and historical proof JSON unchanged.

## What the evidence does not prove

- An independently verified external payment: settlement is owner-attested.
- A profitable strategy or complete hedge: the demonstrated protection lost its purchase cost.
- Public execution of every winning, voided, partial-fill and recovery path: source/tests cover more than the single published lifecycle.
- A production audit or unconditional transaction-level spending cap. See [trust boundaries](engineering.md#trust-boundaries).

## Verification scope

The initial committed-source review passed 21 TypeScript tests, five Foundry tests, TypeScript checking, the Next.js production build and Pages workflow policy checks. The presentation adds a branding/link regression to the default TypeScript test suite.

The public static calculator was exercised at desktop and narrow mobile widths, checking the reference calculation, evidence links, console errors and horizontal overflow. This is not proof of live quote availability or authenticated wallet execution.

The production-dependency audit (`pnpm audit --prod --json`) reported no advisories at review time. This is a point-in-time dependency result, not a security audit. The existing GitHub workflow deploys Pages; it is not a full application/contract CI suite.

## Hackathon and naming

Built as a project for the [Somnia × DreamDEX Event Contracts Hackathon](https://dorahacks.io/hackathon/event-contracts/detail). The historical [submission sheet](DORAHACKS_SUBMISSION.md) still has unchecked demo-video/submission items. Preparation and working testnet code do not establish submission acceptance or an award.

The public project is now **Settlement Window**, formerly **SettleShield**. Historical proposals and screenshots keep their original labels. Current source and showcase URLs are linked from the [README](../README.md).
