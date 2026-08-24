import { NextResponse } from "next/server";
import { clearSession, requireSameOrigin } from "@/lib/auth";
export async function POST(request: Request) {
  requireSameOrigin(request);
  await clearSession();
  return NextResponse.json({ ok: true });
}
