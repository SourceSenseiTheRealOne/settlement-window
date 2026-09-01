import { NextResponse } from "next/server";
import type { Hex } from "viem";
import { readProtectionResolution } from "@/lib/dreamdex/resolution-reader";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ marketId: string }> },
) {
  const { marketId } = await context.params;
  if (!/^0x[0-9a-fA-F]{64}$/.test(marketId)) {
    return NextResponse.json({ error: "Invalid Event Contract market id." }, { status: 400 });
  }

  try {
    const resolution = await readProtectionResolution(marketId as Hex);
    return NextResponse.json({ resolution });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Resolution read failed." },
      { status: 503 },
    );
  }
}
