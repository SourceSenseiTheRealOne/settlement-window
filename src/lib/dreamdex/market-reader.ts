import {
  SomniaMarkets,
  type MarketOnchain,
  type UnifiedMarket,
} from "@somnia-chain/markets-sdk";
import type { Hex } from "viem";
import type { BookAsk } from "@/domain/protection";
import {
  BOT_KIT_TESTNET_VENUE_ID,
  SHANNON_INDEXER_URL,
  SHANNON_MARKETS_ADDRESSES,
  SHANNON_WS_RPC_URL,
  somniaShannon,
} from "./config";
import { closeExchange } from "./exchange-lifecycle";

export type MarketUnavailableCode =
  | "NO_MATCHING_MARKET"
  | "AMBIGUOUS_VENUE"
  | "MARKET_NOT_TRADING"
  | "EMPTY_DOWN_BOOK";

export class MarketUnavailable extends Error {
  constructor(
    readonly code: MarketUnavailableCode,
    message: string,
  ) {
    super(message);
    this.name = "MarketUnavailable";
  }
}

export interface ProtectionMarketCandidate {
  marketId: Hex;
  symbol: string;
  question: string;
  asset: string;
  intervalSec: number;
  tradingStart: number;
  expiry: number;
  venueId: Hex;
  operatorId: number;
  noSymbol: string;
  active: boolean;
  quoteDecimals: number;
}

export interface ProtectionMarketOnchain {
  status: number;
  pool: `0x${string}`;
  outcomeToken: `0x${string}`;
  yesId: bigint;
  noId: bigint;
  expiry: bigint;
  decimals: number;
}

export interface ProtectionMarketSnapshot extends ProtectionMarketCandidate {
  direction: "DOWN";
  onchainStatus: "Trading";
  pool: `0x${string}`;
  outcomeToken: `0x${string}`;
  yesId: string;
  noId: string;
  settlementFeeBps: number;
  bestDownAskMicros: bigint;
  downAsks: BookAsk[];
}

const toMicros = (value: number): bigint =>
  BigInt(Math.round(value * 1_000_000));

const minimumHeadroomSec = (intervalSec: number): number =>
  Math.max(30, Math.min(300, intervalSec * 0.4));

export function selectProtectionMarket(
  markets: readonly ProtectionMarketCandidate[],
  intervalSec: 900 | 3600,
  nowSec = Math.floor(Date.now() / 1_000),
): ProtectionMarketCandidate {
  const selected = markets
    .filter(
      (market) =>
        market.active &&
        market.asset.toUpperCase() === "ETH" &&
        market.intervalSec === intervalSec &&
        market.expiry - nowSec >= minimumHeadroomSec(intervalSec),
    )
    .sort((left, right) => left.expiry - right.expiry)[0];

  if (!selected) {
    throw new MarketUnavailable(
      "NO_MATCHING_MARKET",
      "No tradable ETH Event Contract has enough time left for this settlement window.",
    );
  }

  return selected;
}

export function buildProtectionMarketSnapshot(
  market: ProtectionMarketCandidate,
  onchain: ProtectionMarketOnchain,
  downBook: { asks: readonly (readonly [number, number])[] },
  settlementFeeBps: number,
): ProtectionMarketSnapshot {
  if (onchain.status !== 1) {
    throw new MarketUnavailable(
      "MARKET_NOT_TRADING",
      "The selected Event Contract is no longer Trading onchain.",
    );
  }

  const downAsks = downBook.asks
    .map(([price, amount]) => ({
      priceMicros: toMicros(price),
      sharesMicros: toMicros(amount),
    }))
    .filter((level) => level.priceMicros > 0n && level.sharesMicros > 0n);

  const best = downAsks[0];
  if (!best) {
    throw new MarketUnavailable(
      "EMPTY_DOWN_BOOK",
      "The selected Event Contract has no visible DOWN liquidity.",
    );
  }

  return {
    ...market,
    direction: "DOWN",
    onchainStatus: "Trading",
    pool: onchain.pool,
    outcomeToken: onchain.outcomeToken,
    yesId: onchain.yesId.toString(),
    noId: onchain.noId.toString(),
    settlementFeeBps,
    bestDownAskMicros: best.priceMicros,
    downAsks,
  };
}

function toCandidate(market: UnifiedMarket): ProtectionMarketCandidate | null {
  if (market.type !== "binary" || market.info.marketType !== "BINARY") {
    return null;
  }

  const noSymbol = market.outcomes?.find((outcome) => outcome.index === 1)?.symbol;
  const intervalSec = Number(market.info.intervalSec ?? 0);
  const venueId = market.info.venueId;
  const operatorId = market.info.operatorId;
  if (!noSymbol || !intervalSec || !venueId || operatorId == null) return null;

  return {
    marketId: market.info.marketId,
    symbol: market.symbol,
    question: market.info.question,
    asset: market.info.asset,
    intervalSec,
    tradingStart: Number(market.info.tradingStart),
    expiry: Number(market.info.expiry),
    venueId: venueId as Hex,
    operatorId,
    noSymbol,
    active: market.active,
    quoteDecimals: market.info.quoteDecimals,
  };
}

function scopeDreamDexVenue(
  candidates: readonly ProtectionMarketCandidate[],
): ProtectionMarketCandidate[] {
  const configured = process.env.DREAMDEX_VENUE_ID?.toLowerCase();
  if (configured) {
    return candidates.filter(
      (market) => market.venueId.toLowerCase() === configured,
    );
  }

  const live = candidates.filter((market) => market.active);
  const venues = [...new Set(live.map((market) => market.venueId.toLowerCase()))];
  if (venues.length <= 1) return live;

  const botKitVenue = BOT_KIT_TESTNET_VENUE_ID.toLowerCase();
  if (venues.includes(botKitVenue)) {
    return live.filter(
      (market) => market.venueId.toLowerCase() === botKitVenue,
    );
  }

  throw new MarketUnavailable(
    "AMBIGUOUS_VENUE",
    "Live Event Contracts span multiple venues. Configure DREAMDEX_VENUE_ID explicitly.",
  );
}

export async function discoverProtectionMarket(
  intervalSec: 900 | 3600,
): Promise<ProtectionMarketSnapshot> {
  const exchange = new SomniaMarkets({
    indexerUrl: SHANNON_INDEXER_URL,
    chain: somniaShannon,
    wsRpcUrl: SHANNON_WS_RPC_URL,
    addresses: SHANNON_MARKETS_ADDRESSES,
  });

  try {
    const loaded = Object.values(await exchange.loadMarkets(true));
    const candidates = loaded
      .map(toCandidate)
      .filter((market): market is ProtectionMarketCandidate => market !== null);
    const market = selectProtectionMarket(
      scopeDreamDexVenue(candidates),
      intervalSec,
    );
    const [onchain, downBook, fees] = await Promise.all([
      exchange.client.getMarketOnchain(market.marketId),
      exchange.fetchOrderBook(market.noSymbol, 20),
      exchange.client.getMarketFees(market.marketId),
    ]);

    return buildProtectionMarketSnapshot(
      market,
      onchain as MarketOnchain,
      downBook,
      Number(fees?.settlementFeeBps ?? 0),
    );
  } finally {
    await closeExchange(exchange);
  }
}
