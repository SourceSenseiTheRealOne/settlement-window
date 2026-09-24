# Engineering notes

Settlement Window connects a small financial domain model, a market SDK adapter and an owner-authorized receipt registry. It does not implement a payment rail or bridge.

## Flow and source boundaries

1. The [market reader](../src/lib/dreamdex/market-reader.ts) selects an ETH window, scopes the DreamDEX venue, reads canonical trading state and visible NO liquidity.
2. The [quote domain](../src/domain/protection.ts) calculates required shares, cost, payout and net offset using bigint USD micros. Invalid amounts, unsupported intervals, excess compensation, insufficient depth and over-budget estimates are rejected.
3. The [order adapter](../src/lib/dreamdex/order-writer.ts) checks Shannon chain identity and current pool/token wiring, creates an immediate-or-cancel BUY_NO order and accounts for the actual reported fills. A zero fill is not protection; a partial fill is not a full position.
4. The [browser workflow](../src/features/protection/ProtectionWizard.tsx) separately creates a receipt, submits an owner settlement attestation and handles final accounting after the market resolves.
5. The [Solidity registry](../contracts/src/SettleShieldReceipt.sol) enforces ownership and the `Protected → Settled → Resolved` sequence. It does not custody collateral.

`marketId` is the logical identity. Pool addresses are current wiring, not permanent market identifiers: a reused pool must not silently substitute another outcome token or share ID.

## Trust boundaries

**Receipt truth is owner-authored.** The contract checks nonzero fields, selected amount bounds, ownership and transition order. It does not verify the referenced DreamDEX transaction, external invoice/bridge settlement, oracle outcome or redemption payment. Those values are supplied by the caller. The application reads market state, but its checks are not independent contract enforcement.

**The quote budget is not an unconditional on-chain spending cap.** The application checks an estimated aggregate cost before submission and rejects a reported cost overrun afterward. The order uses the worst quoted level as its price limit; the post-fill check cannot undo a trade. Gas and network fees are outside the displayed quote cost. Hard transaction-level budget enforcement remains follow-up work.

**Event outcomes are not a complete hedge.** A fixed binary payout need not match the size or timing of the external price movement. Liquidity, expiry, fees, pool reuse and partial fills matter. Window selection does not guarantee protection lasts until an external transfer completes.

**The static showcase is not the application quote engine.** Its JavaScript uses a fixed historical reference price and illustrative scaling. It does not fetch live liquidity, connect a wallet or execute an order. Application calculations use bigint; the illustrative static calculator uses JavaScript numbers.

**Multi-transaction workflow.** Order execution, receipt creation, settlement attestation and finalization are separate steps. A completed order does not prove a later receipt write succeeded. Winning and voided paths exist in source/tests; the published lifecycle demonstrates the losing NO case.

## What this project demonstrates

- Translating external economic exposure into explicit quote inputs and refusal cases.
- Keeping logical market identity separate from reusable physical infrastructure.
- Distinguishing intended quantity from actual execution and final compensation.
- Testing domain rules and adapters separately from contract state transitions.
- Preserving a losing testnet outcome rather than manufacturing a profitable demonstration.

These are prototype engineering results, not an audit or a claim of production readiness. See [evidence](evidence.md) and [safe local setup](local-development.md).
