import {
  ORDER_TYPE,
  SomniaMarkets,
  type PlaceOrderParams,
} from "@somnia-chain/markets-sdk";
import type { Hash, WalletClient } from "viem";
import { USD_SCALE, type ProtectionQuote } from "@/domain/protection";
import {
  SHANNON_CHAIN_ID,
  SHANNON_INDEXER_URL,
  SHANNON_MARKETS_ADDRESSES,
  SHANNON_WS_RPC_URL,
  somniaShannon,
} from "./config";
import { closeExchange } from "./exchange-lifecycle";
import type { ProtectionMarketSnapshot } from "./market-reader";

export type OrderExecutionErrorCode =
  | "WRONG_NETWORK"
  | "MARKET_CHANGED"
  | "MARKET_NOT_TRADING"
  | "MARKET_EXPIRED"
  | "TRANSACTION_REVERTED"
  | "ZERO_FILL"
  | "BUDGET_EXCEEDED"
  | "MARKET_NOT_RESOLVED";

export class OrderExecutionError extends Error {
  constructor(
    readonly code: OrderExecutionErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "OrderExecutionError";
  }
}

export interface ProtectionExecution {
  status: "FILLED" | "PARTIAL";
  transactionHash: `0x${string}`;
  requestedSharesMicros: bigint;
  filledSharesMicros: bigint;
  actualCostUsdMicros: bigint;
  protectedPayoutUsdMicros: bigint;
  protectedNetOffsetUsdMicros: bigint;
  fillRatioBps: number;
}

export function buildProtectionOrder(
  market: ProtectionMarketSnapshot,
  quote: ProtectionQuote,
  nowSec = Math.floor(Date.now() / 1_000),
): PlaceOrderParams {
  const one = 10n ** BigInt(market.quoteDecimals);
  const quantity = (quote.filledSharesMicros * one) / USD_SCALE;
  const worstDownPriceMicros = quote.fills.reduce(
    (worst, fill) =>
      fill.priceMicros > worst ? fill.priceMicros : worst,
    0n,
  );
  const downPrice = (worstDownPriceMicros * one) / USD_SCALE;
  const yesPrice = one - downPrice;
  const expiresAt = Math.min(nowSec + 90, market.expiry);

  if (expiresAt <= nowSec) {
    throw new OrderExecutionError(
      "MARKET_EXPIRED",
      "The selected Event Contract reached its trading deadline.",
    );
  }

  return {
    pool: market.pool,
    side: "BUY_NO",
    price: yesPrice,
    quantity,
    outcomeToken: market.outcomeToken,
    yesId: BigInt(market.yesId),
    noId: BigInt(market.noId),
    orderType: ORDER_TYPE.MARKET,
    expireTimestampNs: BigInt(expiresAt) * 1_000_000_000n,
  };
}

type ExecutionResult = {
  hash: Hash;
  receipt: { status: "success" | "reverted" };
  fills?: { quantityFilled: bigint; fillPrice: bigint }[];
};

export function summarizeProtectionExecution(
  market: ProtectionMarketSnapshot,
  quote: ProtectionQuote,
  result: ExecutionResult,
): ProtectionExecution {
  if (result.receipt.status === "reverted") {
    throw new OrderExecutionError(
      "TRANSACTION_REVERTED",
      "The DreamDEX protection transaction reverted onchain.",
    );
  }

  const one = 10n ** BigInt(market.quoteDecimals);
  let filledRaw = 0n;
  let actualCostRaw = 0n;
  for (const fill of result.fills ?? []) {
    filledRaw += fill.quantityFilled;
    const downFillPrice = one - fill.fillPrice;
    actualCostRaw += (downFillPrice * fill.quantityFilled) / one;
  }

  const filledSharesMicros = (filledRaw * USD_SCALE) / one;
  const actualCostUsdMicros = (actualCostRaw * USD_SCALE) / one;
  if (filledSharesMicros === 0n) {
    throw new OrderExecutionError(
      "ZERO_FILL",
      "The IOC order filled nothing, so no settlement protection was created.",
    );
  }
  if (actualCostUsdMicros > quote.knownMaximumLossUsdMicros) {
    throw new OrderExecutionError(
      "BUDGET_EXCEEDED",
      "The filled protection exceeded the configured maximum cost.",
    );
  }

  const protectedPayoutUsdMicros =
    (filledSharesMicros * BigInt(10_000 - market.settlementFeeBps)) /
    10_000n;
  const protectedNetOffsetUsdMicros =
    protectedPayoutUsdMicros > actualCostUsdMicros
      ? protectedPayoutUsdMicros - actualCostUsdMicros
      : 0n;

  return {
    status:
      filledSharesMicros === quote.filledSharesMicros ? "FILLED" : "PARTIAL",
    transactionHash: result.hash,
    requestedSharesMicros: quote.filledSharesMicros,
    filledSharesMicros,
    actualCostUsdMicros,
    protectedPayoutUsdMicros,
    protectedNetOffsetUsdMicros,
    fillRatioBps: Number(
      (filledSharesMicros * 10_000n) / quote.filledSharesMicros,
    ),
  };
}

export interface ProtectionResolutionState {
  isResolved: boolean;
  isVoided: boolean;
  winningOutcome: 0 | 1 | null;
}

export interface RedemptionPlan {
  shouldRedeem: boolean;
  outcomeIdx: 1;
  amountMicros: bigint;
  payoutUsdMicros: bigint;
}

export interface ProtectionRedemption extends RedemptionPlan {
  transactionHash: Hash;
}

export const ZERO_TRANSACTION_HASH = `0x${"00".repeat(32)}` as Hash;

export function buildRedemptionPlan(
  execution: ProtectionExecution,
  resolution: ProtectionResolutionState,
): RedemptionPlan {
  if (!resolution.isResolved && !resolution.isVoided) {
    throw new OrderExecutionError(
      "MARKET_NOT_RESOLVED",
      "The Event Contract has not resolved yet.",
    );
  }

  if (resolution.isVoided) {
    return {
      shouldRedeem: true,
      outcomeIdx: 1,
      amountMicros: execution.filledSharesMicros,
      payoutUsdMicros: execution.filledSharesMicros / 2n,
    };
  }

  if (resolution.winningOutcome === 1) {
    return {
      shouldRedeem: true,
      outcomeIdx: 1,
      amountMicros: execution.filledSharesMicros,
      payoutUsdMicros: execution.protectedPayoutUsdMicros,
    };
  }

  return {
    shouldRedeem: false,
    outcomeIdx: 1,
    amountMicros: 0n,
    payoutUsdMicros: 0n,
  };
}

export async function redeemProtection(
  walletClient: WalletClient,
  market: ProtectionMarketSnapshot,
  execution: ProtectionExecution,
  resolution: ProtectionResolutionState,
): Promise<ProtectionRedemption> {
  const chainId = await walletClient.getChainId();
  if (chainId !== SHANNON_CHAIN_ID) {
    throw new OrderExecutionError(
      "WRONG_NETWORK",
      "Switch your wallet to Somnia Shannon testnet before redeeming protection.",
    );
  }

  const plan = buildRedemptionPlan(execution, resolution);
  if (!plan.shouldRedeem) {
    return { ...plan, transactionHash: ZERO_TRANSACTION_HASH };
  }

  const exchange = new SomniaMarkets({
    indexerUrl: SHANNON_INDEXER_URL,
    chain: somniaShannon,
    wsRpcUrl: SHANNON_WS_RPC_URL,
    addresses: SHANNON_MARKETS_ADDRESSES,
    walletClient,
  });

  try {
    const current = await exchange.client.getMarketOnchain(market.marketId);
    if (!current.isResolved && !current.isVoided) {
      throw new OrderExecutionError(
        "MARKET_NOT_RESOLVED",
        "The Event Contract has not resolved yet.",
      );
    }
    const one = 10n ** BigInt(current.decimals);
    const amount = (plan.amountMicros * one) / USD_SCALE;
    const result = await exchange.trader.redeem({
      marketId: market.marketId,
      market: current.marketAddress,
      outcomeToken: current.outcomeToken,
      outcomeIdx: 1,
      amount,
    });
    if (result.receipt.status === "reverted") {
      throw new OrderExecutionError(
        "TRANSACTION_REVERTED",
        "The DreamDEX redemption transaction reverted onchain.",
      );
    }
    return { ...plan, transactionHash: result.hash };
  } finally {
    await closeExchange(exchange);
  }
}

export async function executeProtectionOrder(
  walletClient: WalletClient,
  market: ProtectionMarketSnapshot,
  quote: ProtectionQuote,
): Promise<ProtectionExecution> {
  const chainId = await walletClient.getChainId();
  if (chainId !== SHANNON_CHAIN_ID) {
    throw new OrderExecutionError(
      "WRONG_NETWORK",
      "Switch your wallet to Somnia Shannon testnet before protecting this settlement.",
    );
  }

  const exchange = new SomniaMarkets({
    indexerUrl: SHANNON_INDEXER_URL,
    chain: somniaShannon,
    wsRpcUrl: SHANNON_WS_RPC_URL,
    addresses: SHANNON_MARKETS_ADDRESSES,
    walletClient,
  });

  try {
    const current = await exchange.client.getMarketOnchain(market.marketId);
    if (current.status !== 1) {
      throw new OrderExecutionError(
        "MARKET_NOT_TRADING",
        "The selected Event Contract is no longer Trading onchain.",
      );
    }
    if (
      current.pool.toLowerCase() !== market.pool.toLowerCase() ||
      current.outcomeToken.toLowerCase() !== market.outcomeToken.toLowerCase() ||
      current.yesId.toString() !== market.yesId ||
      current.noId.toString() !== market.noId
    ) {
      throw new OrderExecutionError(
        "MARKET_CHANGED",
        "The Event Contract pool changed before execution. Refresh the quote.",
      );
    }

    const result = await exchange.trader.placeOrder(
      buildProtectionOrder(market, quote),
    );
    return summarizeProtectionExecution(market, quote, result);
  } finally {
    await closeExchange(exchange);
  }
}
