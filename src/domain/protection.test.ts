import { describe, expect, it } from "vitest";
import {
  ProtectionRefusal,
  quoteProtection,
  type ProtectionRequest,
} from "./protection";

const usd = (value: number) => BigInt(Math.round(value * 1_000_000));
const shares = usd;

const request = (overrides: Partial<ProtectionRequest> = {}): ProtectionRequest => ({
  exposureUsdMicros: usd(1_000),
  desiredCompensationUsdMicros: usd(198),
  maxCostUsdMicros: usd(60),
  intervalSec: 900,
  settlementFeeBps: 100,
  ...overrides,
});

describe("quoteProtection", () => {
  it.each([900, 3600])("supports the %s-second settlement window", (intervalSec) => {
    const quote = quoteProtection(request({ intervalSec }), [
      { priceMicros: usd(0.25), sharesMicros: shares(100) },
      { priceMicros: usd(0.3), sharesMicros: shares(100) },
    ]);

    expect(quote.direction).toBe("DOWN");
    expect(quote.filledSharesMicros).toBe(shares(200));
    expect(quote.costUsdMicros).toBe(usd(55));
    expect(quote.maxPayoutUsdMicros).toBe(usd(198));
    expect(quote.maxNetOffsetUsdMicros).toBe(usd(143));
  });

  it("rejects a settlement window DreamDEX does not offer", () => {
    expect(() => quoteProtection(request({ intervalSec: 1_800 }), [])).toThrowError(
      new ProtectionRefusal("UNSUPPORTED_INTERVAL", "Choose a 15-minute or 1-hour settlement window."),
    );
  });

  it("refuses compensation above the external exposure", () => {
    expect(() =>
      quoteProtection(
        request({ desiredCompensationUsdMicros: usd(1_001) }),
        [{ priceMicros: usd(0.25), sharesMicros: shares(2_000) }],
      ),
    ).toThrowError(ProtectionRefusal);
  });

  it("refuses when visible liquidity cannot supply the requested protection", () => {
    expect(() =>
      quoteProtection(request(), [{ priceMicros: usd(0.25), sharesMicros: shares(100) }]),
    ).toThrowError(new ProtectionRefusal("INSUFFICIENT_LIQUIDITY", "Visible DOWN liquidity cannot supply the requested compensation."));
  });

  it("refuses when execution would exceed the protection budget", () => {
    expect(() =>
      quoteProtection(
        request({ maxCostUsdMicros: usd(54) }),
        [
          { priceMicros: usd(0.25), sharesMicros: shares(100) },
          { priceMicros: usd(0.3), sharesMicros: shares(100) },
        ],
      ),
    ).toThrowError(new ProtectionRefusal("BUDGET_EXCEEDED", "This protection costs more than the configured maximum."));
  });
});
