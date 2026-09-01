import type { ProtectionMarketSnapshot } from "./market-reader";

export type ProtectionMarketDto = Omit<
  ProtectionMarketSnapshot,
  "bestDownAskMicros" | "downAsks"
> & {
  bestDownAskMicros: string;
  downAsks: {
    priceMicros: string;
    sharesMicros: string;
  }[];
};

export function serializeProtectionMarket(
  market: ProtectionMarketSnapshot,
): ProtectionMarketDto {
  return {
    ...market,
    bestDownAskMicros: market.bestDownAskMicros.toString(),
    downAsks: market.downAsks.map((level) => ({
      priceMicros: level.priceMicros.toString(),
      sharesMicros: level.sharesMicros.toString(),
    })),
  };
}

export function deserializeProtectionMarket(
  market: ProtectionMarketDto,
): ProtectionMarketSnapshot {
  return {
    ...market,
    bestDownAskMicros: BigInt(market.bestDownAskMicros),
    downAsks: market.downAsks.map((level) => ({
      priceMicros: BigInt(level.priceMicros),
      sharesMicros: BigInt(level.sharesMicros),
    })),
  };
}
