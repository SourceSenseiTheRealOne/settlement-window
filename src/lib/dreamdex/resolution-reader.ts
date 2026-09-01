import { SomniaMarkets } from "@somnia-chain/markets-sdk";
import type { Hash, Hex } from "viem";
import {
  SHANNON_INDEXER_URL,
  SHANNON_MARKETS_ADDRESSES,
  SHANNON_WS_RPC_URL,
  somniaShannon,
} from "./config";
import { closeExchange } from "./exchange-lifecycle";

const STATUS_LABELS: Record<number, string> = {
  0: "Listed",
  1: "Trading",
  2: "Locked",
  3: "Settling",
  4: "Resolved",
  5: "Voided",
};

interface CanonicalResolutionState {
  status: number;
  isResolved: boolean;
  isVoided: boolean;
  winningOutcome: number;
}

interface ResolutionEvidence {
  events: { kind: string; txHash: string; timestamp: string }[];
  openingAnswer: { numericValue: string | null; txHash: string | null } | null;
  closingAnswer: { numericValue: string | null; txHash: string | null } | null;
}

export interface ProtectionResolution {
  marketId: Hex;
  status: string;
  isResolved: boolean;
  isVoided: boolean;
  winningOutcome: 0 | 1 | null;
  openingPriceRaw: string | null;
  closingPriceRaw: string | null;
  oracleTransactionHash: Hash | null;
  resolutionTransactionHash: Hash | null;
}

export function summarizeResolution(
  marketId: Hex,
  onchain: CanonicalResolutionState,
  evidence: ResolutionEvidence,
): ProtectionResolution {
  const latestResolutionEvent = evidence.events.at(-1);
  const terminal = onchain.isResolved || onchain.isVoided;
  return {
    marketId,
    status: STATUS_LABELS[onchain.status] ?? `Status ${onchain.status}`,
    isResolved: onchain.isResolved,
    isVoided: onchain.isVoided,
    winningOutcome:
      terminal && !onchain.isVoided
        ? (onchain.winningOutcome === 1 ? 1 : 0)
        : null,
    openingPriceRaw: evidence.openingAnswer?.numericValue ?? null,
    closingPriceRaw: evidence.closingAnswer?.numericValue ?? null,
    oracleTransactionHash: (evidence.closingAnswer?.txHash as Hash | null) ?? null,
    resolutionTransactionHash:
      (latestResolutionEvent?.txHash as Hash | undefined) ?? null,
  };
}

export async function readProtectionResolution(
  marketId: Hex,
): Promise<ProtectionResolution> {
  const exchange = new SomniaMarkets({
    indexerUrl: SHANNON_INDEXER_URL,
    chain: somniaShannon,
    wsRpcUrl: SHANNON_WS_RPC_URL,
    addresses: SHANNON_MARKETS_ADDRESSES,
  });

  try {
    const [onchain, evidence] = await Promise.all([
      exchange.client.getMarketOnchain(marketId),
      exchange.client.getMarketResolution(marketId),
    ]);
    return summarizeResolution(marketId, onchain, evidence);
  } finally {
    await closeExchange(exchange);
  }
}
