# SettleShield

**Bounded protection for crypto settlement time, powered by DreamDEX Event Contracts.**

SettleShield protects part of the USD value of a pending ETH payment, bridge transfer, or OTC settlement. While an external transaction is waiting to complete, SettleShield buys a capped ETH DOWN Event Contract position on DreamDEX. If ETH closes lower, the winning payout can offset part of the settlement loss. If ETH closes higher, the external ETH is worth more and the known protection cost is the maximum loss.

SettleShield is not insurance, an option, or a guaranteed price lock. Binary Event Contracts cannot reproduce a perfect hedge. The application always displays this limitation.

## Hackathon fit

SettleShield uses Event Contracts for an external economic workflow rather than speculative signal generation:

- live ETH 15-minute and 1-hour Event Contract discovery;
- onchain status checks before every write;
- live DOWN/NO book depth and bounded quote calculation;
- wallet-signed IOC order execution;
- fill and position accounting;
- external settlement attestation;
- oracle resolution and payout redemption;
- an onchain receipt linking the external settlement, protection order, and final payout.

## Safety behavior

- Shannon testnet only, chain ID `50312`.
- ETH DOWN/NO positions only.
- No leverage, borrowing, naked shorting, or liquidation.
- User-defined maximum protection cost.
- Requested compensation cannot exceed the external exposure.
- Protection is refused when visible liquidity cannot supply the requested amount.
- IOC orders only, so an unfilled remainder never rests with escrow locked.
- Zero fills are failure. Partial fills are labeled partial protection.
- Canonical onchain market status is checked immediately before execution.
- Every transaction receipt is checked.
- No private key is stored by the application.

## Architecture

```text
Browser wallet
    |
    | 1. Request live quote
    v
Next.js market API
    |
    +--> @somnia-chain/markets-sdk
    |      - Shannon indexer discovery
    |      - onchain Trading status
    |      - DOWN/NO order book
    |
    | 2. Sign IOC BUY_NO
    v
DreamDEX Event Contract pool
    |
    | 3. Link real fill
    v
SettleShieldReceipt contract
    |
    +--> external settlement attestation
    +--> oracle resolution read
    +--> winning NO redemption
    +--> final payout receipt
```

`marketId` is the stable Event Contract identity. Pool addresses are treated as current market wiring because DreamDEX recycles pools between windows.

## Stack

- Next.js 16.3.4
- React 19.2.8
- TypeScript 7 strict mode
- `@somnia-chain/markets-sdk` 0.28.1
- viem 2.56.1
- Solidity 0.8.30 and Foundry
- Vitest 4

## Local setup

Requirements:

- Node.js 20 or newer
- An injected EVM wallet for browser execution
- Foundry in WSL for contract tests and deployment
- Shannon STT for gas and DreamDEX test collateral

```bash
npx --yes pnpm@10.18.1 install
cp .env.example .env.local
npx --yes pnpm@10.18.1 dev
```

Open `http://localhost:3000`.

## Environment

```dotenv
NEXT_PUBLIC_SETTLESHIELD_RECEIPT_ADDRESS=0x...
DREAMDEX_VENUE_ID=0x679795a0195a1b76cdebb7c51d74e058aee92919b8c3389af86ef24535e8a28c
```

Optional CLI-only proof variables:

```dotenv
TESTNET_PRIVATE_KEY=0x...
PROOF_EXECUTE=false
PROOF_INTERVAL_SEC=900
PROOF_EXPOSURE_USD=1000
PROOF_COMPENSATION_USD=1
PROOF_MAX_COST_USD=1
```

Never commit `.env.local` or wallet credentials.

## Test and build

```bash
npx --yes pnpm@10.18.1 test
npx --yes pnpm@10.18.1 typecheck
npx --yes pnpm@10.18.1 build
npx --yes pnpm@10.18.1 browser:proof
wsl.exe -d Ubuntu-24.04 -- bash -lc 'cd contracts && $HOME/.foundry/bin/forge test'
```

The browser proof launches an isolated headless Brave process, requests a live DreamDEX quote, checks desktop and mobile horizontal overflow, rejects console/page errors, and writes:

- `docs/assets/settleshield-desktop.png`
- `docs/assets/settleshield-mobile.png`

## Shannon deployment

- Receipt registry: [`0xd64b02dDd9d088FA8547F9740B841BEd056bDD2D`](https://shannon-explorer.somnia.network/address/0xd64b02dDd9d088FA8547F9740B841BEd056bDD2D)
- Deployment transaction: [`0xf23f6417feff61ba3e8e2bf6d5eb85cc5d37598caf3e1c18ef851726d1179901`](https://shannon-explorer.somnia.network/tx/0xf23f6417feff61ba3e8e2bf6d5eb85cc5d37598caf3e1c18ef851726d1179901)
- Deployment receipt: success
- Runtime bytecode: 3,216 bytes

## Deploy the receipt registry to Shannon

From WSL, with `TESTNET_PRIVATE_KEY` set only in your shell:

```bash
$HOME/.foundry/bin/forge create \
  src/SettleShieldReceipt.sol:SettleShieldReceipt \
  --root contracts \
  --rpc-url https://api.infra.testnet.somnia.network \
  --private-key "$TESTNET_PRIVATE_KEY" \
  --broadcast
```

Copy the deployed contract address to `NEXT_PUBLIC_SETTLESHIELD_RECEIPT_ADDRESS`, then restart Next.js.

## Real testnet proof

The CLI proof refuses to send unless `PROOF_EXECUTE=true` and a signer plus receipt address are configured.

```bash
PROOF_EXECUTE=true npx --yes pnpm@10.18.1 testnet:proof
```

A sanitized receipt is written to `proofs/testnet-proof.json`. Private keys are never included.

## Product flow

1. Choose invoice or bridge transfer.
2. Enter settlement value, expected window, maximum cost, and desired compensation.
3. SettleShield finds the current ETH Event Contract and checks DOWN liquidity.
4. Review direction, known cost, maximum payout, net offset, and visible depth.
5. Connect a Shannon wallet and execute the IOC position.
6. Record the fill in `SettleShieldReceipt`.
7. Confirm the external settlement using its transaction or signed attestation reference.
8. After DreamDEX resolution, redeem a winning DOWN position and finalize the receipt.

## Repository map

```text
contracts/                       Solidity receipt registry and Foundry tests
docs/DEMO_SCRIPT.md              under-three-minute demo narration
docs/SUBMISSION.md               hackathon submission copy
docs/SDK_FEEDBACK.md             required SDK and docs feedback
scripts/testnet-proof.ts         real Shannon proof runner
src/domain/                      bounded quote rules
src/lib/dreamdex/                market, order, resolution, wallet adapters
src/lib/receipt/                 receipt contract writes
src/features/protection/         product workflow UI
src/app/api/                     market and resolution APIs
```

## Official resources

- Hackathon: https://dorahacks.io/hackathon/event-contracts/detail
- DreamDEX Event Contracts: https://docs.dreamdex.io/developers/event-contracts
- DreamDEX Bot Kit: https://github.com/somnia-chain/dreamdex-bot-kit
- Shannon explorer: https://shannon-explorer.somnia.network
- Somnia testnet hub: https://testnet.somnia.network

## License

MIT
