import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { SomniaMarkets } from "@somnia-chain/markets-sdk";
import {
  createPublicClient,
  createWalletClient,
  formatEther,
  http,
  parseAbi,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { quoteProtection } from "@/domain/protection";
import { parseUsdMicros } from "@/lib/format";
import {
  SHANNON_EXPLORER_URL,
  SHANNON_HTTP_RPC_URL,
  SHANNON_INDEXER_URL,
  SHANNON_MARKETS_ADDRESSES,
  SHANNON_WS_RPC_URL,
  somniaShannon,
} from "@/lib/dreamdex/config";
import { discoverProtectionMarket } from "@/lib/dreamdex/market-reader";
import {
  executeProtectionOrder,
  redeemProtection,
} from "@/lib/dreamdex/order-writer";
import { readProtectionResolution } from "@/lib/dreamdex/resolution-reader";
import {
  attestSettlementReceipt,
  configuredReceiptAddress,
  createShieldReceipt,
  finalizeShieldReceipt,
} from "@/lib/receipt/receipt-client";

if (existsSync(resolve(".env.local"))) process.loadEnvFile(resolve(".env.local"));

const erc20BalanceAbi = parseAbi([
  "function balanceOf(address account) view returns (uint256)",
]);

const json = (value: unknown) =>
  JSON.stringify(value, (_, current) =>
    typeof current === "bigint" ? current.toString() : current,
  );

function intervalFromEnv(): 900 | 3600 {
  const value = Number(process.env.PROOF_INTERVAL_SEC ?? "900");
  if (value !== 900 && value !== 3600) {
    throw new Error("PROOF_INTERVAL_SEC must be 900 or 3600.");
  }
  return value;
}

async function main() {
  const intervalSec = intervalFromEnv();
  const exposureUsdMicros = parseUsdMicros(process.env.PROOF_EXPOSURE_USD ?? "1000");
  const compensationUsdMicros = parseUsdMicros(process.env.PROOF_COMPENSATION_USD ?? "1");
  const maxCostUsdMicros = parseUsdMicros(process.env.PROOF_MAX_COST_USD ?? "1");

  const market = await discoverProtectionMarket(intervalSec);
  const quote = quoteProtection(
    {
      exposureUsdMicros,
      desiredCompensationUsdMicros: compensationUsdMicros,
      maxCostUsdMicros,
      intervalSec,
      settlementFeeBps: market.settlementFeeBps,
    },
    market.downAsks,
  );

  const preview = {
    mode: "read-only",
    chainId: somniaShannon.id,
    marketId: market.marketId,
    symbol: market.symbol,
    intervalSec,
    expiry: market.expiry,
    venueId: market.venueId,
    bestDownAskMicros: market.bestDownAskMicros,
    requestedSharesMicros: quote.filledSharesMicros,
    maximumCostUsdMicros: quote.knownMaximumLossUsdMicros,
    maximumPayoutUsdMicros: quote.maxPayoutUsdMicros,
    visibleLevels: market.downAsks.length,
  };

  if (process.env.PROOF_EXECUTE !== "true") {
    console.log(json(preview));
    return;
  }

  const privateKey = process.env.TESTNET_PRIVATE_KEY as Hex | undefined;
  if (!privateKey || !/^0x[0-9a-fA-F]{64}$/.test(privateKey)) {
    throw new Error("PROOF_EXECUTE=true requires TESTNET_PRIVATE_KEY in the local environment.");
  }
  const receiptAddress = configuredReceiptAddress();
  if (!receiptAddress) {
    throw new Error("Deploy and configure NEXT_PUBLIC_SETTLESHIELD_RECEIPT_ADDRESS before execution.");
  }

  const account = privateKeyToAccount(privateKey);
  const publicClient = createPublicClient({
    chain: somniaShannon,
    transport: http(SHANNON_HTTP_RPC_URL),
  });
  const walletClient = createWalletClient({
    account,
    chain: somniaShannon,
    transport: http(SHANNON_HTTP_RPC_URL),
  });

  const gasBalance = await publicClient.getBalance({ address: account.address });
  if (gasBalance === 0n) {
    throw new Error(
      `Proof wallet ${account.address} has 0 STT. Fund it from https://testnet.somnia.network before retrying.`,
    );
  }

  const collateral = SHANNON_MARKETS_ADDRESSES.collateral;
  if (!collateral) throw new Error("Shannon collateral address is not configured.");
  let collateralBalance = await publicClient.readContract({
    address: collateral,
    abi: erc20BalanceAbi,
    functionName: "balanceOf",
    args: [account.address],
  });
  if (collateralBalance < quote.knownMaximumLossUsdMicros) {
    const exchange = new SomniaMarkets({
      indexerUrl: SHANNON_INDEXER_URL,
      chain: somniaShannon,
      wsRpcUrl: SHANNON_WS_RPC_URL,
      addresses: SHANNON_MARKETS_ADDRESSES,
      walletClient,
    });
    try {
      const faucet = await exchange.trader.faucet({ amount: 1_000_000_000n });
      if (faucet.receipt.status === "reverted") {
        throw new Error("The Shannon tUSDC faucet transaction reverted.");
      }
    } finally {
      await Promise.resolve(exchange.close()).catch(() => undefined);
    }
    collateralBalance = await publicClient.readContract({
      address: collateral,
      abi: erc20BalanceAbi,
      functionName: "balanceOf",
      args: [account.address],
    });
  }
  if (collateralBalance < quote.knownMaximumLossUsdMicros) {
    throw new Error("The proof wallet still lacks enough tUSDC after the faucet call.");
  }

  const execution = await executeProtectionOrder(walletClient, market, quote);
  const receipt = await createShieldReceipt(walletClient, {
    settlementType: "invoice",
    externalReference: `SETTLESHIELD-PROOF-${execution.transactionHash}`,
    marketId: market.marketId,
    protectionOrderTxHash: execution.transactionHash,
    exposureUsdMicros,
    maximumCostUsdMicros: execution.actualCostUsdMicros,
    protectedSharesMicros: execution.filledSharesMicros,
    maximumPayoutUsdMicros: execution.protectedPayoutUsdMicros,
    eventContractExpiry: market.expiry,
  });
  const attestationTx = await attestSettlementReceipt(
    walletClient,
    receipt.shieldId,
    execution.transactionHash,
  );

  const resolution = await readProtectionResolution(market.marketId);
  let redemption = null;
  let finalReceiptTx = null;
  if (resolution.isResolved || resolution.isVoided) {
    redemption = await redeemProtection(walletClient, market, execution, resolution);
    finalReceiptTx = await finalizeShieldReceipt(
      walletClient,
      receipt.shieldId,
      resolution.winningOutcome ?? 0,
      resolution.isVoided,
      redemption.payoutUsdMicros,
      redemption.transactionHash,
    );
  }

  const proof = {
    generatedAt: new Date().toISOString(),
    network: "Somnia Shannon Testnet",
    chainId: somniaShannon.id,
    wallet: account.address,
    nativeBalanceBefore: formatEther(gasBalance),
    market: {
      marketId: market.marketId,
      symbol: market.symbol,
      intervalSec: market.intervalSec,
      expiry: market.expiry,
      venueId: market.venueId,
      pool: market.pool,
    },
    protection: execution,
    shieldId: receipt.shieldId,
    resolution,
    redemption,
    transactions: {
      protection: execution.transactionHash,
      protectionExplorer: `${SHANNON_EXPLORER_URL}/tx/${execution.transactionHash}`,
      receipt: receipt.transactionHash,
      receiptExplorer: `${SHANNON_EXPLORER_URL}/tx/${receipt.transactionHash}`,
      settlementAttestation: attestationTx,
      attestationExplorer: `${SHANNON_EXPLORER_URL}/tx/${attestationTx}`,
      finalReceipt: finalReceiptTx,
      finalReceiptExplorer: finalReceiptTx
        ? `${SHANNON_EXPLORER_URL}/tx/${finalReceiptTx}`
        : null,
    },
  };

  mkdirSync(resolve("proofs"), { recursive: true });
  writeFileSync(resolve("proofs/testnet-proof.json"), `${json(proof)}\n`, {
    encoding: "utf8",
    mode: 0o600,
  });
  console.log(json(proof));
}

main().then(
  () => process.exit(0),
  (error: unknown) => {
    console.error(error instanceof Error ? error.message : "Unknown proof failure.");
    process.exit(1);
  },
);
