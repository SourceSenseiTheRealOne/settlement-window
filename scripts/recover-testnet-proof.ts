import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  createPublicClient,
  createWalletClient,
  http,
  type Hash,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { somniaShannon } from "@somnia-chain/markets-sdk/chains";
import {
  SHANNON_EXPLORER_URL,
  SHANNON_HTTP_RPC_URL,
} from "@/lib/dreamdex/config";
import { readProtectionResolution } from "@/lib/dreamdex/resolution-reader";
import {
  attestSettlementReceipt,
  createShieldReceipt,
} from "@/lib/receipt/receipt-client";

if (existsSync(resolve(".env.local"))) process.loadEnvFile(resolve(".env.local"));

const required = (name: string): string => {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required for proof recovery.`);
  return value;
};

const explorerTx = (hash: Hash) => `${SHANNON_EXPLORER_URL}/tx/${hash}`;

async function main() {
  const privateKey = required("TESTNET_PRIVATE_KEY") as Hex;
  const marketId = required("PROOF_ORDER_MARKET_ID") as Hex;
  const orderTxHash = required("PROOF_ORDER_TX_HASH") as Hash;
  const exposureUsdMicros = BigInt(required("PROOF_ORDER_EXPOSURE_MICROS"));
  const actualCostUsdMicros = BigInt(required("PROOF_ORDER_COST_MICROS"));
  const filledSharesMicros = BigInt(required("PROOF_ORDER_SHARES_MICROS"));
  const maximumPayoutUsdMicros = BigInt(required("PROOF_ORDER_PAYOUT_MICROS"));
  const eventContractExpiry = Number(required("PROOF_ORDER_EXPIRY"));

  const account = privateKeyToAccount(privateKey);
  const walletClient = createWalletClient({
    account,
    chain: somniaShannon,
    transport: http(SHANNON_HTTP_RPC_URL),
  });
  const publicClient = createPublicClient({
    chain: somniaShannon,
    transport: http(SHANNON_HTTP_RPC_URL),
  });
  const orderReceipt = await publicClient.getTransactionReceipt({ hash: orderTxHash });
  if (orderReceipt.status !== "success") throw new Error("The protection order did not succeed onchain.");

  const receipt = await createShieldReceipt(walletClient, {
    settlementType: "invoice",
    externalReference: `SETTLESHIELD-PROOF-${orderTxHash}`,
    marketId,
    protectionOrderTxHash: orderTxHash,
    exposureUsdMicros,
    maximumCostUsdMicros: actualCostUsdMicros,
    protectedSharesMicros: filledSharesMicros,
    maximumPayoutUsdMicros,
    eventContractExpiry,
  });
  const attestationTx = await attestSettlementReceipt(
    walletClient,
    receipt.shieldId,
    orderTxHash,
  );
  const resolution = await readProtectionResolution(marketId);

  const proof = {
    generatedAt: new Date().toISOString(),
    network: "Somnia Shannon Testnet",
    chainId: somniaShannon.id,
    wallet: account.address,
    marketId,
    eventContractExpiry,
    protection: {
      status: "FILLED",
      transactionHash: orderTxHash,
      requestedSharesMicros: filledSharesMicros,
      filledSharesMicros,
      actualCostUsdMicros,
      protectedPayoutUsdMicros: maximumPayoutUsdMicros,
      protectedNetOffsetUsdMicros:
        maximumPayoutUsdMicros > actualCostUsdMicros
          ? maximumPayoutUsdMicros - actualCostUsdMicros
          : 0n,
      fillRatioBps: 10_000,
      blockNumber: orderReceipt.blockNumber,
      gasUsed: orderReceipt.gasUsed,
      logCount: orderReceipt.logs.length,
    },
    shieldId: receipt.shieldId,
    resolution,
    transactions: {
      deployment: "0xf23f6417feff61ba3e8e2bf6d5eb85cc5d37598caf3e1c18ef851726d1179901",
      deploymentExplorer: explorerTx("0xf23f6417feff61ba3e8e2bf6d5eb85cc5d37598caf3e1c18ef851726d1179901"),
      protection: orderTxHash,
      protectionExplorer: explorerTx(orderTxHash),
      receipt: receipt.transactionHash,
      receiptExplorer: explorerTx(receipt.transactionHash),
      settlementAttestation: attestationTx,
      attestationExplorer: explorerTx(attestationTx),
      finalReceipt: null,
      finalReceiptExplorer: null,
    },
  };

  mkdirSync(resolve("proofs"), { recursive: true });
  writeFileSync(
    resolve("proofs/testnet-proof.json"),
    `${JSON.stringify(proof, (_, value) => (typeof value === "bigint" ? value.toString() : value), 2)}\n`,
    { encoding: "utf8", mode: 0o600 },
  );
  console.log(JSON.stringify(proof, (_, value) => (typeof value === "bigint" ? value.toString() : value)));
}

main().then(
  () => process.exit(0),
  (error: unknown) => {
    console.error(error instanceof Error ? error.message : "Proof recovery failed.");
    process.exit(1);
  },
);
