import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { SomniaMarkets } from "@somnia-chain/markets-sdk";
import {
  createPublicClient,
  http,
  parseAbi,
  type Hash,
} from "viem";
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

const wallet = "0x35A1A08E53051092228259259174C1a1E301D104" as const;
const registry = "0xd64b02dDd9d088FA8547F9740B841BEd056bDD2D" as const;
const marketId = "0x0000000000000000000000000000000000000000000000000000000000010051" as const;
const shieldId = "0x83ee536847a3e15657f006d6ff8a6f85c9a4378df47d884f07209c95c93e8cb7" as const;
const transactions = {
  funding: "0x0e6f0ff2bf78ae0a7486855f3f91ad08d5c117c971168a635720223a76811804",
  deployment: "0xf23f6417feff61ba3e8e2bf6d5eb85cc5d37598caf3e1c18ef851726d1179901",
  collateralFaucet: "0x50bd4bdc6bb9a08df6297e37410d9d7daccf5d79b35b1303d8d1a34f0c52274a",
  collateralApproval: "0x627ae3db70b65c7b77bc49d9ad2a30ced729c63c3712fd511db7faf0c536b78c",
  protection: "0x2683372fa36bdeb2ddfd33661636abf79203632484942a9481477c0038242c0e",
  receipt: "0x9d2371ee1a08e4c5c9533a3729a004d5c8e8a6cea19edfee1a5f7d6250b02bee",
  settlementAttestation: "0x13a99d56a326680d107ea7926c932845fe1129f255d298d6d57afcbc3dffe487",
} as const satisfies Record<string, Hash>;

const publicClient = createPublicClient({
  chain: somniaShannon,
  transport: http(SHANNON_HTTP_RPC_URL),
});
const erc20Abi = parseAbi(["function balanceOf(address account) view returns (uint256)"]);

async function main() {
  const artifact = JSON.parse(
    readFileSync(
      resolve("contracts/out/SettleShieldReceipt.sol/SettleShieldReceipt.json"),
      "utf8",
    ),
  ) as { abi: readonly unknown[] };
  const receiptEntries = await Promise.all(
    Object.entries(transactions).map(async ([name, hash]) => {
      const receipt = await publicClient.getTransactionReceipt({ hash });
      return [
        name,
        {
          hash,
          explorer: `${SHANNON_EXPLORER_URL}/tx/${hash}`,
          status: receipt.status,
          blockNumber: receipt.blockNumber.toString(),
          gasUsed: receipt.gasUsed.toString(),
          logCount: receipt.logs.length,
        },
      ] as const;
    }),
  );
  const txEvidence = Object.fromEntries(receiptEntries);
  const shield = (await publicClient.readContract({
    address: registry,
    abi: artifact.abi,
    functionName: "getShield",
    args: [shieldId],
  })) as {
    owner: string;
    exposureHash: Hash;
    marketId: Hash;
    protectionOrderTxHash: Hash;
    settlementReferenceHash: Hash;
    redemptionTxHash: Hash;
    exposureUsdMicros: bigint;
    maximumCostUsdMicros: bigint;
    protectedSharesMicros: bigint;
    maximumPayoutUsdMicros: bigint;
    payoutUsdMicros: bigint;
    eventContractExpiry: bigint;
    createdAt: bigint;
    settledAt: bigint;
    resolvedAt: bigint;
    winningOutcome: number;
    voided: boolean;
    status: number;
  };

  const exchange = new SomniaMarkets({
    indexerUrl: SHANNON_INDEXER_URL,
    chain: somniaShannon,
    wsRpcUrl: SHANNON_WS_RPC_URL,
    addresses: SHANNON_MARKETS_ADDRESSES,
  });
  let noBalance: bigint;
  try {
    const market = await exchange.client.getMarketOnchain(marketId);
    noBalance = await exchange.client.getOutcomeBalance({
      outcomeToken: market.outcomeToken,
      account: wallet,
      id: market.noId,
    });
  } finally {
    await closeExchange(exchange);
  }
  const collateral = SHANNON_MARKETS_ADDRESSES.collateral;
  if (!collateral) throw new Error("Shannon collateral address missing.");
  const tUsdcBalance = await publicClient.readContract({
    address: collateral,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [wallet],
  });
  const resolution = await readProtectionResolution(marketId);

  const proof = {
    generatedAt: new Date().toISOString(),
    network: "Somnia Shannon Testnet",
    chainId: somniaShannon.id,
    wallet,
    registry: {
      address: registry,
      explorer: `${SHANNON_EXPLORER_URL}/address/${registry}`,
      runtimeBytecodeBytes: 3216,
    },
    marketId,
    position: {
      outcome: "NO",
      balanceRaw: noBalance.toString(),
      balanceHuman: Number(noBalance) / 1_000_000,
      actualCostUsdMicros: shield.maximumCostUsdMicros.toString(),
      maximumPayoutUsdMicros: shield.maximumPayoutUsdMicros.toString(),
      tUsdcWalletBalanceRaw: tUsdcBalance.toString(),
    },
    shield: {
      shieldId,
      owner: shield.owner,
      status: Number(shield.status),
      statusLabel: ["None", "Protected", "Settled", "Resolved"][Number(shield.status)] ?? "Unknown",
      marketId: shield.marketId,
      protectionOrderTxHash: shield.protectionOrderTxHash,
      settlementReferenceHash: shield.settlementReferenceHash,
      redemptionTxHash: shield.redemptionTxHash,
      exposureUsdMicros: shield.exposureUsdMicros.toString(),
      protectedSharesMicros: shield.protectedSharesMicros.toString(),
      payoutUsdMicros: shield.payoutUsdMicros.toString(),
      eventContractExpiry: shield.eventContractExpiry.toString(),
      voided: shield.voided,
    },
    resolution,
    transactions: txEvidence,
  };
  mkdirSync(resolve("proofs"), { recursive: true });
  writeFileSync(resolve("proofs/testnet-proof.json"), `${JSON.stringify(proof, null, 2)}\n`, {
    encoding: "utf8",
    mode: 0o600,
  });
  console.log(JSON.stringify(proof));
}

main().then(
  () => process.exit(0),
  (error: unknown) => {
    console.error(error instanceof Error ? error.message : "Proof assembly failed.");
    process.exit(1);
  },
);
