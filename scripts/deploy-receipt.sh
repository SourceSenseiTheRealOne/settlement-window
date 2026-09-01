#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="/mnt/c/Users/sourc/Documents/Dev/HERMES/LAB/coding_lab/projects/settleshield"
set -a
# shellcheck disable=SC1091
source "$PROJECT_ROOT/.env.local"
set +a

if [[ ! "${TESTNET_PRIVATE_KEY:-}" =~ ^0x[0-9a-fA-F]{64}$ ]]; then
  printf '%s\n' 'TESTNET_PRIVATE_KEY is missing or malformed.' >&2
  exit 1
fi

"$HOME/.foundry/bin/forge" create \
  src/SettleShieldReceipt.sol:SettleShieldReceipt \
  --root "$PROJECT_ROOT/contracts" \
  --rpc-url https://api.infra.testnet.somnia.network \
  --private-key "$TESTNET_PRIVATE_KEY" \
  --broadcast \
  --json
