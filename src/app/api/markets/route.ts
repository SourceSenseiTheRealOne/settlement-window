import { NextResponse } from "next/server";
import { serializeProtectionMarket } from "@/lib/dreamdex/market-dto";
import {
  discoverProtectionMarket,
  MarketUnavailable,
} from "@/lib/dreamdex/market-reader";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const intervalParam = new URL(request.url).searchParams.get("interval");
  const interval = Number(intervalParam);
  if (interval !== 900 && interval !== 3600) {
    return NextResponse.json(
      { error: "Choose a 15-minute or 1-hour settlement window." },
      { status: 400 },
    );
  }

  try {
    const market = await discoverProtectionMarket(interval);
    return NextResponse.json({ market: serializeProtectionMarket(market) });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "DreamDEX market discovery failed.";
    return NextResponse.json(
      {
        error: message,
        code: error instanceof MarketUnavailable ? error.code : "UPSTREAM_ERROR",
      },
      { status: 503 },
    );
  }
}
