const MICROS = 1_000_000n;

export function parseUsdMicros(value: string): bigint {
  const normalized = value.trim();
  if (!/^\d+(?:\.\d{1,6})?$/.test(normalized)) {
    throw new Error("Enter a positive USD amount with at most six decimal places.");
  }
  const [whole = "0", fraction = ""] = normalized.split(".");
  const result = BigInt(whole) * MICROS + BigInt(fraction.padEnd(6, "0"));
  if (result <= 0n) throw new Error("USD amount must be greater than zero.");
  return result;
}

export function formatUsdMicros(value: bigint): string {
  const whole = value / MICROS;
  const cents = ((value % MICROS) / 10_000n).toString().padStart(2, "0");
  return `$${whole.toLocaleString("en-US")}.${cents}`;
}

export function formatProbabilityMicros(value: bigint): string {
  return `${(Number(value) / 10_000).toFixed(1)}%`;
}

export function shortHash(value: string): string {
  return `${value.slice(0, 8)}…${value.slice(-6)}`;
}
