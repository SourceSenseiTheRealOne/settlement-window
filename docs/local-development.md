# Local development

Run commands from the repository root. Verification used Node.js 22.23.3, pnpm 10.18.1, Foundry 1.5.1 and Solidity 0.8.30. Install those tools through their official distribution channels if unavailable.

## Static, wallet-free preview

```bash
python -m http.server 4180 --bind 127.0.0.1 --directory showcase
```

Open `http://127.0.0.1:4180/`. This only serves the checked-in reference calculator and historical proof JSON. It does not request a quote or sign a transaction.

## Application and verification

```bash
pnpm install --frozen-lockfile
pnpm test
pnpm typecheck
pnpm build
pnpm start --hostname 127.0.0.1 --port 4173
```

Open `http://127.0.0.1:4173/`. The initial interface needs no wallet. Market discovery and resolution depend on the external Shannon RPC/indexer; an unavailable market is not grounds to invent one. Keep local servers loopback-bound.

In a Linux shell with Foundry installed:

```bash
forge test --root contracts
```

On Windows, use the existing `Ubuntu` WSL distribution, change to this checkout inside WSL, then run the same command. Do not assume a distribution called `Ubuntu-24.04` or a working Foundry installation exists.

The published Pages policy checks are independent of the web build:

```bash
python scripts/verify-pages-workflow.py
python scripts/test-pages-workflow-policy.py
```

The existing browser proof scripts require a running target and a Windows Brave executable at their configured path. `browser:proof` expects a live market quote; it is not an offline acceptance test. They retain historical screenshot filenames.

## Credentials and execution

Tests, builds and the static preview do not require a signer or `.env.local`. Existing private environment files must not be copied into review archives or public deployments. Do not overwrite an existing environment file as part of setup.

The public receipt configuration retains `NEXT_PUBLIC_SETTLESHIELD_RECEIPT_ADDRESS`. The deployed registry is linked in [evidence](evidence.md). Optional RPC/indexer settings are documented in [the configuration source](../src/lib/dreamdex/config.ts).

Wallet connection, order placement, collateral approval, receipt writes and redemption are separate user-authorized Shannon testnet actions. This presentation refresh does not authorize or require them. Do not run deployment, recovery, proof-execution or proof-finalization scripts merely to verify the rename. Their behavior is not equivalent to a read-only build check.

## Rename compatibility

Public name/package: `Settlement Window` / `settlement-window`. Contract ABI/source name: `SettleShieldReceipt`. Existing environment names, proof identifiers and the local Hermes board retain their prior identities. The GitHub Pages project URL is now `/settlement-window/`; old Pages URLs are not assumed to redirect.
