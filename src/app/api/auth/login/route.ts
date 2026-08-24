import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { createSession, requireSameOrigin, verifyPasscode } from "@/lib/auth";
import { passcodeSchema } from "@/lib/validation";
import { apiError } from "@/lib/api";
import { createHash } from "node:crypto";
import { getSupabase } from "@/lib/supabase";

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const ip =
      (await headers()).get("x-forwarded-for")?.split(",")[0] || "local";
    const identifier = createHash("sha256")
      .update(`${ip}:${process.env.SESSION_SECRET}`)
      .digest("hex");
    const db = getSupabase();
    const now = Date.now();
    const { data: record } = await db
      .from("auth_rate_limits")
      .select("attempt_count,window_started_at,blocked_until")
      .eq("identifier_hash", identifier)
      .maybeSingle();
    if (record?.blocked_until && new Date(record.blocked_until).getTime() > now)
      return NextResponse.json(
        { error: "Too many attempts. Try again in 15 minutes." },
        { status: 429 },
      );
    const { passcode } = passcodeSchema.parse(await request.json());
    if (!(await verifyPasscode(passcode))) {
      const inWindow =
        record &&
        now - new Date(record.window_started_at).getTime() < 15 * 60_000;
      const count = inWindow ? record.attempt_count + 1 : 1;
      await db.from("auth_rate_limits").upsert({
        identifier_hash: identifier,
        attempt_count: count,
        window_started_at: inWindow
          ? record.window_started_at
          : new Date().toISOString(),
        blocked_until:
          count >= 5 ? new Date(now + 15 * 60_000).toISOString() : null,
      });
      return NextResponse.json(
        { error: "Incorrect passcode." },
        { status: 401 },
      );
    }
    await db
      .from("auth_rate_limits")
      .delete()
      .eq("identifier_hash", identifier);
    await createSession();
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
