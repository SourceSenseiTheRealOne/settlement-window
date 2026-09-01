import type { SomniaMarkets } from "@somnia-chain/markets-sdk";

/** Close SDK resources without allowing a retained WebSocket to hang a CLI or request forever. */
export async function closeExchange(
  exchange: SomniaMarkets,
  timeoutMs = 2_000,
): Promise<void> {
  await Promise.race([
    Promise.resolve(exchange.close()).catch(() => undefined),
    new Promise<void>((resolve) => setTimeout(resolve, timeoutMs)),
  ]);
}
