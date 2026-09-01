import { describe, expect, it } from "vitest";
import { ORDER_TYPE } from "@somnia-chain/markets-sdk";
import type { ProtectionQuote } from "@/domain/protection";
import type { ProtectionMarketSnapshot } from "./market-reader";
import {
  OrderExecutionError,
  buildProtectionOrder,
  buildRedemptionPlan,
  summarizeProtectionExecution,
} from "./order-writer";

const market = {
  marketId: `0x${"11".repeat(32)}`,
  symbol: "ETH-UPDOWN-15M/USDC",
  question: "Will ETH close at or above its opening price?",
  asset: "ETH",
  intervalSec: 900,
  tradingStart: 1_000,
  expiry: 2_000,
  venueId: `0x${"22".repeat(32)}`,
  operatorId: 7,
  noSymbol: "ETH-UPDOWN-15M/USDC#NO",
  active: true,
  quoteDecimals: 6,
  direction: "DOWN",
  onchainStatus: "Trading",
  pool: `0x${"33".repeat(20)}`,
  outcomeToken: `0x${"44".repeat(20)}`,
  yesId: "10",
  noId: "11",
  settlementFeeBps: 100,
  bestDownAskMicros: 250_000n,
  downAsks: [{ priceMicros: 250_000n, sharesMicros: 200_000_000n }],
} satisfies ProtectionMarketSnapshot;

const quote = {
  direction: "DOWN",
  intervalSec: 900,
  filledSharesMicros: 200_000_000n,
  costUsdMicros: 50_000_000n,
  knownMaximumLossUsdMicros: 50_000_000n,
  maxPayoutUsdMicros: 198_000_000n,
  maxNetOffsetUsdMicros: 148_000_000n,
  averagePriceMicros: 250_000n,
  coverageBps: 1_980,
  fills: [
    {
      priceMicros: 250_000n,
      sharesMicros: 200_000_000n,
      costUsdMicros: 50_000_000n,
    },
  ],
} satisfies ProtectionQuote;

describe("buildProtectionOrder", () => {
  it("builds an exact BUY_NO IOC with a capped expiry", () => {
    expect(buildProtectionOrder(market, quote, 1_850)).toEqual({
      pool: market.pool,
      side: "BUY_NO",
      price: 750_000n,
      quantity: 200_000_000n,
      outcomeToken: market.outcomeToken,
      yesId: 10n,
      noId: 11n,
      orderType: ORDER_TYPE.MARKET,
      expireTimestampNs: 1_940_000_000_000n,
    });
  });
});

describe("summarizeProtectionExecution", () => {
  it("returns actual cost and marks a partial fill", () => {
    const execution = summarizeProtectionExecution(market, quote, {
      hash: `0x${"55".repeat(32)}`,
      receipt: { status: "success" },
      fills: [{ quantityFilled: 120_000_000n, fillPrice: 750_000n }],
    });

    expect(execution.status).toBe("PARTIAL");
    expect(execution.filledSharesMicros).toBe(120_000_000n);
    expect(execution.actualCostUsdMicros).toBe(30_000_000n);
    expect(execution.protectedPayoutUsdMicros).toBe(118_800_000n);
  });

  it("rejects a reverted receipt", () => {
    expect(() =>
      summarizeProtectionExecution(market, quote, {
        hash: `0x${"66".repeat(32)}`,
        receipt: { status: "reverted" },
        fills: [],
      }),
    ).toThrowError(
      new OrderExecutionError(
        "TRANSACTION_REVERTED",
        "The DreamDEX protection transaction reverted onchain.",
      ),
    );
  });

  it("rejects a successful transaction that filled nothing", () => {
    expect(() =>
      summarizeProtectionExecution(market, quote, {
        hash: `0x${"77".repeat(32)}`,
        receipt: { status: "success" },
        fills: [],
      }),
    ).toThrowError(
      new OrderExecutionError(
        "ZERO_FILL",
        "The IOC order filled nothing, so no settlement protection was created.",
      ),
    );
  });
});

describe("buildRedemptionPlan", () => {
  const execution = {
    status: "PARTIAL",
    transactionHash: `0x${"55".repeat(32)}`,
    requestedSharesMicros: 200_000_000n,
    filledSharesMicros: 120_000_000n,
    actualCostUsdMicros: 30_000_000n,
    protectedPayoutUsdMicros: 118_800_000n,
    protectedNetOffsetUsdMicros: 88_800_000n,
    fillRatioBps: 6_000,
  } as const;

  it("redeems the held NO outcome when DOWN wins", () => {
    expect(
      buildRedemptionPlan(execution, {
        isResolved: true,
        isVoided: false,
        winningOutcome: 1,
      }),
    ).toEqual({
      shouldRedeem: true,
      outcomeIdx: 1,
      amountMicros: 120_000_000n,
      payoutUsdMicros: 118_800_000n,
    });
  });

  it("records zero compensation without a redemption when UP wins", () => {
    expect(
      buildRedemptionPlan(execution, {
        isResolved: true,
        isVoided: false,
        winningOutcome: 0,
      }),
    ).toEqual({
      shouldRedeem: false,
      outcomeIdx: 1,
      amountMicros: 0n,
      payoutUsdMicros: 0n,
    });
  });

  it("redeems the held NO outcome at half value when the market is voided", () => {
    expect(
      buildRedemptionPlan(execution, {
        isResolved: false,
        isVoided: true,
        winningOutcome: null,
      }),
    ).toEqual({
      shouldRedeem: true,
      outcomeIdx: 1,
      amountMicros: 120_000_000n,
      payoutUsdMicros: 60_000_000n,
    });
  });

  it("refuses redemption before Event Contract resolution", () => {
    expect(() =>
      buildRedemptionPlan(execution, {
        isResolved: false,
        isVoided: false,
        winningOutcome: null,
      }),
    ).toThrowError(
      new OrderExecutionError(
        "MARKET_NOT_RESOLVED",
        "The Event Contract has not resolved yet.",
      ),
    );
  });
});
