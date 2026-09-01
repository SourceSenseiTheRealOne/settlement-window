import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { SomniaMarkets } from "@somnia-chain/markets-sdk";
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
  SHANNON_INDEXER_URL,
  SHANNON_MARKETS_ADDRESSES,
  SHANNON_WS_RPC_URL,
} from "@/lib/dreamdex/config";
import { closeExchange } from "@/lib/dreamdex/exchange-lifecycle";
import { readProtectionResolution } from "@/lib/dreamdex/resolution-reader";
import {
  finalizeShieldReceipt,
} from "@/lib/receipt/receipt-client";

if (existsSync(resolve(".env.local"))) process.loadEnvFile(resolve(".env.local"));

const registry = "0xd64b02dDd9d088FA8547F9740B841BEd056bDD2D" as const;
const marketId = "0x0000000000000000000000000000000000000000000000000000000000010051" as const;
const shieldId = "0x83ee536847a3e15657f006d6ff8a6f85c9a4378df47d884f07209c95c93e8cb7" as const;
const zeroHash = `0x${"00".repeat(32)}` as Hash;
const proofPath = resolve("proofs/testnet-proof.json");
const sleep = (ms: number) => new Promise((resolveSleep) => setTimeout(resolveSleep, ms));

const txEvidence = async (client: ReturnType<typeof createPublicClient>, hash: Hash) => {
  const receipt = await client.getTransactionReceipt({ hash });
  return {
    hash,
    explorer: `${SHANNON_EXPLORER_URL}/tx/${hash}`,
    status: receipt.status,
    blockNumber: receipt.blockNumber.toString(),
    gasUsed: receipt.gasUsed.toString(),
    logCount: receipt.logs.length,
  };
};

async function main() {
  const privateKey = process.env.TESTNET_PRIVATE_KEY as Hex | undefined;
  if (!privateKey || !/^0x[0-9a-fA-F]{64}$/.test(privateKey)) {
    throw new Error("TESTNET_PRIVATE_KEY is missing or malformed.");
  }
  const artifact = JSON.parse(
    readFileSync(
      resolve("contracts/out/SettleShieldReceipt.sol/SettleShieldReceipt.json"),
      "utf8",
    ),
  ) as { abi: readonly unknown[] };
  const proof = JSON.parse(readFileSync(proofPath, "utf8")) as Record<string, any>;
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

  let shield = (await publicClient.readContract({
    address: registry,
    abi: artifact.abi,
    functionName: "getShield",
    args: [shieldId],
  })) as Record<string, any>;
  if (Number(shield.status) === 3) {
    console.log(JSON.stringify({ alreadyFinalized: true, payoutUsdMicros: shield.payoutUsdMicros.toString() }));
    return;
  }

  const deadline = Date.now() + 15 * 60_000;
  let resolution = await readProtectionResolution(marketId);
  while (!resolution.isResolved && !resolution.isVoided && Date.now() < deadline) {
    console.log(`resolution_status=${resolution.status}`);
    await sleep(15_000);
    resolution = await readProtectionResolution(marketId);
  }
  if (!resolution.isResolved && !resolution.isVoided) {
    throw new Error(`DreamDEX market did not resolve before deadline; last status ${resolution.status}.`);
  }

  const exchange = new SomniaMarkets({
    indexerUrl: SHANNON_INDEXER_URL,
    chain: somniaShannon,
    wsRpcUrl: SHANNON_WS_RPC_URL,
    addresses: SHANNON_MARKETS_ADDRESSES,
    walletClient,
  });
  let redemptionTx = zeroHash;
  let payoutUsdMicros = 0n;
  try {
    const market = await exchange.client.getMarketOnchain(marketId);
    const noBalance = await exchange.client.getOutcomeBalance({
      outcomeToken: market.outcomeToken,
      account: account.address,
      id: market.noId,
    });
    const shouldRedeem = noBalance > 0n && (resolution.isVoided || resolution.winningOutcome === 1);
    if (shouldRedeem) {
      const redemption = await exchange.trader.redeem({
        marketId,
        market: market.marketAddress,
        outcomeToken: market.outcomeToken,
        outcomeIdx: 1,
        amount: noBalance,
      });
      if (redemption.receipt.status !== "success") throw new Error("DreamDEX redemption reverted.");
      redemptionTx = redemption.hash;
      payoutUsdMicros = resolution.isVoided ? noBalance / 2n : noBalance;
    }
  } finally {
    await closeExchange(exchange);
  }

  const finalReceiptTx = await finalizeShieldReceipt(
    walletClient,
    shieldId,
    resolution.winningOutcome ?? 0,
    resolution.isVoided,
    payoutUsdMicros,
    redemptionTx,
  );
  shield = (await publicClient.readContract({
    address: registry,
    abi: artifact.abi,
    functionName: "getShield",
    args: [shieldId],
  })) as Record<string, any>;
  if (Number(shield.status) !== 3) throw new Error("Receipt did not reach Resolved status.");

  proof.generatedAt = new Date().toISOString();
  proof.resolution = resolution;
  proof.shield.status = Number(shield.status);
  proof.shield.statusLabel = "Resolved";
  proof.shield.redemptionTxHash = shield.redemptionTxHash;
  proof.shield.payoutUsdMicros = shield.payoutUsdMicros.toString();
  proof.shield.voided = shield.voided;
  proof.transactions.redemption =
    redemptionTx === zeroHash ? null : await txEvidence(publicClient, redemptionTx);
  proof.transactions.finalReceipt = await txEvidence(publicClient, finalReceiptTx);
  writeFileSync(proofPath, `${JSON.stringify(proof, null, 2)}\n`, {
    encoding: "utf8",
    mode: 0o600,
  });
  console.log(
    JSON.stringify({
      resolution,
      redemptionTx,
      finalReceiptTx,
      payoutUsdMicros: shield.payoutUsdMicros.toString(),
      shieldStatus: Number(shield.status),
    }),
  );
}

main().then(
  () => process.exit(0),
  (error: unknown) => {
    console.error(error instanceof Error ? error.message : "Live finalization failed.");
    process.exit(1);
  },
);
