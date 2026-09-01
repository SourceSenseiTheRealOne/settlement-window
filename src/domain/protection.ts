export const USD_SCALE = 1_000_000n;
const BPS_SCALE = 10_000n;

export type ProtectionRefusalCode =
  | "UNSUPPORTED_INTERVAL"
  | "INVALID_AMOUNT"
  | "OVER_PROTECTION"
  | "INSUFFICIENT_LIQUIDITY"
  | "BUDGET_EXCEEDED";

export class ProtectionRefusal extends Error {
  constructor(
    readonly code: ProtectionRefusalCode,
    message: string,
  ) {
    super(message);
    this.name = "ProtectionRefusal";
  }
}

export interface ProtectionRequest {
  exposureUsdMicros: bigint;
  desiredCompensationUsdMicros: bigint;
  maxCostUsdMicros: bigint;
  intervalSec: number;
  settlementFeeBps: number;
}

export interface BookAsk {
  /** DOWN/NO probability scaled by 1e6. */
  priceMicros: bigint;
  /** Available outcome shares scaled by 1e6. */
  sharesMicros: bigint;
}

export interface ProtectionFill {
  priceMicros: bigint;
  sharesMicros: bigint;
  costUsdMicros: bigint;
}

export interface ProtectionQuote {
  direction: "DOWN";
  intervalSec: 900 | 3600;
  filledSharesMicros: bigint;
  costUsdMicros: bigint;
  knownMaximumLossUsdMicros: bigint;
  maxPayoutUsdMicros: bigint;
  maxNetOffsetUsdMicros: bigint;
  averagePriceMicros: bigint;
  coverageBps: number;
  fills: ProtectionFill[];
}

const ceilDiv = (numerator: bigint, denominator: bigint): bigint =>
  (numerator + denominator - 1n) / denominator;

export function quoteProtection(
  request: ProtectionRequest,
  visibleDownAsks: readonly BookAsk[],
): ProtectionQuote {
  if (request.intervalSec !== 900 && request.intervalSec !== 3600) {
    throw new ProtectionRefusal(
      "UNSUPPORTED_INTERVAL",
      "Choose a 15-minute or 1-hour settlement window.",
    );
  }

  if (
    request.exposureUsdMicros <= 0n ||
    request.desiredCompensationUsdMicros <= 0n ||
    request.maxCostUsdMicros <= 0n ||
    !Number.isInteger(request.settlementFeeBps) ||
    request.settlementFeeBps < 0 ||
    request.settlementFeeBps >= Number(BPS_SCALE)
  ) {
    throw new ProtectionRefusal(
      "INVALID_AMOUNT",
      "Exposure, compensation, budget, and fee must be positive valid amounts.",
    );
  }

  if (request.desiredCompensationUsdMicros > request.exposureUsdMicros) {
    throw new ProtectionRefusal(
      "OVER_PROTECTION",
      "Requested compensation cannot exceed the external settlement exposure.",
    );
  }

  const payoutPerShareMicros =
    (USD_SCALE * (BPS_SCALE - BigInt(request.settlementFeeBps))) / BPS_SCALE;
  const requiredSharesMicros = ceilDiv(
    request.desiredCompensationUsdMicros * USD_SCALE,
    payoutPerShareMicros,
  );

  let remaining = requiredSharesMicros;
  let costUsdMicros = 0n;
  const fills: ProtectionFill[] = [];

  for (const ask of visibleDownAsks) {
    if (remaining === 0n) break;
    if (
      ask.priceMicros <= 0n ||
      ask.priceMicros >= USD_SCALE ||
      ask.sharesMicros <= 0n
    ) {
      continue;
    }

    const taken = ask.sharesMicros < remaining ? ask.sharesMicros : remaining;
    const levelCost = ceilDiv(ask.priceMicros * taken, USD_SCALE);
    fills.push({
      priceMicros: ask.priceMicros,
      sharesMicros: taken,
      costUsdMicros: levelCost,
    });
    costUsdMicros += levelCost;
    remaining -= taken;
  }

  if (remaining > 0n) {
    throw new ProtectionRefusal(
      "INSUFFICIENT_LIQUIDITY",
      "Visible DOWN liquidity cannot supply the requested compensation.",
    );
  }

  if (costUsdMicros > request.maxCostUsdMicros) {
    throw new ProtectionRefusal(
      "BUDGET_EXCEEDED",
      "This protection costs more than the configured maximum.",
    );
  }

  const maxPayoutUsdMicros =
    (requiredSharesMicros * payoutPerShareMicros) / USD_SCALE;
  const maxNetOffsetUsdMicros =
    maxPayoutUsdMicros > costUsdMicros
      ? maxPayoutUsdMicros - costUsdMicros
      : 0n;

  return {
    direction: "DOWN",
    intervalSec: request.intervalSec,
    filledSharesMicros: requiredSharesMicros,
    costUsdMicros,
    knownMaximumLossUsdMicros: costUsdMicros,
    maxPayoutUsdMicros,
    maxNetOffsetUsdMicros,
    averagePriceMicros: ceilDiv(
      costUsdMicros * USD_SCALE,
      requiredSharesMicros,
    ),
    coverageBps: Number(
      (maxPayoutUsdMicros * BPS_SCALE) / request.exposureUsdMicros,
    ),
    fills,
  };
}
