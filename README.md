# Settlement Window

A Somnia × DreamDEX hackathon prototype exploring partial protection against price changes while an ETH payment or transfer settles.

**[Open the showcase](https://sourcesenseitherealone.github.io/settlement-window/)** · [Engineering](docs/engineering.md) · [Setup](docs/local-development.md) · [Verified evidence](docs/evidence.md)

The application quotes and executes ETH NO/DOWN Event Contracts, accounts for partial fills, and links the position to an owner-attested settlement receipt. The public showcase is a **static reference calculator and proof viewer**, not a live trading application.

## Status

A real Somnia Shannon testnet position bought one NO share for **0.45 tUSDC**. YES won; the position paid **zero**, and the receipt was finalized with zero compensation. The loss is retained in the evidence rather than presented as a successful hedge.

This is a hackathon project, not audited infrastructure, insurance, a guaranteed exchange rate or full coverage. Hackathon preparation is documented; no submission acceptance or award is claimed.

## Engineering focus

- **Financial calculations:** bigint USD-micro arithmetic in the application quote engine, with explicit liquidity, budget and compensation checks.
- **Market identity:** stable market IDs checked against current pool/token wiring before execution, because pools can be reused.
- **Execution accounting:** immediate-or-cancel orders, zero-fill rejection, partial-fill reporting and separate winning, losing and voided outcomes.
- **Receipt lifecycle:** an owner-authorized Solidity registry links the position, settlement attestation and final accounting without holding funds.

Read the [trust boundaries and known limitations](docs/engineering.md#trust-boundaries) before treating the prototype as a financial control.

## Run locally

Node.js 22 and pnpm 10.18.1 were used for verification. No wallet is needed to run the tests or inspect the interface.

```bash
pnpm install --frozen-lockfile
pnpm test
pnpm typecheck
pnpm build
pnpm start --hostname 127.0.0.1 --port 4173
```

For Solidity tests, run `forge test --root contracts` in a Linux/WSL environment with Foundry installed. See [local development](docs/local-development.md) for the read-only preview and transaction boundaries.

## Project layout

| Path | Responsibility |
|---|---|
| `src/domain/` | Quote rules and financial calculations |
| `src/lib/dreamdex/` | Market discovery, execution and resolution adapters |
| `src/features/protection/` | Browser workflow |
| `contracts/` | Receipt registry and Foundry tests |
| `showcase/` | Public static calculator and original testnet evidence |
| `docs/` | Engineering, verification and historical hackathon material |

**Stack:** Next.js, React, TypeScript, viem, Somnia Markets SDK, Solidity, Foundry and Vitest.

## Name and history

Formerly **SettleShield**. The repository and visible product use Settlement Window; `SettleShieldReceipt`, environment-variable names, original proof files and historical records retain their existing identities. No contract was redeployed for the rename.

Canonical collection: `hackathon-projects / somnia / settlement-window`.
