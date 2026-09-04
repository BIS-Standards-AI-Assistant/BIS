import { NextResponse } from "next/server";
import { getSTTProvider } from "@/lib/stt/stt-provider";

export async function GET(): Promise<NextResponse> {
  const provider = getSTTProvider();
  const isAvailable = await provider.isAvailable();

  return NextResponse.json({
    status: isAvailable ? "ok" : "unavailable",
    provider: provider.name,
    available: isAvailable,
  });
}
