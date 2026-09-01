# DreamDEX SDK and Documentation Feedback

Tested with `@somnia-chain/markets-sdk` 0.28.1 on Somnia Shannon testnet.

## What worked well

1. **Unified exchange plus exact raw tier**
   - `SomniaMarkets` is convenient for market discovery and human-readable order books.
   - `exchange.client` and `exchange.trader` provide the exact bigint and chain-state paths needed for safety-sensitive execution.

2. **Typed binary market metadata**
   - `asset`, `intervalSec`, `venueId`, `marketId`, and outcome symbols avoid fragile question parsing.
   - `getMarketOnchain(marketId)` gives a clear authoritative status check.

3. **Outcome-book abstraction**
   - Fetching the NO symbol returns a book expressed directly in NO terms even though the protocol stores one YES-priced book. This simplifies product UX.

4. **Resolution surface**
   - `getMarketResolution` exposes opening and closing oracle answers plus resolution events.
   - The separate `listBinaryMarkets({ status: "Finalized" })` path is appropriate for redemption workflows after markets leave the live registry.

5. **Current documentation**
   - The Event Contract gotchas page accurately calls out onchain status checks, IOC remainders, mandatory expiry, venue scoping, recycled pools, and settled-market discovery.

## Friction encountered

1. **One-shot Node processes can remain alive after `exchange.close()`**
   - A read-only discovery script returned complete market data but remained alive until the shell timeout because a WebSocket handle was still retained.
   - A documented `closeAndWait()` or deterministic closure guarantee would help CLIs, server jobs, and test runners.

2. **Venue discovery requires extra product logic**
   - A deployment can host several venues, while venue IDs can change.
   - A first-party `listVenues()` or `resolveVenueByName("dreamDEX")` API would be safer than copying IDs or inferring from current markets.

3. **Settlement fee metadata is nullable**
   - `getMarketFees(marketId)` can return null even though the product must display a maximum payout.
   - A documented onchain fallback helper would remove duplicated fee-resolution logic.

4. **Browser transaction examples are sparse**
   - Most examples use a private key.
   - A complete `walletClient` example for market discovery, IOC execution, fill accounting, and redemption would accelerate consumer-facing applications.

5. **Receipt and fill examples should emphasize actual fill cost**
   - For bounded protection, requested limit cost is not the same as actual cost.
   - An official snippet that folds `fills[].fillPrice` and `quantityFilled`, including BUY_NO price complementation, would prevent incorrect accounting.

6. **Void handling deserves a full recipe**
   - A void requires explicit per-outcome redemption and must not be represented as a directional winner.
   - A dedicated SDK recipe showing YES, NO, and both-side void redemption would help wallets and portfolio interfaces.

## Suggested additions

- Deterministic client shutdown API.
- Named venue discovery.
- `getEffectiveSettlementFee(marketId)` with indexer and chain fallback.
- End-to-end browser wallet recipe.
- Exact fill-cost helper for all four binary sides.
- Explicit resolution union such as:

```ts
type BinaryResolution =
  | { status: "pending" }
  | { status: "resolved"; winningOutcome: 0 | 1 }
  | { status: "voided"; payouts: [0.5, 0.5] };
```

This would prevent callers from accidentally treating the pre-resolution default `winningOutcome` value as a real result.
