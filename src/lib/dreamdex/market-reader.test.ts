import { describe, expect, it } from "vitest";
import {
  MarketUnavailable,
  buildProtectionMarketSnapshot,
  selectProtectionMarket,
  type ProtectionMarketCandidate,
} from "./market-reader";

const candidate = (
  overrides: Partial<ProtectionMarketCandidate> = {},
): ProtectionMarketCandidate => ({
  marketId: `0x${"11".repeat(32)}`,
  symbol: "ETH-UPDOWN-15M/USDC",
  question: "Will ETH close at or above its opening price?",
  asset: "ETH",
  intervalSec: 900,
  tradingStart: 2_000,
  expiry: 3_000,
  venueId: `0x${"22".repeat(32)}`,
  operatorId: 7,
  noSymbol: "ETH-UPDOWN-15M/USDC#NO",
  active: true,
  quoteDecimals: 6,
  ...overrides,
});

describe("selectProtectionMarket", () => {
  it("selects the closest live ETH market for the requested cadence", () => {
    const selected = selectProtectionMarket(
      [
        candidate({ asset: "BTC", expiry: 2_500 }),
        candidate({ intervalSec: 3_600, expiry: 2_700 }),
        candidate({ expiry: 2_900 }),
        candidate({ expiry: 2_600, marketId: `0x${"33".repeat(32)}` }),
      ],
      900,
      2_200,
    );

    expect(selected.marketId).toBe(`0x${"33".repeat(32)}`);
  });

  it("refuses an expired or nearly locked market", () => {
    expect(() =>
      selectProtectionMarket([candidate({ expiry: 2_450 })], 900, 2_200),
    ).toThrowError(
      new MarketUnavailable(
        "NO_MATCHING_MARKET",
        "No tradable ETH Event Contract has enough time left for this settlement window.",
      ),
    );
  });
});

describe("buildProtectionMarketSnapshot", () => {
  it("converts the live NO ask book into exact protection depth", () => {
    const snapshot = buildProtectionMarketSnapshot(
      candidate(),
      {
        status: 1,
        pool: `0x${"44".repeat(20)}`,
        outcomeToken: `0x${"55".repeat(20)}`,
        yesId: 10n,
        noId: 11n,
        expiry: 3_000n,
        decimals: 6,
      },
      {
        asks: [
          [0.24, 125.5],
          [0.27, 80],
        ],
      },
      35,
    );

    expect(snapshot.direction).toBe("DOWN");
    expect(snapshot.bestDownAskMicros).toBe(240_000n);
    expect(snapshot.downAsks).toEqual([
      { priceMicros: 240_000n, sharesMicros: 125_500_000n },
      { priceMicros: 270_000n, sharesMicros: 80_000_000n },
    ]);
    expect(snapshot.settlementFeeBps).toBe(35);
  });

  it("refuses a market that is not Trading onchain", () => {
    expect(() =>
      buildProtectionMarketSnapshot(
        candidate(),
        {
          status: 2,
          pool: `0x${"44".repeat(20)}`,
          outcomeToken: `0x${"55".repeat(20)}`,
          yesId: 10n,
          noId: 11n,
          expiry: 3_000n,
          decimals: 6,
        },
        { asks: [[0.24, 125.5]] },
        35,
      ),
    ).toThrowError(
      new MarketUnavailable(
        "MARKET_NOT_TRADING",
        "The selected Event Contract is no longer Trading onchain.",
      ),
    );
  });
});
