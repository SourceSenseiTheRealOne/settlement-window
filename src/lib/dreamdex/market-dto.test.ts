import { describe, expect, it } from "vitest";
import {
  deserializeProtectionMarket,
  serializeProtectionMarket,
} from "./market-dto";
import type { ProtectionMarketSnapshot } from "./market-reader";

it("round-trips a protection market without losing integer amounts", () => {
  const market = {
    marketId: `0x${"11".repeat(32)}`,
    symbol: "ETH-0-01SEP26-0900/tUSDC",
    question: "Will ETH close at or above its opening price?",
    asset: "ETH",
    intervalSec: 900,
    tradingStart: 1_000,
    expiry: 2_000,
    venueId: `0x${"22".repeat(32)}`,
    operatorId: 7,
    noSymbol: "ETH-0-01SEP26-0900/tUSDC#NO",
    active: true,
    quoteDecimals: 6,
    direction: "DOWN",
    onchainStatus: "Trading",
    pool: `0x${"33".repeat(20)}`,
    outcomeToken: `0x${"44".repeat(20)}`,
    yesId: "10",
    noId: "11",
    settlementFeeBps: 0,
    bestDownAskMicros: 568_000n,
    downAsks: [{ priceMicros: 568_000n, sharesMicros: 2_500_000n }],
  } satisfies ProtectionMarketSnapshot;

  expect(deserializeProtectionMarket(serializeProtectionMarket(market))).toEqual(
    market,
  );
});
