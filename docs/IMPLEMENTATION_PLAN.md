# SettleShield Implementation Plan

> Historical material from the **SettleShield** prototype. The current project is [Settlement Window](../README.md); use its current setup and evidence notes. Original names, claims and URLs below are retained as history, not current operating guidance.


**Goal:** Build a hackathon-ready Shannon testnet application that buys bounded ETH DOWN Event Contract protection while an external crypto settlement is pending and records the linked lifecycle onchain.

**Product boundary:** SettleShield is bounded settlement protection. It is not insurance, an option, or a guaranteed price lock. It never claims to cover the full price move.

## Stack

- Next.js 16 + React 19 + strict TypeScript
- `@somnia-chain/markets-sdk` 0.28.1 + viem 2
- Vitest for focused behavioral tests
- Foundry Solidity receipt registry
- Browser-injected EVM wallet on Somnia Shannon testnet, chain ID 50312

## Files and slices

1. **Protection domain**
   - `src/domain/protection.ts`: budget, payout, depth, partial-fill, and bounded-compensation rules.
   - `src/domain/protection.test.ts`: reject unsupported intervals, budget overflow, insufficient liquidity, and impossible protection; return a bounded quote for valid depth.

2. **DreamDEX testnet adapter**
   - `src/lib/dreamdex/config.ts`: Shannon endpoints and official deployment addresses.
   - `src/lib/dreamdex/market-reader.ts`: discover active ETH binary markets for 900/3600-second intervals, fetch NO books, and verify onchain `Trading` state.
   - `src/lib/dreamdex/order-writer.ts`: integer tick/lot IOC execution with wallet signing and receipt/fill checks.
   - `src/app/api/markets/route.ts`: browser-safe market snapshots only.

3. **Protection workflow UI**
   - `src/app/page.tsx` and feature components: create invoice/bridge exposure, select 15m/1h, set budget and compensation, review direction/cost/payout/liquidity, connect wallet, execute.
   - Explicit loading, empty, error, refused, partial-fill, protected, settled, and redeemed states.
   - Copy consistently says bounded protection and known maximum cost.

4. **Onchain receipt**
   - `contracts/src/SettleShieldReceipt.sol`: owner-created shield receipt keyed by `shieldId`; records exposure hash, DreamDEX market/order transaction, manual settlement attestation, resolution, payout/redemption transaction hash, and status.
   - `contracts/test/SettleShieldReceipt.t.sol`: creation, ownership, duplicate rejection, settlement attestation, and finalization behavior.
   - UI writes receipt after a filled DreamDEX order and updates it after settlement/redemption.

5. **Submission package**
   - `README.md`: setup, safety model, architecture, testnet deployment, and demo flow.
   - `docs/DEMO_SCRIPT.md`: under-three-minute judge demo.
   - `docs/SUBMISSION.md`: title, tagline, problem, solution, technical implementation, originality, impact, and limitations.
   - `scripts/testnet-proof.ts`: discover a live ETH market, verify liquidity, execute a capped IOC position, record tx/fill evidence, and emit a sanitized JSON proof.

6. **Coding Lab registration**
   - `registry/settleshield/project.yaml`: canonical project path and focused gates.

## Hard safety rules

- Shannon testnet only; reject every other chain.
- Only ETH markets with `intervalSec` 900 or 3600 and authoritative onchain status `Trading`.
- Buy NO/DOWN only; no leverage, liquidation, borrowing, or naked shorting.
- Protection cost must not exceed the user budget.
- Required size must be supportable by visible NO ask depth; refuse insufficient liquidity.
- IOC orders only. Never leave an unfilled remainder resting.
- A zero fill is failure. A partial fill is shown as partial protection and never represented as full protection.
- Check every transaction receipt for onchain reversion and record actual filled quantity.
- Never store wallet keys in source or browser persistence.

## Focused commands

```bash
npx --yes pnpm@10.18.1 test
npx --yes pnpm@10.18.1 build
wsl.exe -d Ubuntu-24.04 -- bash -lc 'cd contracts && forge test'
npx --yes pnpm@10.18.1 testnet:proof
```

## Completion

The local MVP is complete only when focused tests pass, the production build succeeds, the app runs, and a real Shannon testnet protection transaction plus onchain SettleShield receipt can be linked by explorer URLs. Missing wallet funding, missing liquidity, or unavailable DreamDEX testnet blocks live completion and must be reported directly.
