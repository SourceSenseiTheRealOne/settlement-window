import { describe, expect, it } from "vitest";
import { summarizeResolution } from "./resolution-reader";

const marketId = `0x${"11".repeat(32)}` as const;

describe("summarizeResolution", () => {
  it("reports the canonical winning outcome and resolution transaction", () => {
    expect(
      summarizeResolution(
        marketId,
        { status: 4, isResolved: true, isVoided: false, winningOutcome: 1 },
        {
          events: [
            {
              kind: "Resolved",
              txHash: `0x${"22".repeat(32)}`,
              timestamp: "2000",
            },
          ],
          openingAnswer: { numericValue: "350000000000", txHash: null },
          closingAnswer: {
            numericValue: "340000000000",
            txHash: `0x${"33".repeat(32)}`,
          },
        },
      ),
    ).toEqual({
      marketId,
      status: "Resolved",
      isResolved: true,
      isVoided: false,
      winningOutcome: 1,
      openingPriceRaw: "350000000000",
      closingPriceRaw: "340000000000",
      oracleTransactionHash: `0x${"33".repeat(32)}`,
      resolutionTransactionHash: `0x${"22".repeat(32)}`,
    });
  });

  it("does not invent an outcome while the market is settling", () => {
    expect(
      summarizeResolution(
        marketId,
        { status: 3, isResolved: false, isVoided: false, winningOutcome: 0 },
        { events: [], openingAnswer: null, closingAnswer: null },
      ),
    ).toMatchObject({
      status: "Settling",
      isResolved: false,
      isVoided: false,
      winningOutcome: null,
      resolutionTransactionHash: null,
    });
  });
});
